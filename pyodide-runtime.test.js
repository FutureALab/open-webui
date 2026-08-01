import { existsSync, readFileSync } from 'node:fs';

import { describe, expect, it } from 'vitest';

const read = (path) => readFileSync(new URL(path, import.meta.url), 'utf8');

describe('Pyodide runtime packaging', () => {
	it('uses an IDM-safe standard library URL in both browser runtimes', () => {
		const sandboxHost = read('./src/lib/pyodide/pyodideSandboxHost.ts');
		const worker = read('./src/lib/workers/pyodide.worker.ts');
		const prepareScript = read('./scripts/prepare-pyodide.js');

		expect(sandboxHost).toContain("'python_stdlib.data'");
		expect(worker).toContain("stdLibURL: '/pyodide/python_stdlib.data'");
		expect(prepareScript).toContain("'static/pyodide/python_stdlib.data'");
		expect(prepareScript).toContain("'node_modules/pyodide/package.json'");
	});

	it('does not ship the retired changelog announcement modal', () => {
		expect(existsSync(new URL('./src/lib/components/ChangelogModal.svelte', import.meta.url))).toBe(
			false
		);
	});
});
