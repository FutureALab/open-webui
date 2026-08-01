<script lang="ts">
	export let label = '';
	export let description = '';
	export let className = '';
	export let labelClassName = '';
</script>

<div class="flex items-center justify-between gap-2.5 {className}">
	<div
		class="min-w-0 text-sm font-medium leading-5 text-gray-700 dark:text-gray-300 {labelClassName}"
	>
		<slot name="label">{label}</slot>
	</div>

	<div class="shrink-0">
		<slot />
	</div>
</div>

{#if description}
	<p class="-mt-1 text-xs leading-4 text-gray-500 dark:text-gray-500">
		{description}
	</p>
{/if}
