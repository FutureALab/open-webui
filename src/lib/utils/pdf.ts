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
	const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs');
	pdfjs.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;
	return pdfjs;
};
