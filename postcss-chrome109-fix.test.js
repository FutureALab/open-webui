import postcss from 'postcss';
import { describe, expect, it } from 'vitest';

import chromeCompatibility from './postcss-chrome109-fix.cjs';

describe('Chrome 108 color compatibility', () => {
	it('replaces variable color-mix declarations instead of leaving a broken override', async () => {
		const result = await postcss([chromeCompatibility()]).process(
			`:root { --color-gray-700: rgb(77, 77, 77); }
.button { background-color: color-mix(in oklab, var(--color-gray-700) 5%, transparent); }`,
			{ from: undefined }
		);

		expect(result.css).toContain('background-color: rgba(77, 77, 77, 0.05)');
		expect(result.css).not.toContain('color-mix');
	});

	it('keeps an existing static fallback when color-mix cannot be reduced', async () => {
		const result = await postcss([chromeCompatibility()]).process(
			`::placeholder {
  color: currentColor;
  color: color-mix(in oklab, currentColor 50%, transparent);
}`,
			{ from: undefined }
		);

		expect(result.css).toContain('color: currentColor');
		expect(result.css).not.toContain('color-mix');
	});

	it('handles Tailwind fallbacks emitted as adjacent rules and var fallbacks', async () => {
		const result = await postcss([chromeCompatibility()]).process(
			`:root { --color-black: #000; }
.overlay { background-color: #0000001a; }
.overlay { background-color: color-mix(in oklab, var(--color-black) 10%, transparent); }
.hint { color: currentColor; }
.hint { color: color-mix(in oklab, currentColor 50%, transparent); }
.accent { background: color-mix(in oklab, var(--missing, rgb(120, 212, 255)) 15%, transparent); }`,
			{ from: undefined }
		);

		expect(result.css).toContain('rgba(0, 0, 0, 0.1)');
		expect(result.css).toContain('rgba(120, 212, 255, 0.15)');
		expect(result.css).not.toContain('color-mix');
	});
});
