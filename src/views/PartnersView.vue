<script setup lang="ts">
import { useHead } from '@unhead/vue';

const metaTitle = 'Партнеры сайта | RuESO';
const metaDescription = 'Проекты, сообщества и площадки, которые мы рекомендуем и с которыми дружим.';
const metaLink = 'https://rueso.ru/partners/';
const metaIcon = 'https://rueso.ru/public/img/main-card-rueso.jpg';

useHead({
	title: metaTitle,
	meta: [
		{ name: 'description', content: metaDescription },
		{ name: 'robots', content: 'index, follow' },

		{ property: 'og:title', content: metaTitle },
		{ property: 'og:description', content: metaDescription },
		{ property: 'og:image', content: metaIcon },
		{ property: 'og:url', content: metaLink },
		{ property: 'og:locale', content: 'ru_RU' },
		{ property: 'og:site_name', content: 'RuESO' },

		{ name: 'twitter:title', content: metaTitle },
		{ name: 'twitter:description', content: metaDescription },
		{ name: 'twitter:image', content: metaIcon },
		{ name: 'twitter:card', content: 'summary' },
		{ name: 'twitter:creator', content: '@TERAB1T' },
	],
	link: [
		{ rel: 'canonical', href: metaLink }
	]
});

interface Partner {
	name: string;
	description: string;
	url: string;
	image: string;
	category: string;
}

const partners: Partner[] = [
	{
		name: 'F76 HUB',
		description: 'Крупнейший русскоязычный Discord по Fallout 76: общение, рейды, трейд, помощь новичкам и новости.',
		url: 'https://discord.gg/hub76',
		image: '/public/img/partner-f76hub.webp',
		category: 'Fallout',
	},
	{
		name: 'Атомная хатка',
		description: 'Графика и новости Fallout 76 под одной крышей!',
		url: 'https://t.me/xata_skrayu',
		image: '/public/img/partner-atomhut.webp',
		category: 'Fallout',
	},
];
</script>

<template>
	<main class="container-xl" style="margin: 20px auto;">
		<h2>Партнеры сайта</h2>
		<p class="partners-intro">
			Проекты, сообщества и площадки, которые мы рекомендуем и с которыми дружим.
		</p>

		<div class="row g-4 mb-4">
			<div v-for="partner in partners" :key="partner.name" class="col-12 col-md-6 col-lg-4">
				<a :href="partner.url" target="_blank" class="card h-100 text-decoration-none main-page-card">
					<div class="card-img-wrapper">
						<img :src="partner.image" class="card-img-top" :alt="partner.name">
					</div>
					<div class="card-body">
						<h5 class="card-title">{{ partner.name }}</h5>
						<p class="card-text">{{ partner.description }}</p>
					</div>
				</a>
			</div>
		</div>
	</main>
</template>

<style scoped lang="scss">
.partners-intro {
	color: var(--bs-secondary-color);
	max-width: 640px;
	margin: -4px 0 24px;
	line-height: 1.55;
}

.main-page-card {
	transition: transform 0.2s ease, box-shadow 0.2s ease, background-color 0.2s ease;
	overflow: hidden;
	border: 1px solid rgba(0, 0, 0, 0.125);
	background: var(--bs-block-bg);
	padding-left: 0;
	padding-right: 0;
	will-change: transform;
	backface-visibility: hidden;
	-webkit-backface-visibility: hidden;
}

.main-page-card:hover {
	background: #1e1e20;
	text-decoration: none;
}

.card-img-wrapper {
	width: 100%;
	overflow: hidden;
	display: flex;
	align-items: center;
	justify-content: center;
	background: linear-gradient(135deg, #4e4e4e 0%, #383838 100%);
	line-height: 0;
	will-change: transform;
}

.card-img-top {
	width: 100%;
	height: 100%;
	object-fit: contain;
	padding: 0;
	display: block;
	transition: transform 0.3s ease;
	will-change: transform;
	backface-visibility: hidden;
	-webkit-backface-visibility: hidden;
	transform: translateZ(0);
}

.main-page-card:hover .card-img-top {
	transform: scale(1.02);
}

.card-title {
	font-size: 1.1rem;
	font-weight: 600;
	line-height: 1.3;
}

.card-text {
	font-size: 0.95rem;
	--bs-text-opacity: 1;
	color: var(--bs-secondary-color) !important;
}
</style>
