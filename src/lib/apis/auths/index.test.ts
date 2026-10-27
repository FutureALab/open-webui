import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('$lib/constants', () => ({ WEBUI_API_BASE_URL: '/api/v1' }));

import { addUser } from './index';

afterEach(() => vi.unstubAllGlobals());

describe('CSV user creation', () => {
	it('requests duplicate skipping and accepts a skipped row', async () => {
		const fetch = vi.fn().mockResolvedValue({ ok: true, json: async () => null });
		vi.stubGlobal('fetch', fetch);
		expect(
			await addUser('token', 'Existing', 'existing@example.com', 'password', 'user', null, true)
		).toBeNull();
		expect(fetch.mock.calls[0][0]).toBe('/api/v1/auths/add?skip_existing=true');
	});

	it('keeps duplicate errors for manual account creation', async () => {
		vi.stubGlobal(
			'fetch',
			vi.fn().mockResolvedValue({ ok: false, json: async () => ({ detail: 'Email taken' }) })
		);
		await expect(
			addUser('token', 'Existing', 'existing@example.com', 'password', 'user')
		).rejects.toBe('Email taken');
	});

	it('reports network failures instead of counting the row as an existing user', async () => {
		vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Failed to fetch')));
		await expect(
			addUser('token', 'New', 'new@example.com', 'password', 'user', null, true)
		).rejects.toThrow('Failed to fetch');
	});
});
