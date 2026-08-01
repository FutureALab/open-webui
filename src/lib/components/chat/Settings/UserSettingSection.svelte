<script lang="ts">
	export let title = '';
	export let first = false;
	export let className = '';
</script>

<section class="w-full {first ? '' : 'mt-4'} {className}">
	{#if title}
		<h3 class="mb-2.5 text-sm font-medium leading-5 text-gray-700 dark:text-gray-300">
			{title}
		</h3>
	{/if}

	<div class="flex flex-col gap-2.5">
		<slot />
	</div>
</section>
