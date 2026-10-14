import { readFileSync } from 'node:fs';

import { describe, expect, it } from 'vitest';

const read = (path) => readFileSync(new URL(path, import.meta.url), 'utf8');

describe('Pyodide runtime packaging', () => {
	it('packages a stable standard library asset alias for both browser runtimes', () => {
		const sandboxHost = read('./src/lib/pyodide/pyodideSandboxHost.ts');
		const worker = read('./src/lib/workers/pyodide.worker.ts');
		const prepareScript = read('./scripts/prepare-pyodide.js');

		expect(sandboxHost).toContain("'python_stdlib.data'");
		expect(worker).toContain("stdLibURL: '/pyodide/python_stdlib.data'");
		expect(prepareScript).toContain("'static/pyodide/python_stdlib.data'");
		expect(prepareScript).toContain('initNetworkProxyFromEnv');
		expect(prepareScript).toContain('isCacheValid');
		expect(prepareScript).toContain("'node_modules/pyodide/package.json'");
		expect(prepareScript).toContain('Restore PyPI-only package entries');
	});

	it('does not mount or open the retired changelog announcement modal', () => {
		const layout = read('./src/routes/(app)/+layout.svelte');
		expect(layout).not.toContain('ChangelogModal');
		expect(layout).not.toContain('showChangelog.set');
		for (const path of [
			'./src/lib/components/admin/Settings/General.svelte',
			'./src/lib/components/chat/Settings/About.svelte'
		]) {
			expect(read(path)).not.toContain('showChangelog');
		}
	});
});
