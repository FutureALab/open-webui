import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

const projectPath = (path) => new URL(path, import.meta.url);

const collectSvelteFiles = (directory) =>
	readdirSync(projectPath(directory), { withFileTypes: true }).flatMap((entry) => {
		const relativePath = join(directory, entry.name).replaceAll('\\', '/');

		if (entry.isDirectory()) {
			return collectSvelteFiles(relativePath);
		}

		return entry.name.endsWith('.svelte') ? [relativePath] : [];
	});

const readLiteralTranslationKeys = (source) => {
	const keys = [];
	const translationCall = /(?:\$?i18n)\.t\(\s*(['"`])/g;
	let match;

	while ((match = translationCall.exec(source))) {
		const quote = match[1];
		let rawValue = '';
		let escaped = false;
		let index = translationCall.lastIndex;

		for (; index < source.length; index += 1) {
			const character = source[index];

			if (escaped) {
				rawValue += `\\${character}`;
				escaped = false;
				continue;
			}

			if (character === '\\') {
				escaped = true;
				continue;
			}

			if (character === quote) {
				break;
			}

			rawValue += character;
		}

		translationCall.lastIndex = index + 1;

		if (quote === '`' && rawValue.includes('${')) {
			continue;
		}

		try {
			keys.push(Function(`"use strict"; return ${quote}${rawValue}${quote}`)());
		} catch {
			keys.push(rawValue);
		}
	}

	return keys;
};

describe('Simplified Chinese settings localization', () => {
	const settingsFiles = [
		...collectSvelteFiles('./src/lib/components/admin/Settings'),
		...collectSvelteFiles('./src/lib/components/chat/Settings'),
		'./src/lib/components/chat/SettingsModal.svelte'
	];
	const translations = JSON.parse(
		readFileSync(projectPath('./src/lib/i18n/locales/zh-CN/translation.json'), 'utf8')
	);

	it('has a non-empty translation for every literal settings key', () => {
		const keys = new Set(
			settingsFiles.flatMap((file) =>
				readLiteralTranslationKeys(readFileSync(projectPath(file), 'utf8'))
			)
		);
		const missing = [...keys]
			.filter((key) => typeof translations[key] !== 'string' || translations[key].trim() === '')
			.sort();

		expect(missing).toEqual([]);
	});

	it('localizes the visible integration and administrator labels', () => {
		expect(translations['External Tool Servers']).toBe('外部工具服务器');
		expect(translations['Open Terminal']).toBe('开放终端（Open Terminal）');
		expect(translations['External Knowledge Sources']).toBe('外部知识源');
		expect(translations['Subagents']).toBe('子智能体');
		expect(translations['Token']).toBe('令牌');
	});
});
