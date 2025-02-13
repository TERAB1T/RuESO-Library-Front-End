<script setup lang="ts">
import { RouterLink, useRoute } from 'vue-router';
import { reactive, onMounted, watch } from 'vue';
import axios from 'axios';
import { prepareURL } from '@/utils';

interface Book {
    id: number;
    titleRu: string;
}

const route = useRoute();

const state = reactive({
    books: [] as Book[],
    currentCategoryId: route.params.categoryId ?? -1,
    isLoading: true
});

const fetchBooks = async () => {
    state.isLoading = true;
    try {
        const queryParams = state.currentCategoryId !== -1 ? `?catId=${state.currentCategoryId}` : '';
        const response = await axios.get(prepareURL(`/api/books${queryParams}`));
        state.books = response.data;
    } catch (error) {
        console.error('Error fetching books data:', error);
        state.books = [];
    } finally {
        state.isLoading = false;
    }
};

watch(
    () => route.params.categoryId,
    (newCategoryId) => {
        state.currentCategoryId = newCategoryId ?? -1;
        fetchBooks();
    },
    { immediate: true }
);

if (import.meta.env.SSR)
	await fetchBooks();

</script>

<template>
    <div class="list-group list-group-flush">
        <RouterLink v-for="book in state.books" :key="book.id" class="list-group-item list-group-item-action" :to="`/library/${book.id}`">
            {{ book.titleRu }}
        </RouterLink>
    </div>
</template>
