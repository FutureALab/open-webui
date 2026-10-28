// Run with playwright-cli run-code against the isolated QA server on port 18080.
async (page) => {
	const origin = new URL(page.url()).origin;
	if (origin !== 'http://127.0.0.1:18080') throw new Error('Use the isolated QA server.');
	const check = (condition, message) => {
		if (!condition) throw new Error(message);
	};
	const prefix = `csv-check-${Date.now()}`;
	const password = 'CSV-Regression-20261028!';
	const token = await page.evaluate(() => localStorage.token);
	const headers = { authorization: `Bearer ${token}` };
	const request = async (path, data) => {
		const response = await page.request.post(`${origin}/api/v1${path}`, { headers, data });
		check(response.ok(), `POST ${path}: ${response.status()}`);
		return response.json();
	};
	const existing = await request('/auths/add', {
		name: 'Existing account',
		email: `${prefix}-existing@example.com`,
		password,
		role: 'user'
	});
	const retryEmail = `${prefix}-retry@example.com`;
	let retryAttempts = 0;
	const failFirstCreation = async (route) => {
		if (route.request().postDataJSON().email === retryEmail && ++retryAttempts === 1) {
			await route.fulfill({ status: 503, json: { detail: 'CSV regression: temporary failure' } });
		} else await route.continue();
	};
	await page.route('**/api/v1/auths/add?skip_existing=true', failFirstCreation);
	await page.goto(`${origin}/admin/users/overview`);
	await page.getByRole('button', { name: '添加用户', exact: true }).click();
	await page.getByRole('button', { name: '通过 CSV 文件导入', exact: true }).click();
	const emails = Array.from({ length: 12 }, (_, i) => `${prefix}-${i}@example.com`);
	const rows = [
		'Name,Email,Password,Role',
		`Existing,${existing.email.toUpperCase()},ignored,user`,
		`Failed first attempt,${retryEmail},${password},user`,
		`Retry,${retryEmail},${password},pending`,
		...emails.map((email, i) => `CSV ${i},${email},${password},pending`)
	];
	rows.splice(9, 0, rows[5]);
	await page.locator('#upload-user-csv-input').setInputFiles({
		name: 'users.csv',
		mimeType: 'text/csv',
		buffer: Buffer.from(rows.join('\r\n'))
	});
	await page.getByRole('button', { name: '保存', exact: true }).click();
	await page.getByText(/成功导入 .* 个用户。/, { exact: true }).waitFor();
	await page.unroute('**/api/v1/auths/add?skip_existing=true', failFirstCreation);
	check(
		retryAttempts === 2,
		'A failed first row must not suppress a later row with the same email.'
	);
	await page.getByText('成功导入 13 个用户。', { exact: true }).waitFor();
	await page.getByText('已跳过 2 个已有用户。', { exact: true }).waitFor();
	await page.waitForFunction(() => document.getElementById('upload-user-csv-input').value === '');
	await page.locator('#upload-user-csv-input').setInputFiles({
		name: 'users-again.csv',
		mimeType: 'text/csv',
		buffer: Buffer.from(rows.join('\r\n'))
	});
	await page.getByRole('button', { name: '保存', exact: true }).click();
	await page.getByText('已跳过 16 个已有用户。', { exact: true }).waitFor();
	const imported = [];
	for (const email of [existing.email, retryEmail, ...emails]) {
		const response = await page.request.post(`${origin}/api/v1/auths/signin`, {
			data: { email, password }
		});
		check(response.ok(), `Imported account cannot sign in: ${email}`);
		const user = await response.json();
		check(user.role === 'user', `Imported account is not enabled: ${email}`);
		const session = await page.request.get(`${origin}/api/v1/auths/`, {
			headers: { authorization: `Bearer ${user.token}` }
		});
		check(session.ok(), `Imported account cannot use its session: ${email}`);
		imported.push(user);
	}
	const group = await request('/groups/create', {
		name: prefix,
		description: 'CSV import regression'
	});
	await request(`/groups/id/${group.id}/users/add`, { user_ids: [existing.id] });
	await page.goto(`${origin}/admin/users/groups?id=${group.id}`);
	await page.getByRole('dialog').getByRole('button', { name: '用户', exact: true }).click();
	let groupRetryAttempts = 0;
	const failFirstMembership = async (route) => {
		if (
			route.request().postDataJSON().user_ids.includes(imported[1].id) &&
			++groupRetryAttempts === 1
		) {
			await route.fulfill({
				status: 503,
				json: { detail: 'CSV regression: temporary membership failure' }
			});
		} else await route.continue();
	};
	await page.route(`**/api/v1/groups/id/${group.id}/users/add`, failFirstMembership);
	let existingMemberRequests = 0;
	const membershipRequests = [];
	const recordMembership = (req) => {
		if (req.url().includes(`/groups/id/${group.id}/users/add`)) {
			const ids = req.postDataJSON().user_ids;
			if (ids.includes(existing.id)) existingMemberRequests++;
			membershipRequests.push(...ids);
		}
	};
	page.on('request', recordMembership);
	const groupRows = [
		'Name,Email',
		`Existing,${existing.email.toUpperCase()}`,
		`Missing,${prefix}-missing@example.com`,
		...imported.slice(1).map((user) => `${user.name},${user.email}`)
	];
	groupRows.splice(8, 0, groupRows[3]);
	await page
		.getByRole('dialog')
		.locator('input[type=file]')
		.setInputFiles({
			name: 'group.csv',
			mimeType: 'text/csv',
			buffer: Buffer.from(groupRows.join('\n'))
		});
	await page.waitForFunction(
		() => document.querySelector('[role=dialog] input[type=file]').value === ''
	);
	await page.unroute(`**/api/v1/groups/id/${group.id}/users/add`, failFirstMembership);
	page.off('request', recordMembership);
	check(
		groupRetryAttempts === 2,
		'A failed membership must not suppress a later row with the same user.'
	);
	check(existingMemberRequests === 0, 'Already joined members must be skipped before adding.');
	check(
		membershipRequests.length === 14,
		'Group import must continue after the failed membership.'
	);
	await page.getByText('成功导入 13 个用户。', { exact: true }).waitFor();
	await page.getByText('已跳过 1 个已有用户。', { exact: true }).waitFor();
	const response = await page.request.get(`${origin}/api/v1/groups/id/${group.id}`, { headers });
	check(
		(await response.json()).member_count === 14,
		'Users after duplicates or missing rows were lost.'
	);
	await page.getByRole('dialog').locator('input[type=file]:enabled').waitFor({ state: 'attached' });
	await page
		.getByRole('dialog')
		.locator('input[type=file]')
		.setInputFiles({
			name: 'repeat.csv',
			mimeType: 'text/csv',
			buffer: Buffer.from(groupRows.join('\n'))
		});
	await page.getByText('已跳过 15 个已有用户。', { exact: true }).waitFor();
	return {
		created: 13,
		skipped: 2,
		authenticated: imported.length,
		groupMembers: 14,
		repeatSkipped: 15
	};
};
