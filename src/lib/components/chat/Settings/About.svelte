<script lang="ts">
	import { getOllamaVersion } from '$lib/apis/ollama';
	import { WEBUI_BUILD_HASH, WEBUI_VERSION } from '$lib/constants';
	import { WEBUI_NAME } from '$lib/stores';
	import { onMount, getContext } from 'svelte';

	import Tooltip from '$lib/components/common/Tooltip.svelte';
	import UserSettingSection from './UserSettingSection.svelte';

	const i18n = getContext('i18n');

	let ollamaVersion = '';

	onMount(async () => {
		ollamaVersion = await getOllamaVersion(localStorage.token).catch((error) => {
			return '';
		});
	});
</script>

<div id="tab-about" class="flex flex-col h-full justify-between text-sm">
	<h2 class="text-sm font-medium text-gray-900 dark:text-white mb-4">{$i18n.t('About')}</h2>

	<div class="flex-1 min-h-0 overflow-y-auto scrollbar-hover pr-1.5">
		<UserSettingSection title={`${$WEBUI_NAME} ${$i18n.t('Version')}`} first>
			<div class="text-xs text-gray-600 dark:text-gray-400">
				<Tooltip content={WEBUI_BUILD_HASH}>v{WEBUI_VERSION}</Tooltip>
			</div>
		</UserSettingSection>

		{#if ollamaVersion}
			<UserSettingSection title={$i18n.t('Ollama Version')}>
				<div class="text-xs text-gray-600 dark:text-gray-400">
					{ollamaVersion ?? 'N/A'}
				</div>
			</UserSettingSection>
		{/if}
	</div>
</div>
