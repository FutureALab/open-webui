export default {
	plugins: {
		'@tailwindcss/postcss': {},
		// Step 1: Polyfill CSS nesting → flat rules (Chrome 109 has partial support)
		'postcss-nesting': {},
		// Step 2: Convert oklch()/oklab() → rgb() (do NOT preserve originals)
		'@csstools/postcss-oklab-function': {
			preserve: false,
			subFeatures: {
				displayP3: false
			}
		},
		// Step 3: Convert color-mix() → rgba() fallback + strip @supports wrappers
		// that Chrome 109 can't understand (oklab, color-mix, display-p3)
		'./postcss-chrome109-fix.cjs': {},
		// Step 4: Handle any remaining color-mix() that wasn't covered above
		'@csstools/postcss-color-mix-function': {
			preserve: false
		}
	}
};
