<script setup lang="ts">
import BookCategories from '@/components/BookCategories.vue';
import BookList from '@/components/BookList.vue';
import { useHead } from '@unhead/vue';

useHead({
	title: `Библиотека ESO | RuESO`,
	meta: [
		{ name: 'description', content: 'Библиотека книг из The Elder Scrolls Online' }
	]
});
</script>

<template>
	<div class="container-xl">
		<div class="row">
			<div class="col-lg-8 order-2 order-lg-1">
				<div class="p-3">
					<BookList />
				</div>
			</div>

			<div class="col-lg-4 order-1 order-lg-2">
				<BookCategories />
			</div>
		</div>
	</div>

</template>
