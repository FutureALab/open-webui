import { describe, expect, it, vi } from 'vitest';

vi.mock('$app/paths', () => ({ base: '/webui' }));
vi.mock('pdfjs-dist/legacy/build/pdf.mjs', () => ({ GlobalWorkerOptions: {} }));

import { loadPdfJs, pdfResourceOptions } from './pdf';

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

	it('supports text streams in Chrome 108 and releases cancelled readers', async () => {
		const descriptor = Object.getOwnPropertyDescriptor(
			ReadableStream.prototype,
			Symbol.asyncIterator
		)!;
		Object.defineProperty(ReadableStream.prototype, Symbol.asyncIterator, {
			value: undefined,
			configurable: true
		});
		try {
			await loadPdfJs();
			let cancelled = false;
			const stream = new ReadableStream({
				start(controller) {
					controller.enqueue('PDF text');
				},
				cancel() {
					cancelled = true;
				}
			});
			const values = [];
			for await (const value of stream) {
				values.push(value);
				break;
			}
			expect(values).toEqual(['PDF text']);
			expect(cancelled).toBe(true);
			expect(stream.locked).toBe(false);
		} finally {
			Object.defineProperty(ReadableStream.prototype, Symbol.asyncIterator, descriptor);
		}
	});
});
