<script setup lang="ts">
import { computed, toRef } from 'vue';
import { RouterLink } from 'vue-router';
import { useQueryClient } from '@tanstack/vue-query';
import { prepareAtomicShopImage, atomicShopHandleImageError } from '@/utils';
import { usePrefetchAtomicShopCategory, usePrefetchAtomicShopSubcategory, usePrefetchAtomicShopAcquisitionSource } from '@/composables/useApi';
import { useSupportText } from '@/composables/useSupportText';
import { trackSupportGuideOpen } from '@/analytics';

import type { AtomicShopItem, AtomicShopCategoryWithSubcategories, AtomicShopSubcategory } from '@/types';

const props = defineProps<{
	item: AtomicShopItem;
	categoryInfo: AtomicShopCategoryWithSubcategories | null | undefined;
	subcategoryInfo: AtomicShopSubcategory | null | undefined;
	withImage?: boolean;
}>();

const { generateSupportUrlText } = useSupportText(toRef(props, 'item'));

const queryClient = useQueryClient();
const prefetchCategory = (categoryFormId: string | undefined) => usePrefetchAtomicShopCategory(queryClient, categoryFormId);
const prefetchSubcategory = (subcategoryFormId: string | undefined) => usePrefetchAtomicShopSubcategory(queryClient, subcategoryFormId);
const prefetchAcquisitionSource = (type: string | undefined, number: number | undefined) => usePrefetchAtomicShopAcquisitionSource(queryClient, type, number);

// Editor IDs are long snake_case: break them after underscores, not mid-word.
const editorIdParts = computed(() => (props.item.editorId ?? '').split('_'));

const acquisitionSourceInfo = computed(() => {
	const source = props.item.acquisitionSource;
	if (!source || (source.type !== 'season' && source.type !== 'miniseason')) return null;
	return source;
});

const acquisitionSourceTypeLabel = computed(() =>
	acquisitionSourceInfo.value?.type === 'miniseason' ? 'Мини-сезон' : 'Сезон'
);

const acquisitionSourceLabel = computed(() => {
	const source = acquisitionSourceInfo.value;
	if (!source) return '';
	if (source.nameRu) return source.nameRu;
	return source.type === 'season' ? `Сезон ${source.number}` : 'Мини-сезон';
});
</script>

<template>
	<div class="p-3 card-wrapper book-info-card-sticky">
		<div class="card">
			<div v-if="withImage" class="card-element book-icon">
				<a :href="prepareAtomicShopImage(item.mainImage)" class="screenshot-link">
					<img :src="prepareAtomicShopImage(item.mainImage)" :alt="item.nameRu || item.nameEn || 'Atomic Shop Item'" class="main-image" width="200" height="200" loading="lazy" @error="atomicShopHandleImageError">
				</a>
			</div>
			<div v-if="categoryInfo" class="card-element">
				<div class="card-subtitle">Категория</div>
				<div class="card-value">
					<RouterLink :to="`/f76-atomic-shop/category/${categoryInfo.formId}-${categoryInfo.slug}`" class="text-decoration-none" @mouseenter="prefetchCategory(categoryInfo.formId)">
						{{ categoryInfo.nameRu }}
					</RouterLink>
					<span v-if="subcategoryInfo">
						<svg class="breadcrumb-separator" viewBox="0 0 320 512" fill="currentColor">
							<path d="M310.6 233.4c12.5 12.5 12.5 32.8 0 45.3l-192 192c-12.5 12.5-32.8 12.5-45.3 0s-12.5-32.8 0-45.3L242.7 256 73.4 86.6c-12.5-12.5-12.5-32.8 0-45.3s32.8-12.5 45.3 0l192 192z" />
						</svg>
						<RouterLink :to="`/f76-atomic-shop/subcategory/${subcategoryInfo.formId}-${subcategoryInfo.slug}`" class="text-decoration-none" @mouseenter="prefetchSubcategory(subcategoryInfo.formId)">
							{{ subcategoryInfo.nameRu }}
						</RouterLink>
					</span>
				</div>
			</div>
			<div v-if="acquisitionSourceInfo" class="card-element">
				<div class="card-subtitle">{{ acquisitionSourceTypeLabel }}</div>
				<div class="card-value">
					<RouterLink :to="`/f76-atomic-shop/${acquisitionSourceInfo.type}/${acquisitionSourceInfo.number}-${acquisitionSourceInfo.slug}`" class="text-decoration-none" @mouseenter="prefetchAcquisitionSource(acquisitionSourceInfo.type, acquisitionSourceInfo.number)">
						{{ acquisitionSourceLabel }}
					</RouterLink>
				</div>
			</div>
			<div class="card-element">
				<div class="card-subtitle">Оригинальное название</div>
				<div class="card-value">{{ item.nameEn || '—' }}</div>
			</div>
			<div class="card-element">
				<div class="card-subtitle">Продается в службе поддержки</div>
				<div v-if="!item.supportItem && !item.supportBundles" class="card-value">
					Нет
				</div>
				<div v-else class="card-value">
					<button type="button" class="btn btn-link modal-trigger" data-bs-toggle="modal" data-bs-target="#supportModal" aria-haspopup="dialog" @click="trackSupportGuideOpen(item.formId)" v-html="generateSupportUrlText"></button>
				</div>
			</div>
			<div class="card-element">
				<div class="card-subtitle">Form ID</div>
				<div class="card-value">{{ item.formId }}</div>
			</div>
			<div class="card-element">
				<div class="card-subtitle">Editor ID</div>
				<div class="card-value"><template v-for="(part, index) in editorIdParts" :key="index"><template v-if="index">_<wbr></template>{{ part }}</template></div>
			</div>
		</div>
	</div>
</template>

<style scoped lang="scss">
@use '@/assets/styles/f76-info-card';

.modal-trigger {
	text-decoration: underline dotted;
	text-decoration-color: currentColor;
	text-underline-offset: 4px;
	text-decoration-thickness: 0.5px;

	padding: 0;
	border: none;
	margin-top: -4px;
}

:deep(.support-item-name) {
	background-color: hsl(from #4cb6eb h s l / 10%);
	border: 1px solid hsl(from #4cb6eb h s l / 30%);
	border-radius: 4px;
	padding: 0px 4px;
	cursor: pointer;
	transition: background-color 0.2s ease;
	user-select: none;
	white-space: nowrap;

	&:hover {
		background-color: hsl(from #4cb6eb h s l / 18%);
	}
}

@media (max-width: 991.98px) {
	.modal-trigger {
		margin-top: 0;
		text-align: left;
	}
}
</style>
