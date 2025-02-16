<script setup lang="ts">
import { RouterLink, useRoute } from 'vue-router';
import { reactive, watch } from 'vue';
import axios from 'axios';
import { prepareURL } from '@/utils';

interface Category {
	id: number,
	titleEn: string,
	titleRu: string,
	icon: string,
	slug: string
}

const route = useRoute();

const state = reactive({
	categories: [] as Category[],
	currentCategoryId: route.params.categoryId ?? -1,
	isLoading: true
});

watch(
	() => Number(route.params.categoryId),
	(newCategoryId) => {
		state.currentCategoryId = newCategoryId ?? -1;
	},
	{ immediate: true }
);

try {
	const response = await axios.get(prepareURL('/api/library/categories'));
	state.categories = response.data;
} catch (error) {
	console.error('Error fetching categories data:', error);
} finally {
	state.isLoading = false;
}

</script>

<template>
	<div class="list-group list-group-flush">
		<RouterLink v-for="category in state.categories" :key="category.id" :class="{
			'active': state.currentCategoryId === category.id,
			'list-group-item': true,
			'list-group-item-action': true
		}" :to="state.currentCategoryId === category.id ? '/library' : `/library/category/${category.id}`">
			{{ category.titleRu }}
		</RouterLink>
	</div>
</template>
