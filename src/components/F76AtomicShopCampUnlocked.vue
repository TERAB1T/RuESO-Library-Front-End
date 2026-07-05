<script setup lang="ts">
import { RouterLink } from 'vue-router';
import { computed } from 'vue';
import { useQueryClient } from '@tanstack/vue-query';
import { usePrefetchCampItem } from '@/composables/useApi';
import { prepareCampImage, atomicShopHandleImageError } from '@/utils';
import type { CampUnlockedItem } from '@/types';

const props = defineProps<{
	campUnlockedItems: CampUnlockedItem[] | null;
	lang: 'ru' | 'en';
}>();

const hasCampUnlocked = computed(() => !!(props.campUnlockedItems && props.campUnlockedItems.length > 0));

const pick = (ru: string | null | undefined, en: string | null | undefined) =>
	props.lang === 'ru' ? (ru || en) : (en || ru);

const queryClient = useQueryClient();
const prefetchCampItem = (formId: string) => usePrefetchCampItem(queryClient, formId);

const t = computed(() => props.lang === 'ru'
	? { title: 'Позволяет строить в C.A.M.P.:' }
	: { title: 'Allows building in C.A.M.P.:' }
);
</script>

<template>
	<div v-if="hasCampUnlocked" class="camp-unlocked-block">
		<div class="fo-sect-h">
			<span class="fo-bar"></span>
			<h3 class="fo-h3">{{ t.title }}</h3>
		</div>
		<div class="row g-3">
			<div v-for="campItem in campUnlockedItems" :key="campItem.formId" class="col-12 col-md-6">
				<RouterLink :to="`/f76-camp/${campItem.formId}-${campItem.slug}`" class="camp-unlocked-card" @mouseenter="prefetchCampItem(campItem.formId)">
					<img :src="prepareCampImage(campItem.mainImage, 100)" :alt="pick(campItem.nameRu, campItem.nameEn) || 'CAMP Item'" class="camp-unlocked-image" loading="lazy" @error="atomicShopHandleImageError">
					<div class="camp-unlocked-info">
						<div class="camp-unlocked-name">{{ pick(campItem.nameRu, campItem.nameEn) }}</div>
						<div class="camp-unlocked-path">
							<span v-if="campItem.category">{{ pick(campItem.category.nameRu, campItem.category.nameEn) }}</span>
							<svg v-if="campItem.category && campItem.subcategory" class="breadcrumb-separator camp-unlocked-separator" viewBox="0 0 320 512" fill="currentColor">
								<path d="M310.6 233.4c12.5 12.5 12.5 32.8 0 45.3l-192 192c-12.5 12.5-32.8 12.5-45.3 0s-12.5-32.8 0-45.3L242.7 256 73.4 86.6c-12.5-12.5-12.5-32.8 0-45.3s32.8-12.5 45.3 0l192 192z" />
							</svg>
							<span v-if="campItem.subcategory">{{ pick(campItem.subcategory.nameRu, campItem.subcategory.nameEn) }}</span>
						</div>
					</div>
				</RouterLink>
			</div>
		</div>
	</div>
</template>

<style scoped lang="scss">
.camp-unlocked-block {
	margin-top: 2.25rem;
}

.camp-unlocked-card {
	display: flex;
	align-items: center;
	gap: 0.65rem;
	padding: 0.5rem;
	border-radius: 10px;
	background: rgba(255, 255, 255, 0.03);
	border: 1px solid rgba(255, 255, 255, 0.07);
	transition: border-color 0.15s ease, background-color 0.15s ease;

	&:hover {
		border-color: #6c757d;
		background: rgba(255, 255, 255, 0.05);
	}
}

.camp-unlocked-image {
	width: 44px;
	height: 44px;
	object-fit: contain;
	flex-shrink: 0;
	border-radius: 6px;
}

.camp-unlocked-info {
	display: flex;
	flex-direction: column;
	min-width: 0;
	gap: 0.15rem;
}

.camp-unlocked-name {
	font-size: 0.875rem;
	font-weight: 500;
	color: var(--bs-body-color);
	white-space: nowrap;
	overflow: hidden;
	text-overflow: ellipsis;
	transition: color 0.15s ease;
}

.camp-unlocked-path {
	display: flex;
	align-items: center;
	font-size: 0.75rem;
	color: #a1a1aa;
	white-space: nowrap;
	overflow: hidden;

	span {
		overflow: hidden;
		text-overflow: ellipsis;
	}
}

.camp-unlocked-separator {
	width: 0.5rem;
	height: 0.5rem;
	margin: 0 0.35rem;
	flex-shrink: 0;
}
</style>
