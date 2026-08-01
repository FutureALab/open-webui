<script lang="ts">
	export let title = '';
	export let first = false;
	export let className = '';
</script>

<section class="w-full {first ? '' : 'mt-4'} {className}">
	{#if title}
		<h3 class="mb-2.5 text-base font-medium leading-6 text-gray-800 dark:text-gray-200">
			{title}
		</h3>
	{/if}

	<div class="flex flex-col gap-2.5">
		<slot />
	</div>
</section>
