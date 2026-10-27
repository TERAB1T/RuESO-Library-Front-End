<script setup lang="ts">
import { RouterLink } from 'vue-router';
import { computed, onServerPrefetch } from 'vue';
import { useHead } from '@unhead/vue';
import { useQueryClient } from '@tanstack/vue-query';
import { useFetchCrownCrates, useFetchCrownCratesUpdated, usePrefetchCrownCrate } from '@/composables/useApi';
import { prepareCrownCrateImage, formatDateTime } from '@/utils';

import type { ReactiveHead } from '@unhead/vue';
import type { CrownCrateListItem } from '@/types';

const DESCRIPTION = 'Все кронные ящики The Elder Scrolls Online: награды каждого сезона, их редкость, цены в кронных самоцветах и шансы выпадения.';
const SKELETON_CARDS = 12;

const { data: cratesData, suspense: cratesSuspense, isPending: isCratesPending, isError: isCratesError } = useFetchCrownCrates();
const { data: updatedData, isPending: isUpdatedPending } = useFetchCrownCratesUpdated();

const sections = computed(() => {
	const crates = cratesData.value ?? [];
	return [
		{ id: 'seasonal', title: 'Сезонные ящики', crates: crates.filter(c => c.section === 'seasonal') },
		{ id: 'special', title: 'Особые ящики', crates: crates.filter(c => c.section === 'special') },
	].filter(s => s.crates.length);
});

const crateLink = (crate: CrownCrateListItem) => `/eso-crown-crates/${crate.id}-${crate.slug}`;

const headInput = computed((): ReactiveHead => {
	const title = 'Кронные ящики ESO';
	const link = 'https://rueso.ru/eso-crown-crates/';
	const image = 'https://rueso.ru/public/img/main-card-crowncrates.jpg';

	return {
		title,
		meta: [
			{ name: 'description', content: DESCRIPTION },
			{ name: 'robots', content: 'index, follow' },
			{ property: 'og:title', content: title },
			{ property: 'og:description', content: DESCRIPTION },
			{ property: 'og:image', content: image },
			{ property: 'og:url', content: link },
			{ property: 'og:locale', content: 'ru_RU' },
			{ property: 'og:type', content: 'website' },
			{ property: 'og:site_name', content: 'RuESO' },
			{ name: 'twitter:title', content: title },
			{ name: 'twitter:description', content: DESCRIPTION },
			{ name: 'twitter:image', content: image },
			{ name: 'twitter:card', content: 'summary_large_image' },
			{ name: 'twitter:creator', content: '@TERAB1T' },
		],
		link: [{ rel: 'canonical', href: link }],
	};
});

useHead(headInput);

onServerPrefetch(async () => {
	await cratesSuspense();
});

const queryClient = useQueryClient();
const prefetchCrate = (crateId: number) => usePrefetchCrownCrate(queryClient, crateId);
</script>

<template>
	<div class="container-xl crates-page">
		<div class="crates-header">
			<h1>Кронные ящики ESO</h1>
			<p class="crates-intro">{{ DESCRIPTION }}</p>
			<div class="text-muted small fst-italic">
				<span class="d-none d-md-inline">Последнее обновление: </span><span class="d-md-none">Обновлено: </span><time v-if="updatedData?.lastModified" :datetime="formatDateTime(updatedData.lastModified)">{{ updatedData.lastModified }}</time><span v-else-if="isUpdatedPending" class="skeleton placeholder-glow" aria-hidden="true"><span class="placeholder skeleton-date"></span></span>
			</div>
		</div>

		<div v-if="isCratesPending" class="skeleton placeholder-glow">
			<span class="visually-hidden" role="status">Загрузка…</span>
			<h2 class="crates-section-title"><span class="placeholder col-3"></span></h2>
			<div class="crates-grid" aria-hidden="true">
				<div v-for="n in SKELETON_CARDS" :key="n" class="crate-tile">
					<span class="placeholder crate-tile-image"></span>
					<span class="placeholder col-10"></span>
				</div>
			</div>
		</div>

		<div v-else-if="isCratesError" class="error-state alert alert-danger mt-4">
			<h5>Ошибка загрузки кронных ящиков</h5>
			<p>Попробуйте обновить страницу или вернуться позже.</p>
		</div>

		<template v-else>
			<section v-for="section in sections" :key="section.id">
				<h2 class="crates-section-title">{{ section.title }}</h2>
				<div class="crates-grid">
					<RouterLink v-for="crate in section.crates" :key="crate.id" :to="crateLink(crate)" class="crate-tile" @mouseenter="prefetchCrate(crate.id)">
						<div class="crate-tile-image">
							<img :src="prepareCrownCrateImage(crate.cardBack)" :alt="crate.nameRu" width="348" height="512" loading="lazy">
							<img :src="prepareCrownCrateImage(crate.cardBackGlow)" alt="" width="348" height="512" loading="lazy" class="crate-tile-glow" aria-hidden="true">
							<span v-if="crate.isPTS" class="badge text-bg-warning crate-pts">PTS</span>
						</div>
						<span class="crate-tile-name">{{ crate.nameRu }}</span>
					</RouterLink>
				</div>
			</section>
		</template>
	</div>
</template>

<style scoped lang="scss">
.crates-page {
	padding-bottom: 3rem;
}

.crates-header {
	margin: 1.5rem 0 1rem;

	h1 {
		font-size: 2rem;
		font-weight: 600;
	}
}

.crates-intro {
	margin-bottom: 0.5rem;
	color: var(--bs-secondary-color);
}

.crates-section-title {
	display: flex;
	align-items: center;
	gap: 1rem;
	font-size: 1.5rem;
	font-weight: 600;
	color: var(--bs-primary);
	margin: 2rem 0 1.25rem;

	&::after {
		content: '';
		flex: 1;
		height: 1px;
		background: linear-gradient(to right, rgba(var(--bs-primary-rgb), 0.5), transparent);
	}
}

.crates-grid {
	display: grid;
	grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
	gap: 1.25rem 1rem;
	margin-bottom: 2rem;
}

.crate-tile {
	display: flex;
	flex-direction: column;
	align-items: center;
	text-align: center;
	text-decoration: none;
	color: var(--bs-link-color);

	&:hover .crate-tile-name {
		color: var(--bs-link-hover-color);
	}

	&:hover .crate-tile-glow {
		opacity: 1;
	}
}

.crate-tile-image {
	position: relative;
	display: block;
	width: 100%;
	aspect-ratio: 348 / 512;
	margin-bottom: 0.6rem;

	img {
		position: absolute;
		inset: 0;
		width: 100%;
		height: 100%;
		object-fit: contain;
	}
}

.crate-tile-glow {
	opacity: 0;
	transition: opacity 0.3s ease;
}

.crate-pts {
	position: absolute;
	z-index: 1;
	top: 0.5rem;
	right: 0.5rem;
}

.crate-tile-name {
	font-weight: 500;
	line-height: 1.3;
}



.skeleton .crate-tile .placeholder {
	margin-bottom: 0.5rem;
}

.skeleton-date {
	width: 5rem;
}
</style>
