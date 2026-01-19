<script setup lang="ts">
import type { Book } from '@/types';
import { prepareIcon } from '@/utils';
import { useQueryClient } from '@tanstack/vue-query';
import { usePrefetchBook, usePrefetchCategory, usePrefetchPatch } from '@/composables/useApi';

defineProps<{
	book: Book
	currentBookId: number
}>()

const queryClient = useQueryClient();
const prefetchBook = (bookId: number) => usePrefetchBook(queryClient, bookId);
const prefetchCategory = (categoryId: number | undefined) => usePrefetchCategory(queryClient, categoryId);
const prefetchPatch = (patchVersion: string | undefined) => usePrefetchPatch(queryClient, patchVersion);

</script>

<template>
	<template v-if="book.titleRu">
		<div class="p-3 card-wrapper" :class="`${book.group && book.group.length ? '' : 'book-info-card-sticky'}`">
			<div class="card">
				<div class="card-element book-icon">
					<img :src="prepareIcon(book.icon)" :alt="book.titleRu">
				</div>
				<div class="card-element">
					<div class="card-subtitle">Категория</div>
					<RouterLink :to="`/library/eso/category/${book.category?.id}-${book.category?.slug}`" @mouseenter="prefetchCategory(book.category?.id)">
						{{ book.category?.titleRu }}
					</RouterLink>
				</div>
				<div class="card-element">
					<div class="card-subtitle">Оригинальное название</div>
					{{ book.titleEn }}
				</div>
				<div class="card-element">
					<div class="card-subtitle">Добавлена</div>
					<RouterLink :to="`/library/eso/patch/${book.created.version}-${book.created.slug}`" @mouseenter="prefetchPatch(book.created.version)">
						Патч <time :datetime="`${book.created.date} 00:00`">{{ book.created.version }}</time> ({{ book.created.nameRu }})
					</RouterLink>
				</div>
				<div v-if="book.created.version !== book.updated.version" class="card-element">
					<div v-if="book.category?.id === 2000" class="card-subtitle">Удалена</div>
					<div v-else class="card-subtitle">Обновлена</div>
					<RouterLink :to="`/library/eso/patch/${book.updated.version}-${book.updated.slug}`" @mouseenter="prefetchPatch(book.updated.version)">
						Патч <time :datetime="`${book.updated.date} 00:00`">{{ book.updated.version }}</time> ({{ book.updated.nameRu }})
					</RouterLink>
				</div>
			</div>
		</div>

		<div v-if="book.group && book.group.length" class="p-3 card-related-books-wrapper">
			<div class="card card-book-group">
				<div class="list-group list-group-flush">
					<h5 class="list-group-item h5-list-group-item">Связанные книги</h5>
					<RouterLink v-for="relatedBook in book.group" :key="relatedBook.id" :to="`/library/eso/${relatedBook.id}-${relatedBook.slug}`" class="list-group-item list-group-item-action" :class="{ 'active': currentBookId === relatedBook.id }" @mouseenter="prefetchBook(relatedBook.id)">
						{{ relatedBook.titleRu }}
					</RouterLink>
				</div>
			</div>
		</div>
	</template>
</template>

<style scoped lang="scss">
.card-wrapper {
	padding-top: 0 !important;
}

.card {
	padding: 1.25rem !important;
	text-align: center;
	margin: 0 0 0 15px;
	border: none;
	background: var(--bs-block-bg);
}

.card-book-group {
	padding: 5px 0 5px;
	text-align: left;
}

.card-element {
	padding: 1rem 0;
	border-bottom: 1px solid rgba(255, 255, 255, 0.1);
	text-align: center;
}

.card-element:last-child {
	border-bottom: none;
}

.card-subtitle {
	font-size: 13px;
	margin-bottom: 0.3rem;
	color: #a1a1aa;
	font-weight: 500;
}

.book-icon {
	border: none;
}

.list-group {
	display: flex;
	flex-direction: column;
	gap: 0.3rem;
}

.h5-list-group-item {
	padding: 0;
	font-size: 1.125rem;
	text-align: center;
	border-bottom: 1px solid rgba(255, 255, 255, 0.1);
	padding-bottom: 20px;
	background: none;
}

.list-group-item-action {
	background: none;
	border: none;
	padding: 0.75rem 1rem;
	border-radius: 6px;
	text-decoration: none;
	color: var(--bs-body-color);
	font-size: 0.9375rem;
	line-height: normal;

	&:hover {
		background: none;
		color: var(--bs-primary);
		transition: color 0.2s;
	}

	&.active {
		background: var(--bs-primary);
		color: #27272a;
		font-weight: 500;
		pointer-events: none;
	}
}

.book-info-card-sticky {
	position: sticky;
	top: 90px;
}

@media (max-width: 991.98px) {
	.card-wrapper {
		margin-top: 0;
		padding: 0 0 10px !important;
		border-bottom: 1px solid rgba(255, 255, 255, 0.1);
	}

	.card-related-books-wrapper {
		margin-top: 20px;
		padding: 0 !important;
	}

	.card {
		margin: 0;
		padding: 0 !important;
	}
}
</style>
