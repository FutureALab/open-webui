<script lang="ts">
	import { v4 as uuidv4 } from 'uuid';

	export let label = '';
	export let description = '';
	export let className = '';
	export let labelClassName = '';

	const labelId = `admin-setting-${uuidv4()}`;
</script>

<div class="flex items-center justify-between gap-4 {className}">
	<div
		id={labelId}
		class="min-w-0 text-[15px] font-medium leading-5 text-gray-700 dark:text-gray-300 {labelClassName}"
	>
		<slot name="label">{label}</slot>
	</div>

	<div class="shrink-0">
		<slot {labelId} />
	</div>
</div>

{#if description}
	<p class="-mt-1 text-[13px] leading-[18px] text-gray-500 dark:text-gray-500">
		{description}
	</p>
{/if}
