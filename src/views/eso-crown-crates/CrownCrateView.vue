<script setup lang="ts">
import { useRoute } from 'vue-router';
import { computed, onServerPrefetch, ref } from 'vue';
import { useHead } from '@unhead/vue';
import { useFetchCrownCrate } from '@/composables/useApi';
import { prepareCrownCrateImage, formatCrownCrateSale, generateMetaDescription, crownCrateTier, CROWN_GEMS_ICON } from '@/utils';
import Breadcrumb from '@/components/Breadcrumb.vue';
import ESOCrownCrateRewardModal from '@/components/ESOCrownCrateRewardModal.vue';
import NotFoundView from '@/views/NotFoundView.vue';

import type { ReactiveHead } from '@unhead/vue';
import type { BreadcrumbItem, CrownCrate, CrownCrateReward } from '@/types';

const SKELETON_TIERS = 3;
const SKELETON_CARDS = 8;

const route = useRoute();
const crateId = computed(() => Number(route.params.crateId) || 0);

const { data: crateData, suspense: crateSuspense, isPending: isCratePending, isError: isCrateError, isSuccess: isCrateFetched } = useFetchCrownCrate(crateId);

const crate = computed(() => crateData.value ?? null as CrownCrate | null);
const isNotFound = computed(() => isCrateFetched.value && !crate.value);

const sale = computed(() => crate.value ? formatCrownCrateSale(crate.value.saleSeason, crate.value.saleYear) : null);

// Tiers top-down; inside a tier — alphabetically, as on the old elderscrolls.net pages.
const tiers = computed(() => {
	const byTier = new Map<number, CrownCrateReward[]>();
	for (const reward of crate.value?.rewards ?? []) {
		if (!byTier.has(reward.tier)) byTier.set(reward.tier, []);
		byTier.get(reward.tier)!.push(reward);
	}
	return [...byTier.entries()]
		.sort(([a], [b]) => b - a)
		.map(([tier, rewards]) => ({
			tier,
			...crownCrateTier(tier),
			rewards: rewards.sort((a, b) => a.nameRu.localeCompare(b.nameRu, 'ru')),
		}));
});

const selectedReward = ref<CrownCrateReward | null>(null);

const breadcrumbItems = computed<BreadcrumbItem[]>(() => [
	{ label: 'Кронные ящики ESO', to: '/eso-crown-crates' },
	{ label: crate.value?.nameRu || 'Загрузка...' },
]);

const headInput = computed((): ReactiveHead => {
	const c = crate.value;
	if (!c) return {};

	const title = `${c.nameRu} | Кронные ящики ESO`;
	const metaDescription = generateMetaDescription(
		`${c.nameRu} (${c.nameEn}) — кронный ящик The Elder Scrolls Online${sale.value ? `, продавался ${sale.value}` : ''}. ` +
		`Все ${c.rewardsCount} наград с редкостью, шансами выпадения и ценами в кронных самоцветах.`
	);
	const link = `https://rueso.ru/eso-crown-crates/${c.id}-${c.slug}`;
	const image = `https://rueso.ru${prepareCrownCrateImage(c.image ?? c.cardBack)}`;

	return {
		title,
		meta: [
			{ name: 'description', content: metaDescription },
			{ name: 'robots', content: 'index, follow' },
			{ property: 'og:title', content: title },
			{ property: 'og:description', content: metaDescription },
			{ property: 'og:image', content: image },
			{ property: 'og:url', content: link },
			{ property: 'og:locale', content: 'ru_RU' },
			{ property: 'og:type', content: 'website' },
			{ property: 'og:site_name', content: 'RuESO' },
			{ name: 'twitter:title', content: title },
			{ name: 'twitter:description', content: metaDescription },
			{ name: 'twitter:image', content: image },
			{ name: 'twitter:card', content: 'summary_large_image' },
			{ name: 'twitter:creator', content: '@TERAB1T' },
		],
		link: [{ rel: 'canonical', href: link }],
		script: [{
			type: 'application/ld+json',
			innerHTML: JSON.stringify({
				'@context': 'https://schema.org',
				'@type': 'BreadcrumbList',
				itemListElement: breadcrumbItems.value.map((item, index) => ({
					'@type': 'ListItem',
					position: index + 1,
					name: item.label,
					...(item.to && { item: `https://rueso.ru${item.to}` }),
				})),
			}),
		}],
	};
});

useHead(headInput);

onServerPrefetch(async () => {
	await crateSuspense();
});
</script>

<template>
	<div class="container-xl crates-page">
		<div v-if="isCratePending" class="skeleton placeholder-glow">
			<span class="visually-hidden" role="status">Загрузка…</span>
			<Breadcrumb :items="breadcrumbItems" />
			<div class="crate-hero" aria-hidden="true"><span class="placeholder crate-hero-placeholder"></span></div>
			<section v-for="t in SKELETON_TIERS" :key="t" aria-hidden="true">
				<h2 class="tier-title"><span class="placeholder col-3"></span></h2>
				<div class="rewards-grid">
					<div v-for="n in SKELETON_CARDS" :key="n" class="reward-tile">
						<span class="placeholder reward-card"></span>
						<span class="placeholder col-10"></span>
					</div>
				</div>
			</section>
		</div>

		<div v-else-if="isCrateError" class="error-state alert alert-danger mt-4">
			<h5>Ошибка загрузки кронного ящика</h5>
			<p>Попробуйте обновить страницу или вернуться позже.</p>
		</div>

		<NotFoundView v-else-if="isNotFound" />

		<template v-else-if="crate">
			<Breadcrumb :items="breadcrumbItems" />

			<div class="crate-hero" :class="{ 'crate-hero-no-image': !crate.image }">
				<img v-if="crate.image" :src="prepareCrownCrateImage(crate.image)" alt="" width="1024" height="512" class="crate-hero-image">
				<div class="crate-hero-content">
					<img :src="prepareCrownCrateImage(crate.cardBack)" :alt="crate.nameRu" width="348" height="512" class="crate-hero-back">
					<div class="crate-hero-text">
						<div class="crate-kicker">Кронный ящик<span v-if="crate.section === 'special'"> · особый</span></div>
						<h1 class="crate-title">{{ crate.nameRu }}</h1>
						<div class="crate-title-en">{{ crate.nameEn }}</div>
						<div class="crate-tags">
							<span v-if="sale" class="crate-tag">Продавались {{ sale }}</span>
							<span v-if="crate.isPTS" class="crate-tag crate-tag-pts">PTS</span>
						</div>
						<p v-if="crate.noteRu" class="crate-note">{{ crate.noteRu }}</p>
					</div>
				</div>
			</div>


			<section v-for="t in tiers" :key="t.tier" class="tier" :style="{ '--tier-color': t.color }">
				<h2 class="tier-title">
					<span>{{ t.ru }}</span>
					<span class="tier-line" aria-hidden="true"></span>
				</h2>
				<p class="tier-chance">Шанс выпадения: {{ t.chanceText ?? `${t.chance}%` }}</p>
				<div class="rewards-grid">
					<button v-for="reward in t.rewards" :key="reward.productId" type="button" class="reward-tile" @click="selectedReward = reward">
						<span class="reward-card">
							<img :src="prepareCrownCrateImage(reward.cardSmall)" :alt="reward.nameRu" width="174" height="256" loading="lazy" class="reward-card-image">
							<span v-if="reward.price" class="reward-price">{{ reward.price }}<img :src="CROWN_GEMS_ICON" alt="" width="14" height="14" class="reward-price-gem"></span>
						</span>
						<span class="reward-name">{{ reward.nameRu }}<template v-if="reward.count > 1"> ×{{ reward.count }}</template></span>
					</button>
				</div>
			</section>

			<ESOCrownCrateRewardModal :reward="selectedReward" @closed="selectedReward = null" />
		</template>
	</div>
</template>

<style scoped lang="scss">
.crates-page {
	padding-bottom: 3rem;
}

.crate-hero {
	position: relative;
	overflow: hidden;
	min-height: 360px;
	margin: 1rem 0 1.75rem;
	border-radius: var(--bs-border-radius-lg);
	border: 1px solid #6b6b6b33;
	background: var(--bs-block-bg);
}

.crate-hero-placeholder {
	display: block;
	width: 100%;
	height: 360px;
}

// Store pictures are 1024 × 512: never wider than that, so they are never upscaled.
.crate-hero-image {
	position: absolute;
	top: 0;
	right: 0;
	width: min(100%, 1024px);
	height: 100%;
	object-fit: cover;
	object-position: right center;
	z-index: 0;
}

// Solid under the text, fading out over the right half where the crates are.
.crate-hero:has(.crate-hero-image)::before {
	content: '';
	position: absolute;
	inset: 0;
	z-index: 1;
	background: linear-gradient(to right,
		var(--bs-block-bg) 0%,
		rgba(24, 24, 27, 0.97) 30%,
		rgba(24, 24, 27, 0.8) 48%,
		rgba(24, 24, 27, 0.35) 66%,
		rgba(24, 24, 27, 0) 82%);
}

.crate-hero-no-image {
	background: radial-gradient(circle at 80% 30%, rgba(var(--bs-primary-rgb), 0.12), transparent 60%), var(--bs-block-bg);
}

.crate-hero-content {
	position: relative;
	z-index: 2;
	display: flex;
	align-items: center;
	gap: 1.75rem;
	min-height: 360px;
	max-width: min(62%, 680px);
	padding: 2rem 2.25rem;
}

.crate-hero-back {
	flex: none;
	width: 150px;
	height: auto;
}

.crate-hero-text {
	min-width: 0;
	text-shadow: 0 1px 3px rgba(0, 0, 0, 0.85);
}

.crate-kicker {
	font-size: 0.8rem;
	font-weight: 600;
	letter-spacing: 0.12em;
	text-transform: uppercase;
	color: var(--bs-primary);
	margin-bottom: 0.4rem;
}

.crate-title {
	font-size: 2.3rem;
	font-weight: 700;
	line-height: 1.15;
	margin-bottom: 0.3rem;
}

.crate-title-en {
	font-size: 1.05rem;
	color: rgba(255, 255, 255, 0.7);
	margin-bottom: 1rem;
}

.crate-tags {
	display: flex;
	flex-wrap: wrap;
	gap: 0.5rem;
}

.crate-tag {
	padding: 0.2rem 0.75rem;
	border-radius: 1rem;
	border: 1px solid rgba(var(--bs-primary-rgb), 0.45);
	background: rgba(0, 0, 0, 0.45);
	color: #f0e2c0;
	font-size: 0.85rem;
}

.crate-tag-pts {
	border-color: var(--bs-warning);
	color: var(--bs-warning);
	font-weight: 600;
}

.crate-note {
	margin: 1rem 0 0;
	font-size: 0.95rem;
	color: rgba(255, 255, 255, 0.75);
}

.tier-title {
	display: flex;
	align-items: center;
	gap: 1rem;
	font-size: 1.4rem;
	font-weight: 600;
	color: var(--tier-color);
	margin: 2rem 0 0.15rem;

}

.tier-line {
	flex: 1;
	height: 1px;
	background: linear-gradient(to right, color-mix(in srgb, var(--tier-color), transparent 50%), #6b6b6b33);
}

.tier-chance {
	margin: 0 0 1.25rem;
	font-size: 0.9rem;
	color: var(--bs-secondary-color);
}

.rewards-grid {
	display: grid;
	grid-template-columns: repeat(auto-fill, minmax(max(140px, calc((100% - 6rem) / 7)), 1fr));
	gap: 1.5rem 1rem;
}

.reward-tile {
	display: flex;
	flex-direction: column;
	align-items: center;
	text-align: center;
	background: none;
	border: 0;
	padding: 0;
	color: var(--bs-link-color);

	&:hover .reward-name {
		color: var(--bs-link-hover-color);
	}

	&:hover .reward-card {
		filter: brightness(1.12);
	}
}

.reward-card {
	position: relative;
	display: block;
	width: 100%;
	aspect-ratio: 174 / 256;
	margin-bottom: 0.5rem;
	transition: filter 0.3s ease;
}

.reward-card-image {
	display: block;
	width: 100%;
	height: 100%;
}

.reward-price {
	position: absolute;
	left: 50%;
	bottom: 10.5%;
	transform: translateX(-50%);
	display: inline-flex;
	align-items: center;
	gap: 0.25rem;
	padding: 0.05rem 0.45rem;
	border-radius: 1rem;
	background: rgba(0, 0, 0, 0.75);
	color: #fff;
	font-size: 0.8rem;
	font-weight: 600;
	line-height: 1.4;
	white-space: nowrap;
}

.reward-price-gem {
	width: 14px;
	height: 14px;
}

.reward-name {
	font-size: 0.9rem;
	line-height: 1.3;
}

@media (max-width: 991.98px) {
	.crate-hero,
	.crate-hero-content {
		min-height: 0;
	}

	.crate-hero:has(.crate-hero-image)::before {
		display: none;
	}

	.crate-hero-image {
		position: static;
		display: block;
		width: 100%;
		max-width: 1024px;
		height: auto;
		margin-left: auto;
		aspect-ratio: 2 / 1;
		mask-image: linear-gradient(to bottom, #000 60%, transparent 100%);
	}

	.crate-hero-content {
		max-width: none;
		margin-top: -4rem;
		padding: 0 1.25rem 1.5rem;
		align-items: flex-end;
	}

	.crate-hero-back {
		width: 100px;
	}

	.crate-title {
		font-size: 1.7rem;
	}
}

@media (max-width: 575.98px) {
	.crate-hero-back {
		display: none;
	}
}
</style>
