import { readFileSync } from 'node:fs';

import { describe, expect, it } from 'vitest';

const read = (path) => readFileSync(new URL(path, import.meta.url), 'utf8');

describe('official visual style parity', () => {
	it('keeps the official primary font and message hierarchy', () => {
		const appCss = read('./src/app.css');
		const messageInput = read('./src/lib/components/chat/MessageInput.svelte');

		expect(appCss).toContain("font-family: 'Archivo', 'Vazirmatn', sans-serif");
		expect(appCss).toContain('prose-headings:font-semibold');
		expect(messageInput).toContain('<div class="w-full font-primary">');
	});

	it('uses the official sidebar typography hierarchy', () => {
		const sidebar = read('./src/lib/components/layout/Sidebar.svelte');

		expect(sidebar).toContain('font-medium text-gray-850 dark:text-white font-primary');
		expect(sidebar).toContain("text-sm font-primary\">{$i18n.t('New Chat')}");
		expect(sidebar).toContain('class="flex flex-col font-primary"');
	});

	it('uses the official settings emphasis and switch treatment', () => {
		const settingRow = read('./src/lib/components/admin/Settings/AdminSettingRow.svelte');
		const switchComponent = read('./src/lib/components/common/Switch.svelte');

		expect(settingRow).toContain('text-xs font-medium text-gray-700');
		expect(switchComponent).toContain("'bg-emerald-500 dark:bg-emerald-700'");
		expect(switchComponent).toContain('data-[state=checked]:translate-x-3');
	});
});
