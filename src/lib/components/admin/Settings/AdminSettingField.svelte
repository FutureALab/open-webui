<script lang="ts">
	export let label = '';
	export let description = '';
	export let forId = '';
	export let className = '';
</script>

<div class={className}>
	{#if label}
		<label class="text-xs font-medium text-gray-700 dark:text-gray-300" for={forId || undefined}>
			{label}
		</label>
	{/if}

	<div class={label ? 'mt-1' : ''}>
		<slot />
	</div>

	{#if description}
		<p class="mt-0.5 text-[0.6875rem] text-gray-400 dark:text-gray-600">
			{description}
		</p>
	{/if}
</div>
