<script lang="ts">
	export let label = '';
	export let description = '';
	export let forId = '';
	export let className = '';
</script>

<div class={className}>
	{#if label}
		<label
			class="text-[15px] font-medium leading-5 text-gray-700 dark:text-gray-300"
			for={forId || undefined}
		>
			{label}
		</label>
	{/if}

	<div class={label ? 'mt-1' : ''}>
		<slot />
	</div>

	{#if description}
		<p class="mt-1 text-[13px] leading-[18px] text-gray-500 dark:text-gray-500">
			{description}
		</p>
	{/if}
</div>
