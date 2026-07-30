export default {
	plugins: {
		'@tailwindcss/postcss': {},
		'postcss-nesting': {},
		'@csstools/postcss-oklab-function': {
			preserve: true
		},
		'./postcss-chrome109-fix.cjs': {},
		'@csstools/postcss-color-mix-function': {
			preserve: true
		}
	}
};
