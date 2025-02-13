<script setup lang="ts">
import { RouterLink, useRoute } from 'vue-router';
import { reactive, onMounted, watch } from 'vue';
import axios from 'axios';

const route = useRoute();

const state = reactive({
    categories: [],
    currentCategoryId: route.params.categoryId ?? -1,
    isLoading: true
});

watch(
    () => route.params.categoryId,
    (newCategoryId) => {
        state.currentCategoryId = newCategoryId ?? -1;
    },
    { immediate: true }
);

onMounted(async () => {
    try {
        const response = await axios.get('/api/categories');
        state.categories = response.data;
    } catch (error) {
        console.error('Error fetching categories data:', error);
    } finally {
        state.isLoading = false;
    }
});

</script>

<template>
    <div class="list-group list-group-flush">
        <RouterLink v-for="category in state.categories" :key="category.id" :class="{
                'active': state.currentCategoryId === category.id,
                'list-group-item': true,
                'list-group-item-action': true
            }" :to="state.currentCategoryId === category.id ? '/library' : `/library/category/${category.id}`">
            {{ category.title }}
        </RouterLink>
    </div>
</template>
