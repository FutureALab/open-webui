import { Marked } from 'marked';
import { describe, expect, it } from 'vitest';

import svgExtension from './svg-extension';

describe('SVG Markdown extension', () => {
	it('keeps a multiline SVG with blank lines in one renderable token', () => {
		const marked = new Marked(svgExtension());
		const tokens = marked.lexer(`Intro

<svg viewBox="0 0 10 10">
  <defs>
    <linearGradient id="fill"></linearGradient>
  </defs>

  <circle cx="5" cy="5" r="4" />
</svg>

Outro`);

		expect(tokens.map((token) => token.type)).toEqual([
			'paragraph',
			'space',
			'svgBlock',
			'paragraph'
		]);
		expect(tokens[2]).toMatchObject({
			type: 'svgBlock',
			text: expect.stringContaining('<circle cx="5" cy="5" r="4" />')
		});
	});
});
