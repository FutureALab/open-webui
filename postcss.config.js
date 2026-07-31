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
		// Step 3: Handle color-mix() forms that can be statically reduced
		'@csstools/postcss-color-mix-function': {
			preserve: false
		},
		// Step 4: Remove legacy-breaking color-mix() declarations and unwrap
		// unsupported @supports blocks after all other color transforms finish
		'./postcss-chrome109-fix.cjs': {}
	}
};
