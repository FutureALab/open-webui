import { describe, expect, it, vi } from 'vitest';

vi.mock('$app/paths', () => ({ base: '/webui' }));

import { pdfResourceOptions } from './pdf';

describe('offline PDF resources', () => {
	it('loads CJK maps, fonts, image decoders and colour profiles from the application base', () => {
		expect(pdfResourceOptions).toEqual({
			cMapUrl: '/webui/pdfjs/cmaps/',
			cMapPacked: true,
			standardFontDataUrl: '/webui/pdfjs/standard_fonts/',
			wasmUrl: '/webui/pdfjs/wasm/',
			iccUrl: '/webui/pdfjs/iccs/'
		});
	});
});
