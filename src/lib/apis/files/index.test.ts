import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('$lib/constants', () => ({ WEBUI_API_BASE_URL: '/api/v1' }));

import { getFileBlobById, getFileContentById } from './index';

afterEach(() => vi.unstubAllGlobals());

describe('programmatic file previews', () => {
	it('requests preview bytes and restores the original MIME type for renderers', async () => {
		const fetch = vi.fn().mockResolvedValue(
			new Response('PDF bytes', {
				headers: {
					'Content-Type': 'application/octet-stream',
					'X-Original-Content-Type': 'application/pdf'
				}
			})
		);
		vi.stubGlobal('fetch', fetch);
		const blob = await getFileBlobById('token', 'file-id');
		expect(fetch.mock.calls[0][0]).toBe('/api/v1/files/file-id/content/preview.data');
		expect(blob.type).toBe('application/pdf');
		expect(await blob.text()).toBe('PDF bytes');
	});

	it('keeps explicit downloads on the original file response', async () => {
		const fetch = vi.fn().mockResolvedValue(new Response('download'));
		vi.stubGlobal('fetch', fetch);
		await getFileBlobById('token', 'file-id', { attachment: true });
		expect(fetch.mock.calls[0][0]).toBe('/api/v1/files/file-id/content?attachment=true');
	});

	it('uses the preview response for array buffer consumers', async () => {
		const fetch = vi.fn().mockResolvedValue(new Response('office bytes'));
		vi.stubGlobal('fetch', fetch);
		expect(new TextDecoder().decode(await getFileContentById('file-id'))).toBe('office bytes');
		expect(fetch.mock.calls[0][0]).toBe('/api/v1/files/file-id/content/preview.data');
	});
});
