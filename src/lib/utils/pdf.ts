import { base } from '$app/paths';
import pdfWorkerUrl from 'pdfjs-dist/legacy/build/pdf.worker.mjs?url';

export const pdfResourceOptions = {
	cMapUrl: `${base}/pdfjs/cmaps/`,
	cMapPacked: true,
	standardFontDataUrl: `${base}/pdfjs/standard_fonts/`,
	wasmUrl: `${base}/pdfjs/wasm/`,
	iccUrl: `${base}/pdfjs/iccs/`
};

export const loadPdfJs = async () => {
	// PDF.js text extraction iterates ReadableStream, which Chrome 108 does not implement.
	if (!Reflect.get(ReadableStream.prototype, Symbol.asyncIterator)) {
		Object.defineProperty(ReadableStream.prototype, Symbol.asyncIterator, {
			configurable: true,
			writable: true,
			value: async function* (this: ReadableStream<unknown>) {
				const reader = this.getReader();
				let completed = false;
				try {
					while (true) {
						const { done, value } = await reader.read();
						if (done) {
							completed = true;
							return;
						}
						yield value;
					}
				} finally {
					try {
						if (!completed) await reader.cancel();
					} finally {
						reader.releaseLock();
					}
				}
			}
		});
	}
	const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs');
	pdfjs.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;
	return pdfjs;
};
