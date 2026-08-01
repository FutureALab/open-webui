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
		const sidebarStore = read('./src/lib/stores/index.ts');
		const chatItem = read('./src/lib/components/layout/Sidebar/ChatItem.svelte');

		expect(sidebar).toContain('font-medium text-gray-850 dark:text-white font-primary');
		expect(sidebar).toContain('text-[15px] leading-5 font-primary');
		expect(sidebar).toContain('class="flex flex-col font-primary"');
		expect(sidebar.match(/sidebar-new-chat-icon size-7 rounded-full/g)).toHaveLength(2);
		expect(sidebarStore).toContain('sidebarWidth = writable(260)');
		expect(chatItem).toContain('text-[15px] leading-5');
	});

	it('uses the official settings scale, emphasis and switch treatment', () => {
		const settingsModal = read('./src/lib/components/chat/SettingsModal.svelte');
		const userSettingRow = read('./src/lib/components/chat/Settings/UserSettingRow.svelte');
		const adminSettingRow = read('./src/lib/components/admin/Settings/AdminSettingRow.svelte');
		const switchComponent = read('./src/lib/components/common/Switch.svelte');

		expect(settingsModal).toContain('h-8 px-2.5 md:w-full');
		expect(settingsModal).toContain('rounded-lg text-[15px] leading-5 text-left');
		expect(settingsModal).toContain('settings-panel-typography');
		expect(settingsModal).toContain('h2.text-sm');
		expect(settingsModal).toContain('font-size: 1rem');
		expect(userSettingRow).toContain('text-[15px] font-medium leading-5 text-gray-700');
		expect(userSettingRow).toContain('text-[13px] leading-[18px]');
		expect(adminSettingRow).toContain('text-[15px] font-medium leading-5 text-gray-700');
		expect(adminSettingRow).toContain('text-[13px] leading-[18px]');
		expect(switchComponent).toContain("'bg-emerald-500 dark:bg-emerald-700'");
		expect(switchComponent).toContain('data-[state=checked]:translate-x-3');
	});

	it('uses the official account menu and landing-page type scale', () => {
		const dropdownMenu = read('./src/lib/components/common/DropdownMenu.svelte');
		const userMenu = read('./src/lib/components/layout/Sidebar/UserMenu.svelte');
		const placeholder = read('./src/lib/components/chat/Placeholder.svelte');
		const suggestions = read('./src/lib/components/chat/Suggestions.svelte');

		expect(userMenu).toContain('font-sans text-[15px]');
		expect(userMenu).toContain('compact={false}');
		expect(userMenu).not.toContain('px-3 text-sm leading-5');
		expect(dropdownMenu).toContain("'[&>button]:h-9!");
		expect(dropdownMenu).toContain('[&>a]:text-[15px]!');
		expect(userMenu).toContain('size-11 rounded-full object-cover');
		expect(userMenu).toContain('h-9 items-center gap-2.5');
		expect(placeholder).toContain('text-[1.75rem] leading-9');
		expect(placeholder).toContain('size-12 rounded-2xl');
		expect(suggestions).toContain('text-base font-medium');
	});
});
