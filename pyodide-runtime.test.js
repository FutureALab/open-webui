import { existsSync, readFileSync } from 'node:fs';

import { describe, expect, it } from 'vitest';

const read = (path) => readFileSync(new URL(path, import.meta.url), 'utf8');

describe('Pyodide runtime packaging', () => {
	it('uses the standard Pyodide runtime with cross-platform cache preparation', () => {
		const sandboxHost = read('./src/lib/pyodide/pyodideSandboxHost.ts');
		const worker = read('./src/lib/workers/pyodide.worker.ts');
		const prepareScript = read('./scripts/prepare-pyodide.js');

		expect(sandboxHost).not.toContain('stdLibURL');
		expect(worker).not.toContain('stdLibURL');
		expect(prepareScript).toContain('initNetworkProxyFromEnv');
		expect(prepareScript).toContain('isCacheValid');
		expect(prepareScript).toContain("'node_modules/pyodide/package.json'");
		expect(prepareScript).toContain('Restore PyPI-only package entries');
	});

	it('does not ship the retired changelog announcement modal', () => {
		expect(existsSync(new URL('./src/lib/components/ChangelogModal.svelte', import.meta.url))).toBe(
			false
		);
	});
});
