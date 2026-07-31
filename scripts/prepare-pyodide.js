const packages = [
	'micropip',
	'packaging',
	'requests',
	'beautifulsoup4',
	'numpy',
	'pandas',
	'matplotlib',
	'scikit-learn',
	'scipy',
	'regex',
	'sympy',
	'tiktoken',
	'pytz',
	'black',
	'openai',
	'openpyxl'
];

// Pure-Python packages whose wheels must be downloaded from PyPI and saved into
// static/pyodide/ so that the browser can install them offline via micropip.
// Packages already provided by the Pyodide distribution (click, platformdirs,
// typing_extensions, etc.) do NOT need to be listed here.
const pypiPackages = ['black', 'pathspec', 'mypy_extensions', 'pytokens'];

import { loadPyodide } from 'pyodide';
import { setGlobalDispatcher, ProxyAgent } from 'undici';
import { writeFile, readFile, copyFile, readdir, rmdir, access } from 'fs/promises';

/**
 * Loading network proxy configurations from the environment variables.
 * And the proxy config with lowercase name has the highest priority to use.
 */
function initNetworkProxyFromEnv() {
	// we assume all subsequent requests in this script are HTTPS:
	// https://cdn.jsdelivr.net
	// https://pypi.org
	// https://files.pythonhosted.org
	const allProxy = process.env.all_proxy || process.env.ALL_PROXY;
	const httpsProxy = process.env.https_proxy || process.env.HTTPS_PROXY;
	const httpProxy = process.env.http_proxy || process.env.HTTP_PROXY;
	const preferedProxy = httpsProxy || allProxy || httpProxy;
	/**
	 * use only http(s) proxy because socks5 proxy is not supported currently:
	 * @see https://github.com/nodejs/undici/issues/2224
	 */
	if (!preferedProxy || !preferedProxy.startsWith('http')) return;
	let preferedProxyURL;
	try {
		preferedProxyURL = new URL(preferedProxy).toString();
	} catch {
		console.warn(`Invalid network proxy URL: "${preferedProxy}"`);
		return;
	}
	const dispatcher = new ProxyAgent({ uri: preferedProxyURL });
	setGlobalDispatcher(dispatcher);
	console.log(`Initialized network proxy "${preferedProxy}" from env`);
}

/**
 * Return true if static/pyodide/ is already populated with the same pyodide
 * version as the installed node_modules/pyodide.
 */
async function isCacheValid() {
	try {
		const installedPyodideJson = JSON.parse(await readFile('node_modules/pyodide/package.json'));
		const installedVersion = installedPyodideJson.version.replace('^', '');

		const staticPyodideJson = JSON.parse(await readFile('static/pyodide/package.json'));
		const staticVersion = staticPyodideJson.version.replace('^', '');

		if (installedVersion !== staticVersion) {
			console.log(`Pyodide version mismatch (static: ${staticVersion}, installed: ${installedVersion})`);
			return false;
		}

		// Also check that pyodide-lock.json exists (indicates packages were downloaded)
		await access('static/pyodide/pyodide-lock.json');
		console.log(`Pyodide cache is valid (version ${installedVersion}), skipping network download`);
		return true;
	} catch {
		return false;
	}
}

async function downloadPackages() {
	console.log('Setting up pyodide + micropip');

	let pyodide;
	try {
		pyodide = await loadPyodide({
			packageCacheDir: 'static/pyodide'
		});
	} catch (err) {
		console.error('Failed to load Pyodide:', err);
		return;
	}

	try {
		console.log('Loading micropip package');
		await pyodide.loadPackage('micropip');

		const micropip = pyodide.pyimport('micropip');
		console.log('Downloading Pyodide packages:', packages);

		try {
			for (const pkg of packages) {
				console.log(`Installing package: ${pkg}`);
				await micropip.install(pkg);
			}
		} catch (err) {
			console.error('Package installation failed:', err);
			return;
		}

		console.log('Pyodide packages downloaded, freezing into lock file');

		try {
			const lockFile = await micropip.freeze();
			await writeFile('static/pyodide/pyodide-lock.json', lockFile);
		} catch (err) {
			console.error('Failed to write lock file:', err);
		}
	} catch (err) {
		console.error('Failed to load or install micropip:', err);
	}
}

async function copyPyodide() {
	console.log('Copying Pyodide files into static directory');
	// Read the existing lock file first — copyPyodide() will overwrite it
	// with the node_modules/pyodide version, but we need to preserve any
	// PyPI-only package entries (black, pathspec, etc.) that were added
	// by a previous run of downloadPyPIWheels().
	let savedLockData = null;
	try {
		savedLockData = JSON.parse(await readFile('static/pyodide/pyodide-lock.json', 'utf-8'));
	} catch {}

	// Copy all files from node_modules/pyodide to static/pyodide
	for await (const entry of await readdir('node_modules/pyodide')) {
		await copyFile(`node_modules/pyodide/${entry}`, `static/pyodide/${entry}`);
	}

	// Restore PyPI-only package entries that the copy just overwrote
	if (savedLockData) {
		try {
			const freshLockData = JSON.parse(await readFile('static/pyodide/pyodide-lock.json', 'utf-8'));
			for (const pkg of pypiPackages) {
				const normalizedName = pkg.replace(/-/g, '_');
				if (savedLockData.packages[normalizedName] && !freshLockData.packages[normalizedName]) {
					freshLockData.packages[normalizedName] = savedLockData.packages[normalizedName];
				}
			}
			await writeFile('static/pyodide/pyodide-lock.json', JSON.stringify(freshLockData, null, 2));
		} catch (err) {
			console.warn('Failed to restore PyPI lock entries:', err?.message || err);
		}
	}
}

/**
 * Download pure-Python wheels from PyPI and save them into static/pyodide/.
 * Also injects entries into pyodide-lock.json so that micropip resolves these
 * packages from the local server instead of fetching them from the internet.
 *
 * Returns early if all pypiPackages are already present in pyodide-lock.json
 * and their wheel files exist on disk (avoiding network calls in Docker builds).
 */
async function downloadPyPIWheels() {
	const lockPath = 'static/pyodide/pyodide-lock.json';
	let lockData;
	try {
		lockData = JSON.parse(await readFile(lockPath, 'utf-8'));
	} catch {
		console.warn('Could not read pyodide-lock.json, skipping PyPI wheel download');
		return;
	}

	// Check if all PyPI packages are already cached — skip network if so
	let allCached = true;
	for (const pkg of pypiPackages) {
		const normalizedName = pkg.replace(/-/g, '_');
		const entry = lockData.packages[normalizedName];
		if (!entry) {
			allCached = false;
			break;
		}
		try {
			await access(`static/pyodide/${entry.file_name}`);
		} catch {
			allCached = false;
			break;
		}
	}

	if (allCached) {
		console.log('All PyPI packages already cached, skipping all PyPI network operations');
		return;
	}

	for (const pkg of pypiPackages) {
		console.log(`Fetching PyPI metadata for: ${pkg}`);
		const res = await fetch(`https://pypi.org/pypi/${pkg}/json`);
		if (!res.ok) {
			console.error(`Failed to fetch PyPI metadata for ${pkg}: ${res.status}`);
			continue;
		}
		const meta = await res.json();
		const version = meta.info.version;
		const files = meta.urls || [];
		// Find the pure-Python wheel (py3-none-any)
		const wheel = files.find(
			(f) => f.filename.endsWith('.whl') && f.filename.includes('py3-none-any')
		);
		if (!wheel) {
			console.warn(`No pure-Python wheel found for ${pkg}==${version}, skipping`);
			continue;
		}
		const dest = `static/pyodide/${wheel.filename}`;
		// Download wheel if not already present
		try {
			await access(dest);
			console.log(`  Already exists: ${wheel.filename}`);
		} catch {
			console.log(`  Downloading: ${wheel.filename}`);
			const wheelRes = await fetch(wheel.url);
			if (!wheelRes.ok) {
				console.error(`  Failed to download ${wheel.filename}: ${wheelRes.status}`);
				continue;
			}
			const buffer = Buffer.from(await wheelRes.arrayBuffer());
			await writeFile(dest, buffer);
			console.log(`  Saved: ${dest} (${buffer.length} bytes)`);
		}

		// Inject into pyodide-lock.json so micropip resolves locally
		const normalizedName = pkg.replace(/-/g, '_');
		if (!lockData.packages[normalizedName]) {
			lockData.packages[normalizedName] = {
				name: normalizedName,
				version: version,
				file_name: wheel.filename,
				install_dir: 'site',
				sha256: wheel.digests?.sha256 || '',
				package_type: 'package',
				imports: [normalizedName],
				depends: []
			};
			console.log(`  Added ${normalizedName}==${version} to pyodide-lock.json`);
		}
	}

	await writeFile(lockPath, JSON.stringify(lockData, null, 2));
	console.log('Updated pyodide-lock.json with PyPI packages');
}

initNetworkProxyFromEnv();

// ── Main ──────────────────────────────────────────────────────
// Strategy:
// 1. If static/pyodide/ matches the installed pyodide version AND has a full
//    lock file, skip ALL network operations — Docker builds with pre-seeded
//    static/pyodide/ in the build context will use this path.
// 2. Otherwise, if the version matches but lock is missing → re-download
//    packages (still needs network).
// 3. If version mismatches → delete cache, full download.
// 4. Finally, copy node_modules/pyodide runtime files → static/pyodide/
//    and download any missing PyPI wheels.
if (await isCacheValid()) {
	await copyPyodide();
	await downloadPyPIWheels();
} else {
	// Clear stale cache before downloading
	try {
		await rmdir('static/pyodide', { recursive: true });
	} catch (_) { /* directory may not exist */ }
	await downloadPackages();
	await copyPyodide();
	await downloadPyPIWheels();
}
