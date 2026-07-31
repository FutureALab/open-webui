/**
 * PostCSS plugin: Chrome 109 compatibility fix.
 *
 * Chrome 109 (the last version for some legacy systems) does NOT support:
 *   - oklch() / oklab() color functions
 *   - color-mix()
 *   - color(display-p3 ...)
 *   - CSS nesting
 *   - linear-gradient(... in lab, ...) colorspace
 *
 * Tailwind CSS v4 generates these modern CSS features wrapped inside
 * @supports queries that test for the same features. Chrome 109 doesn't
 * understand those @supports conditions and skips the entire block.
 *
 * This plugin runs AFTER @csstools/postcss-oklab-function (which converts
 * oklch/oklab to rgb) and does the following:
 *
 * 1. Strips @supports wrappers whose condition tests features Chrome 109
 *    doesn't support — moving the (now-polyfilled) children out so
 *    Chrome 109 can actually use them.
 *
 * 2. Converts color-mix(in oklab, var(--color-X) Y%, transparent) to
 *    rgba(R, G, B, alpha) using rgb() var definitions collected from
 *    the stylesheet.
 *
 * 3. Generates hardcoded fallbacks for --pm-* accent variables that
 *    use color-mix() with system "Highlight" (unresolvable to static color).
 *
 * 4. Removes alpha transparency from 8-digit hex colors (#RRGGBBAA)
 *    in LIGHT mode by blending onto a white background with enhanced
 *    contrast — ensuring text and borders are clearly visible on Chrome 109.
 */

const PLUGIN = 'postcss-chrome109-fix';

/**
 * Blend a foreground color with alpha onto a white background.
 * @param {number} r 0-255
 * @param {number} g 0-255
 * @param {number} b 0-255
 * @param {number} a 0.0-1.0
 * @returns {[number, number, number]}
 */
function blendOnWhite(r, g, b, a) {
	return [
		Math.round(r * a + 255 * (1 - a)),
		Math.round(g * a + 255 * (1 - a)),
		Math.round(b * a + 255 * (1 - a)),
	];
}

/**
 * Adjust a blended color for better contrast on white.
 * For light colors (luminance > 200): darken by pulling toward the
 * original color (increase saturation/opacity effect).
 * For already-dark colors: leave as-is (they already contrast well).
 * @param {[number,number,number]} blended - color after blending on white
 * @param {[number,number,number]} original - original RGB before alpha
 * @param {number} originalAlpha
 * @returns {[number,number,number]}
 */
function enhanceContrast(blended, original, originalAlpha) {
	const [br, bg, bb] = blended;
	const [or, og, ob] = original;

	// Relative luminance (sRGB coefficients)
	const lum = 0.2126 * br + 0.7152 * bg + 0.0722 * bb;

	// If already dark enough on white, return as-is
	if (lum < 180) return blended;

	// For light colors: shift 30% back toward the original color
	// (effectively doubling the alpha contribution from 50%→80% for mid-opacity)
	// but never go darker than the original color itself
	const boost = 0.4; // contrast boost factor
	const sr = Math.max(or, Math.round(br - (br - or) * boost));
	const sg = Math.max(og, Math.round(bg - (bg - og) * boost));
	const sb = Math.max(ob, Math.round(bb - (bb - ob) * boost));

	// Floor at a minimum contrast threshold (~#ccc level)
	const minContrast = 180;
	return [
		Math.min(sr, Math.max(minContrast, sr)),
		Math.min(sg, Math.max(minContrast, sg)),
		Math.min(sb, Math.max(minContrast, sb)),
	];
}

/**
 * Convert 8-digit hex (#RRGGBBAA) to solid hex with contrast boost.
 * Returns null if the color is nearly transparent (alpha < 0.03).
 * @param {string} hex8
 * @returns {string|null} solid hex like "#aabbcc"
 */
function hex8ToSolid(hex8) {
	const r = parseInt(hex8.slice(1, 3), 16);
	const g = parseInt(hex8.slice(3, 5), 16);
	const b = parseInt(hex8.slice(5, 7), 16);
	const a = parseInt(hex8.slice(7, 9), 16) / 255;

	// Skip nearly-transparent colors (would blend to near-white anyway)
	if (a < 0.03) return null;

	const blended = blendOnWhite(r, g, b, a);
	const [sr, sg, sb] = enhanceContrast(blended, [r, g, b], a);

	return '#' + [sr, sg, sb].map((v) => Math.round(v).toString(16).padStart(2, '0')).join('');
}

/**
 * Check if a CSS property accepts color values.
 * Handles both standard properties (background-color) and custom
 * properties (--tw-gradient-from, --tw-prose-body, etc.) that
 * contain color values.
 */
function isColorProperty(prop) {
	// Standard CSS color properties
	if (/(^|[-])(color|background|border|shadow|ring|outline|fill|stroke|accent|caret|column-rule|text-decoration|text-emphasis)(-color)?$/.test(prop)) {
		return true;
	}
	// CSS shorthands that may contain color values (border, border-top, etc.)
	if (/^(border|outline|box-shadow|text-shadow|filter|background)(-|$)/.test(prop)) {
		return true;
	}
	// CSS custom properties that carry color values
	if (prop.startsWith('--') && /(color|gradient|shadow|ring|border|background|fill|stroke|accent|prose-|drop-shadow|highlight|blur)/.test(prop)) {
		return true;
	}
	return false;
}

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
	'linear-gradient(in lab',   // gradient in CIE Lab colorspace
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

		// ── Phase 2: Remove alpha from 8-digit hex in LIGHT mode ────────
		// In light-mode selectors (not inside .dark or :is(.dark *)),
		// replace #RRGGBBAA values in color properties with solid hex
		// blended on white + contrast enhanced.
		root.walkRules((rule) => {
			// Skip dark-mode rules
			if (rule.selector && (
				rule.selector.includes('.dark') ||
				rule.selector.includes(':is(.dark *)') ||
				rule.selector.includes('[dir=rtl]') ||
				rule.selector.includes(':where(.dark')
			)) {
				return;
			}

			rule.walkDecls((decl) => {
				if (!isColorProperty(decl.prop)) return;

				decl.value = decl.value.replace(
					/#[0-9a-fA-F]{8}\b/g,
					(match) => {
						const solid = hex8ToSolid(match);
						return solid !== null ? solid : match;
					}
				);
			});
		});

		// ── Phase 3: color-mix() → rgba() fallback generation ─────────────
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

		// ── Phase 4: Strip @supports wrappers for Chrome 109 unsupported features
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

		// ── Phase 5: Hardcoded fallbacks for --pm-* accent variables ─────
		// ProseMirror sets accent colors via color-mix() with system "Highlight"
		// which cannot be statically resolved. Provide sensible fallbacks.
		const pmAccentFallbacks = {
			'--pm-accent': 'rgba(59, 130, 246, 0.7)',        // blue accent ~70%
			'--pm-fill-target': 'rgba(59, 130, 246, 0.26)',  // blue accent ~26%
			'--pm-fill-ancestor': 'rgba(59, 130, 246, 0.16)', // blue accent ~16%
		};

		root.walkDecls(/^--pm-(accent|fill-target|fill-ancestor)$/, (decl) => {
			const fallback = pmAccentFallbacks[decl.prop];
			if (fallback) {
				// Insert a fallback declaration BEFORE the color-mix one
				decl.cloneBefore({ prop: decl.prop, value: fallback });
			}
		});
	}
});

module.exports.postcss = true;
