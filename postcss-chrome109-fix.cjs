/**
 * PostCSS plugin: Chrome 108/109 compatibility fix.
 *
 * Chrome 108/109 (the last versions for some legacy systems) do NOT support:
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
 * 1. Strips @supports wrappers whose condition tests features Chrome 108/109
 *    doesn't support — moving the (now-polyfilled) children out so
 *    legacy Chrome can actually use them.
 *
 * 2. Converts color-mix(in oklab, var(--color-X) Y%, transparent) to
 *    rgba(R, G, B, alpha) using rgb() var definitions collected from
 *    the stylesheet. Chrome 108 parses these declarations but computes
 *    them as invalid, which otherwise overrides an earlier RGB fallback.
 */

const PLUGIN = 'postcss-chrome109-fix';

/**
 * @param {string} value
 * @param {Record<string, [number,number,number]>} rgbVars
 * @returns {{result: string, replaced: boolean}}
 */
function resolveColorMix(value, rgbVars) {
	let replaced = false;
	let result = value.replace(
		/color-mix\(\s*in\s+oklab\s*,\s*var\(\s*(--[\w-]+)(?:\s*,\s*rgb\(\s*(\d+)\s*,?\s*(\d+)\s*,?\s*(\d+)\s*\)\s*)?\)\s+(\d+(?:\.\d+)?)%\s*,\s*transparent\s*\)/gi,
		(_match, varName, fallbackR, fallbackG, fallbackB, pct) => {
			const color =
				rgbVars[varName] ??
				(fallbackR ? [parseInt(fallbackR), parseInt(fallbackG), parseInt(fallbackB)] : undefined);
			if (color) {
				replaced = true;
				return `rgba(${color[0]}, ${color[1]}, ${color[2]}, ${parseFloat(pct) / 100})`;
			}
			return _match;
		}
	);

	// CSS system Highlight is not directly composable with transparency in
	// Chrome 108. Use the Windows accent blue as a stable legacy fallback for
	// transient editor drag indicators.
	result = result.replace(
		/color-mix\(\s*in\s+oklab\s*,\s*Highlight\s+(\d+(?:\.\d+)?)%\s*,\s*transparent\s*\)/gi,
		(_match, pct) => {
			replaced = true;
			return `rgba(0, 120, 215, ${parseFloat(pct) / 100})`;
		}
	);

	// Tailwind emits currentColor itself as the legacy fallback for placeholder
	// opacity. Keep that stable value when the generated rules are separated by
	// an @supports wrapper and cannot be paired structurally.
	result = result.replace(
		/color-mix\(\s*in\s+oklab\s*,\s*currentcolor\s+\d+(?:\.\d+)?%\s*,\s*transparent\s*\)/gi,
		() => {
			replaced = true;
			return 'currentColor';
		}
	);
	return { result, replaced };
}

/**
 * @param {import('postcss').Declaration} decl
 */
function hasStaticFallback(decl) {
	const previous = decl.prev();
	if (
		previous?.type === 'decl' &&
		previous.prop === decl.prop &&
		!previous.value.includes('color-mix')
	) {
		return true;
	}

	const rule = decl.parent;
	const previousRule = rule?.type === 'rule' ? rule.prev() : undefined;
	if (previousRule?.type !== 'rule' || previousRule.selector !== rule.selector) return false;

	return previousRule.nodes.some(
		(node) => node.type === 'decl' && node.prop === decl.prop && !node.value.includes('color-mix')
	);
}

/**
 * Chrome 108/109 do NOT support these CSS features.
 * Any @supports block testing for them will be skipped by legacy Chrome.
 */
const UNSUPPORTED_SUPPORTS = ['color-mix', 'oklab(', 'oklch(', 'color(display-p3'];

/**
 * Check if a @supports condition relies on features Chrome 109 can't handle.
 */
function isUnsupportedSupports(params) {
	return UNSUPPORTED_SUPPORTS.some((feat) => params.includes(feat));
}

module.exports = (_opts = {}) => ({
	postcssPlugin: PLUGIN,

	OnceExit(root) {
		// ── Phase 1: Collect --color-*: rgb(R, G, B) definitions ──────────
		const rgbVars = /** @type {Record<string, [number,number,number]>} */ ({});
		root.walkDecls(/^--color-[\w-]+$/, (decl) => {
			const value = decl.value.trim();
			const rgb = value.match(/^rgb\((\d+)\s*,?\s*(\d+)\s*,?\s*(\d+)\)$/);
			if (rgb) {
				rgbVars[decl.prop] = [parseInt(rgb[1]), parseInt(rgb[2]), parseInt(rgb[3])];
				return;
			}

			const hex = value.match(/^#([\da-f]{3}|[\da-f]{6})$/i)?.[1];
			if (!hex) return;
			const expanded = hex.length === 3 ? [...hex].map((digit) => digit.repeat(2)).join('') : hex;
			rgbVars[decl.prop] = [
				parseInt(expanded.slice(0, 2), 16),
				parseInt(expanded.slice(2, 4), 16),
				parseInt(expanded.slice(4, 6), 16)
			];
		});

		// ── Phase 2: color-mix() → stable legacy declarations ─────────────
		root.walkDecls((decl) => {
			if (!decl.value.includes('color-mix')) return;

			const { result, replaced } = resolveColorMix(decl.value, rgbVars);
			if (replaced && !result.includes('color-mix')) {
				decl.value = result;
				return;
			}

			// PostCSS may emit a static fallback immediately before a modern
			// declaration it cannot fully reduce (for example currentColor).
			// Keeping the modern declaration breaks Chrome 108, so retain only
			// the already-generated fallback.
			if (hasStaticFallback(decl)) {
				decl.remove();
			}
		});

		// ── Phase 3: Strip @supports wrappers for legacy unsupported features
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
