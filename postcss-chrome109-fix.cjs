/**
 * PostCSS plugin: Chrome 109 color-mix() fallback generator.
 *
 * Tailwind CSS v4 generates opacity-modified color utilities using
 * `color-mix(in oklab, var(--color-X) Y%, transparent)` wrapped inside
 * `@supports (color: color-mix(in lab, red, red))`.
 *
 * Chrome 109 doesn't support color-mix() at all, so it drops the entire
 * @supports block and all opacity-modified utilities (bg-gray-500/50,
 * border-gray-200/30, etc.) lose their color — elements go invisible.
 *
 * This plugin:
 * 1. Collects `--color-*: rgb(R, G, B)` variable definitions
 * 2. Finds `@supports (color: color-mix(…))` blocks
 * 3. Creates fallback rules with `rgba(R, G, B, alpha)` before each block
 */

const PLUGIN = 'postcss-chrome109-fix';

/**
 * @param {string} value
 * @param {Record<string, [number,number,number]>} rgbVars
 * @returns {{result: string, replaced: boolean}}
 */
function resolveColorMix(value, rgbVars) {
	let replaced = false;
	const result = value.replace(
		/color-mix\(in\s+oklab,\s*var\((--[\w-]+)\)\s+(\d+(?:\.\d+)?)%\s*,\s*transparent\)/g,
		(_match, varName, pct) => {
			const color = rgbVars[varName];
			if (color) {
				replaced = true;
				return `rgba(${color[0]}, ${color[1]}, ${color[2]}, ${parseFloat(pct) / 100})`;
			}
			return _match;
		}
	);
	return { result, replaced };
}

module.exports = (_opts = {}) => ({
	postcssPlugin: PLUGIN,

	Once(root) {
		const rgbVars = /** @type {Record<string, [number,number,number]>} */ ({});

		root.walkDecls(/^--color-[\w-]+$/, (decl) => {
			const m = decl.value.trim().match(/^rgb\((\d+)\s*,?\s*(\d+)\s*,?\s*(\d+)\)$/);
			if (m) rgbVars[decl.prop] = [parseInt(m[1]), parseInt(m[2]), parseInt(m[3])];
		});

		if (Object.keys(rgbVars).length === 0) return;

		root.walkAtRules('supports', (atRule) => {
			if (!atRule.params.includes('color-mix')) return;

			/** @type {import('postcss').Rule[]} */
			const fallbacks = [];
			atRule.walkRules((rule) => {
				const clone = rule.clone();
				let ruleHasColorMix = false;
				clone.walkDecls((decl) => {
					const { result, replaced } = resolveColorMix(decl.value, rgbVars);
					if (replaced) {
						decl.value = result;
						ruleHasColorMix = true;
					}
				});
				if (ruleHasColorMix) fallbacks.push(clone);
			});

			// Insert fallbacks BEFORE @supports; modern browsers override via cascade
			const parent = atRule.parent;
			for (const r of fallbacks) parent.insertBefore(atRule, r);
		});
	}
});

module.exports.postcss = true;
