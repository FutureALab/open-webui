function svgBlockStart(src: string) {
	const match = src.match(/^[ \t]*<svg\b/im);
	return match ? match.index! : -1;
}

function svgBlockTokenizer(src: string) {
	const match = /^[ \t]*(<svg\b[\s\S]*?<\/svg>)[ \t]*(?:\n|$)/i.exec(src);
	if (!match) return;

	return {
		type: 'svgBlock',
		raw: match[0],
		text: match[1]
	};
}

export default function svgExtension() {
	return {
		extensions: [
			{
				name: 'svgBlock',
				level: 'block' as const,
				start: svgBlockStart,
				tokenizer: svgBlockTokenizer
			}
		]
	};
}
