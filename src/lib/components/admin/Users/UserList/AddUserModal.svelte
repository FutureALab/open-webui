<script lang="ts">
	import { toast } from 'svelte-sonner';
	import { createEventDispatcher } from 'svelte';
	import { getContext } from 'svelte';
	import { addUser } from '$lib/apis/auths';

	import { WEBUI_BASE_URL } from '$lib/constants';

	import Spinner from '$lib/components/common/Spinner.svelte';
	import Modal from '$lib/components/common/Modal.svelte';
	import { generateInitialsImage } from '$lib/utils';
	import XMark from '$lib/components/icons/XMark.svelte';
	import SensitiveInput from '$lib/components/common/SensitiveInput.svelte';

	const i18n: any = getContext('i18n');
	const dispatch = createEventDispatcher();

	export let show = false;

	let loading = false;
	let tab = '';
	let inputFiles;

	let _user = {
		name: '',
		email: '',
		password: '',
		role: 'user'
	};

	$: if (show) {
		_user = {
			name: '',
			email: '',
			password: '',
			role: 'user'
		};
	}

	const submitHandler = async () => {
		if (loading) return;
		loading = true;
		try {
			if (tab === '') {
				await addUser(
					localStorage.token,
					_user.name,
					_user.email,
					_user.password,
					_user.role,
					generateInitialsImage(_user.name)
				);
				dispatch('save');
				show = false;
			} else {
				if (!inputFiles?.[0]) {
					toast.error($i18n.t('File not found.'));
					return;
				}
				const csv = await inputFiles[0].text();
				const validRows: { idx: number; columns: string[] }[] = [];
				const seenEmails = new Set<string>();
				let skippedCount = 0;
				for (const [idx, row] of csv.split(/\r?\n/).entries()) {
					const columns = row.split(',').map((col) => col.trim());
					if (idx === 0 || (columns.length === 1 && columns[0] === '')) continue;
					if (
						columns.length === 4 &&
						['admin', 'user', 'pending'].includes(columns[3].toLowerCase())
					) {
						const email = columns[1].toLowerCase();
						if (seenEmails.has(email)) {
							skippedCount++;
							continue;
						}
						seenEmails.add(email);
						validRows.push({ idx, columns });
					} else {
						toast.error($i18n.t('Row {{row}}: invalid format.', { row: idx + 1 }));
					}
				}

				let userCount = 0;
				const BATCH_SIZE = 10;
				for (let i = 0; i < validRows.length; i += BATCH_SIZE) {
					const batch = validRows.slice(i, i + BATCH_SIZE);
					const results = await Promise.allSettled(
						batch.map(({ columns }) =>
							addUser(
								localStorage.token,
								columns[0],
								columns[1],
								columns[2],
								columns[3].toLowerCase() === 'admin' ? 'admin' : 'user',
								generateInitialsImage(columns[0]),
								true
							)
						)
					);
					for (const [idx, result] of results.entries()) {
						if (result.status === 'rejected') {
							toast.error(
								$i18n.t('Row {{row}}: {{error}}', {
									row: batch[idx].idx + 1,
									error: String(result.reason)
								})
							);
						} else if (result.value) {
							userCount++;
						} else {
							skippedCount++;
						}
					}
				}
				if (userCount > 0) {
					toast.success($i18n.t('Successfully imported {{userCount}} users.', { userCount }));
					dispatch('save');
				}
				if (skippedCount > 0) {
					toast.info($i18n.t('Skipped {{count}} existing users.', { count: skippedCount }));
				}
				inputFiles = null;
				const input = document.getElementById('upload-user-csv-input') as HTMLInputElement | null;
				if (input) input.value = '';
			}
		} catch (error) {
			toast.error(String(error));
		} finally {
			loading = false;
		}
	};
</script>

<Modal size="sm" bind:show>
	<div>
		<div class=" flex justify-between dark:text-gray-300 px-4 pt-3 pb-1">
			<div class=" text-sm font-medium self-center">{$i18n.t('Add User')}</div>
			<button
				class="self-center rounded-lg p-1 text-gray-500 transition hover:bg-gray-50 hover:text-gray-700 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-gray-200"
				aria-label={$i18n.t('Close')}
				on:click={() => {
					show = false;
				}}
			>
				<XMark className={'size-4'} />
			</button>
		</div>

		<div class="flex flex-col md:flex-row w-full px-4 pb-3 md:space-x-4 dark:text-gray-200">
			<div class=" flex flex-col w-full sm:flex-row sm:justify-center sm:space-x-6">
				<form
					class="flex flex-col w-full"
					on:submit|preventDefault={() => {
						submitHandler();
					}}
				>
					<div
						class="flex -mt-2 mb-1.5 gap-1 scrollbar-none overflow-x-auto w-fit text-center text-sm font-medium rounded-full bg-transparent dark:text-gray-200"
					>
						<button
							class="min-w-fit p-1.5 {tab === ''
								? ''
								: 'text-gray-300 dark:text-gray-600 hover:text-gray-700 dark:hover:text-white'} transition"
							type="button"
							on:click={() => {
								tab = '';
							}}>{$i18n.t('Form')}</button
						>

						<button
							class="min-w-fit p-1.5 {tab === 'import'
								? ''
								: 'text-gray-300 dark:text-gray-600 hover:text-gray-700 dark:hover:text-white'} transition"
							type="button"
							on:click={() => {
								tab = 'import';
							}}>{$i18n.t('CSV Import')}</button
						>
					</div>

					<div class="px-1">
						{#if tab === ''}
							<div class="flex flex-col w-full mb-3">
								<div class=" mb-1 text-xs text-gray-500">{$i18n.t('Role')}</div>

								<div class="flex-1">
									<select
										class="w-full capitalize rounded-lg text-sm bg-transparent dark:disabled:text-gray-500 outline-hidden"
										bind:value={_user.role}
										aria-label={$i18n.t('Role')}
										placeholder={$i18n.t('Enter Your Role')}
										required
									>
										<option value="pending"> {$i18n.t('pending')} </option>
										<option value="user"> {$i18n.t('user')} </option>
										<option value="admin"> {$i18n.t('admin')} </option>
									</select>
								</div>
							</div>

							<div class="flex flex-col w-full mt-1">
								<div class=" mb-1 text-xs text-gray-500">{$i18n.t('Name')}</div>

								<div class="flex-1">
									<input
										class="w-full text-sm bg-transparent disabled:text-gray-500 dark:disabled:text-gray-500 outline-hidden"
										type="text"
										bind:value={_user.name}
										aria-label={$i18n.t('Name')}
										placeholder={$i18n.t('Enter Your Full Name')}
										autocomplete="off"
										required
									/>
								</div>
							</div>

							<hr class=" border-gray-100/30 dark:border-gray-850/30 my-2.5 w-full" />

							<div class="flex flex-col w-full">
								<div class=" mb-1 text-xs text-gray-500">{$i18n.t('Email')}</div>

								<div class="flex-1">
									<input
										class="w-full text-sm bg-transparent disabled:text-gray-500 dark:disabled:text-gray-500 outline-hidden"
										type="email"
										bind:value={_user.email}
										aria-label={$i18n.t('Email')}
										placeholder={$i18n.t('Enter Your Email')}
										required
									/>
								</div>
							</div>

							<div class="flex flex-col w-full mt-1">
								<div class=" mb-1 text-xs text-gray-500">{$i18n.t('Password')}</div>

								<div class="flex-1">
									<SensitiveInput
										class="w-full text-sm bg-transparent disabled:text-gray-500 dark:disabled:text-gray-500 outline-hidden"
										type="password"
										bind:value={_user.password}
										aria-label={$i18n.t('Password')}
										placeholder={$i18n.t('Enter Your Password')}
										autocomplete="off"
										required
									/>
								</div>
							</div>
						{:else if tab === 'import'}
							<div>
								<div class="mb-3 w-full">
									<input
										id="upload-user-csv-input"
										hidden
										bind:files={inputFiles}
										type="file"
										accept=".csv"
									/>

									<button
										class="w-full text-sm font-medium py-3 bg-transparent hover:bg-gray-100 border border-dashed dark:border-gray-850 dark:hover:bg-gray-850 text-center rounded-xl"
										type="button"
										on:click={() => {
											document.getElementById('upload-user-csv-input')?.click();
										}}
									>
										{#if inputFiles}
											{$i18n.t('{{COUNT}} document(s) selected.', { COUNT: inputFiles.length })}
										{:else}
											{$i18n.t('Click here to select a csv file.')}
										{/if}
									</button>
								</div>

								<p class="mb-2 text-xs text-gray-500">
									{$i18n.t(
										'Existing users are skipped. Imported pending users are activated as users.'
									)}
								</p>
								<div class=" text-xs text-gray-500">
									ⓘ {$i18n.t(
										'Ensure your CSV file includes 4 columns in this order: Name, Email, Password, Role.'
									)}
									<a
										class="underline dark:text-gray-200"
										href="{WEBUI_BASE_URL}/static/user-import.csv"
									>
										{$i18n.t('Click here to download user import template file.')}
									</a>
								</div>
							</div>
						{/if}
					</div>

					<div class="flex justify-end pt-3 text-sm font-medium">
						<button
							class="flex h-7 shrink-0 items-center justify-center gap-1.5 rounded-lg bg-gray-900 px-2.5 text-xs font-medium text-white transition hover:bg-black disabled:opacity-60 dark:bg-gray-100 dark:text-gray-900 dark:hover:bg-white disabled:cursor-not-allowed"
							type="submit"
							disabled={loading}
						>
							{$i18n.t('Save')}

							{#if loading}
								<span class="shrink-0">
									<Spinner className="size-3" />
								</span>
							{/if}
						</button>
					</div>
				</form>
			</div>
		</div>
	</div>
</Modal>

<style>
	input::-webkit-outer-spin-button,
	input::-webkit-inner-spin-button {
		/* display: none; <- Crashes Chrome on hover */
		-webkit-appearance: none;
		margin: 0; /* <-- Apparently some margin are still there even though it's hidden */
	}

	.tabs::-webkit-scrollbar {
		display: none; /* for Chrome, Safari and Opera */
	}

	.tabs {
		-ms-overflow-style: none; /* IE and Edge */
		scrollbar-width: none; /* Firefox */
	}

	input[type='number'] {
		-moz-appearance: textfield; /* Firefox */
	}
</style>
