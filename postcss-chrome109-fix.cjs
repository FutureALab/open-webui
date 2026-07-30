/**
 * PostCSS plugin: Chrome 109 compatibility fix.
 *
 * Chrome 109 (the last version for some legacy systems) does NOT support:
 *   - oklch() / oklab() color functions
 *   - color-mix()
 *   - color(display-p3 ...)
 *   - CSS nesting
 *
 * Tailwind CSS v4 generates these modern CSS features wrapped inside
 * @supports queries that test for the same features. Chrome 109 doesn't
 * understand those @supports conditions and skips the entire block.
 *
 * This plugin runs AFTER @csstools/postcss-oklab-function (which converts
 * oklch/oklab to rgb) and does two things:
 *
 * 1. Strips @supports wrappers whose condition tests features Chrome 109
 *    doesn't support — moving the (now-polyfilled) children out so
 *    Chrome 109 can actually use them.
 *
 * 2. Converts color-mix(in oklab, var(--color-X) Y%, transparent) to
 *    rgba(R, G, B, alpha) using rgb() var definitions collected from
 *    the stylesheet.
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

/**
 * Chrome 109 does NOT support these CSS features.
 * Any @supports block testing for them will be skipped by Chrome 109.
 */
const UNSUPPORTED_SUPPORTS = [
	'color-mix',
	'oklab(',
	'oklch(',
	'color(display-p3',
];

/**
 * Check if a @supports condition relies on features Chrome 109 can't handle.
 */
function isUnsupportedSupports(params) {
	return UNSUPPORTED_SUPPORTS.some((feat) => params.includes(feat));
}

module.exports = (_opts = {}) => ({
	postcssPlugin: PLUGIN,

	Once(root) {
		// ── Phase 1: Collect --color-*: rgb(R, G, B) definitions ──────────
		const rgbVars = /** @type {Record<string, [number,number,number]>} */ ({});
		root.walkDecls(/^--color-[\w-]+$/, (decl) => {
			const m = decl.value.trim().match(/^rgb\((\d+)\s*,?\s*(\d+)\s*,?\s*(\d+)\)$/);
			if (m) rgbVars[decl.prop] = [parseInt(m[1]), parseInt(m[2]), parseInt(m[3])];
		});

		// ── Phase 2: color-mix() → rgba() fallback generation ─────────────
		if (Object.keys(rgbVars).length > 0) {
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

				// Insert rgba() fallbacks BEFORE @supports;
				// modern browsers override via cascade through the @supports block
				const parent = atRule.parent;
				for (const r of fallbacks) parent.insertBefore(atRule, r);
			});
		}

		// ── Phase 3: Strip @supports wrappers for Chrome 109 unsupported features
		// This moves the (now-polyfilled) children out of the @supports block
		// so Chrome 109 can access them.
		root.walkAtRules('supports', (atRule) => {
			if (!isUnsupportedSupports(atRule.params)) return;

			const parent = atRule.parent;
			// Move all child nodes out of @supports into the parent
			while (atRule.nodes && atRule.nodes.length > 0) {
				const child = atRule.nodes[0];
				parent.insertBefore(atRule, child);
			}
			// Remove the now-empty @supports wrapper
			atRule.remove();
		});
	}
});

module.exports.postcss = true;
