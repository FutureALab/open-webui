<script lang="ts">
	import { v4 as uuidv4 } from 'uuid';

	export let label = '';
	export let description = '';
	export let className = '';
	export let labelClassName = '';

	const labelId = `user-setting-${uuidv4()}`;
</script>

<div class="group/setting-row flex items-center justify-between gap-2.5 {className}">
	<label
		id={labelId}
		for={`${labelId}-control`}
		class="min-w-0 text-[15px] font-medium leading-5 text-gray-700 group-has-[button[id$=-control]:enabled]/setting-row:cursor-pointer group-has-[button[id$=-control]:disabled]/setting-row:cursor-not-allowed transition-colors duration-150 group-hover/setting-row:text-gray-900 group-focus-within/setting-row:text-gray-900 dark:text-gray-300 dark:group-hover/setting-row:text-white dark:group-focus-within/setting-row:text-white {labelClassName}"
	>
		<slot name="label">{label}</slot>
	</label>

	<div class="min-w-0">
		<slot {labelId} />
	</div>
</div>

{#if description}
	<p class="-mt-1 text-[13px] leading-[18px] text-gray-500 dark:text-gray-500">
		{description}
	</p>
{/if}
