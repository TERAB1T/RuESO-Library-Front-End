<script setup lang="ts">
import { computed } from 'vue';

const props = defineProps({
	currentPage: { type: Number, default: 1 },
	totalPages: { type: Number, default: 1 },
	maxVisiblePages: { type: Number, default: 7 }
});

const emit = defineEmits<{
	changePage: [page: number]
}>();

const pages = computed(() => {
	const normalizedPage = Math.min(Math.max(1, props.currentPage), props.totalPages);

	if (props.totalPages <= props.maxVisiblePages) {
		return Array.from({ length: props.totalPages }, (_, i) => (i + 1).toString());
	}

	const sidePages = Math.floor((props.maxVisiblePages - 4) / 2);

	if (normalizedPage <= sidePages + 2) {
		return [
			...Array.from({ length: props.maxVisiblePages - 2 }, (_, i) => (i + 1).toString()),
			'...',
			props.totalPages.toString()
		];
	}

	if (normalizedPage >= props.totalPages - sidePages - 1) {
		return [
			'1',
			'...',
			...Array.from(
				{ length: props.maxVisiblePages - 2 },
				(_, i) => (props.totalPages - (props.maxVisiblePages - 3) + i).toString()
			)
		];
	}

	return [
		'1',
		'...',
		...Array.from(
			{ length: 2 * sidePages + 1 },
			(_, i) => (normalizedPage - sidePages + i).toString()
		),
		'...',
		props.totalPages.toString()
	];
});

const handlePageChange = (page: number) => {
	if (page !== props.currentPage && page >= 1 && page <= props.totalPages) {
		emit('changePage', page);
	}
};
</script>

<template>
	<nav v-if="totalPages > 1" class="mt-3" aria-label="Pagination">
		<ul class="pagination justify-content-center">
			<li v-for="(page, index) in pages" :key="`${page}-${index}`" class="page-item" :class="{ active: currentPage === Number(page) }">
				<button v-if="page !== '...'" :disabled="currentPage === Number(page)" class="page-link" :aria-label="`Страница ${page}`" :aria-current="currentPage === Number(page) ? 'page' : undefined" @click="handlePageChange(Number(page))">
					{{ page }}
				</button>
				<span v-else class="page-link disabled" aria-hidden="true">{{ page }}</span>
			</li>
		</ul>
	</nav>
</template>

<style scoped>
.page-link {
	width: 42px;
	height: 42px;
	text-align: center;
	padding-left: 0;
	padding-right: 0;
}

.page-link.disabled {
	cursor: default;
}
</style>
