import { describe, expect, it } from 'vitest';
import i18next from 'i18next';
import translations from '$lib/i18n/locales/zh-CN/translation.json';
import { skillError } from './index';

const i18n = i18next.createInstance();
await i18n.init({
	lng: 'zh-CN',
	resources: { 'zh-CN': { translation: translations } },
	interpolation: { escapeValue: false }
});

describe('localized skill upload errors', () => {
	it('keeps the failing path and size limit in Chinese', () => {
		expect(skillError('File exceeds 10 MiB: .git/objects/pack/example.pack', i18n.t)).toBe(
			'文件超过 10 MiB：.git/objects/pack/example.pack'
		);
		expect(skillError('Duplicate file: references/guide.md', i18n.t)).toBe(
			'文件重复：references/guide.md'
		);
		expect(skillError('A skill may contain at most 1000 files', i18n.t)).toBe(
			'一个技能最多包含 1000 个文件'
		);
	});

	it('explains packaging and export conflicts in Chinese', () => {
		expect(skillError('Files outside skill directories', i18n.t)).toContain('技能目录以外');
		expect(skillError('Selected skills have duplicate export directory names', i18n.t)).toContain(
			'导出目录名称重复'
		);
		expect(skillError({ code: 'version_conflict' }, i18n.t)).toContain('当前草稿已保留');
	});

	it('preserves unrecognized errors and the default English message', () => {
		expect(skillError(new Error('network unavailable'), i18n.t)).toBe('network unavailable');
		expect(skillError('File exceeds 10 MiB: image.png')).toBe('File exceeds 10 MiB: image.png');
	});
});
