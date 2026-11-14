<script setup lang="ts">
import { useHead } from '@unhead/vue';
import { RouterLink } from 'vue-router';
import { ONEST_PRELOAD } from '@/utils';

interface SectionCard {
	/** A page of this site, or a full URL of another one (opens in a new tab). */
	link: string;
	image: string;
	title: string;
	/** Fits two lines of a tile. */
	text: string;
}

interface HomeSection {
	title: string;
	cards: SectionCard[];
}

const isExternal = (link: string) => link.startsWith('http');

let metaTitle = 'RuESO | Все о сериях TES и Fallout';
let metaDescription = 'Библиотека книг ESO, модификация RuESO, Атомная лавка Fallout 76 и база текстов всех игр The Elder Scrolls и Fallout.';
let metaLink = 'https://rueso.ru/';
let metaIcon = 'https://rueso.ru/public/img/main-card-rueso.jpg';

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
		{ rel: 'canonical', href: metaLink },
		...ONEST_PRELOAD,
	]
});

const sections: HomeSection[] = [
	{
		title: 'The Elder Scrolls',
		cards: [
			{
				link: '/library/eso',
				image: '/public/img/main-card-library.jpg',
				title: 'Библиотека ESO',
				text: 'Все книги ESO на русском и английском с разбивкой по категориям и патчам.',
			},
			{
				link: '/eso-crown-crates',
				image: '/public/img/main-card-crowncrates.jpg',
				title: 'Кронные ящики ESO',
				text: 'Награды всех кронных ящиков ESO, их редкость, цены и шансы выпадения.',
			},
			{
				link: '/rueso',
				image: '/public/img/main-card-rueso.jpg',
				title: 'Модификация RuESO',
				text: 'Полезные функции для тех, кто играет в ESO на русском.',
			},
			{
				link: '/glossary-tes',
				image: '/public/img/main-card-glossary.jpg',
				title: 'База текстов TES',
				text: 'Тексты всех игр серии: от Arena и Daggerfall до Skyrim и ESO.',
			},
			{
				link: 'https://furniture.rueso.ru',
				image: '/public/img/main-card-furniture.jpg',
				title: 'Предметы обстановки ESO',
				text: 'Предметы обстановки ESO, которые можно разместить в своем доме.',
			},
		],
	},
	{
		title: 'Fallout',
		cards: [
			{
				link: '/f76-atomic-shop',
				image: '/public/img/main-card-atomic-shop.jpg',
				title: 'Атомная лавка Fallout 76',
				text: 'Все товары, которые были или появятся в Атомной лавке.',
			},
			{
				link: '/f76-camp',
				image: '/public/img/main-card-camp.jpg',
				title: 'Предметы C.A.M.P. Fallout 76',
				text: 'Каталог предметов, которые можно построить в вашей C.A.M.P.',
			},
			{
				link: '/f76-map',
				image: '/public/img/main-card-map.jpg',
				title: 'Карта Fallout 76',
				text: 'Локации, регионы, предметы и ресурсы Аппалачии с поиском.',
			},
			{
				link: '/glossary-fallout',
				image: '/public/img/main-card-fallout.jpg',
				title: 'База текстов Fallout',
				text: 'Тексты всех игр серии: от Fallout 1 и Tactics до Shelter и Fallout 76.',
			},
		],
	},
];
</script>

<template>
	<main class="home">
		<header class="home-hero">
			<div class="home-hero-art" aria-hidden="true">
				<img class="home-hero-art-tes" src="/public/img/home-hero-tes.webp" width="1600" height="648" alt="">
				<img class="home-hero-art-fallout" src="/public/img/home-hero-fallout.webp" width="1600" height="900" alt="">
			</div>
			<div class="container-xl home-hero-text">
				<h1 class="home-title">Справочник по <span class="home-title-game">The Elder Scrolls</span> <span>и <span class="home-title-game">Fallout</span></span></h1>
				<p class="home-lead">Книги, тексты, предметы и карты на русском и английском. Данные берутся прямо из файлов игр и обновляются с каждым патчем.</p>
			</div>
		</header>

		<div class="container-xl home-sections">
			<section v-for="section in sections" :key="section.title">
				<div class="fo-sect-h">
					<span class="fo-bar"></span>
					<h2 class="fo-h3">{{ section.title }}</h2>
				</div>

				<div class="home-grid">
					<component
						:is="isExternal(card.link) ? 'a' : RouterLink"
						v-for="card in section.cards"
						:key="card.link"
						v-bind="isExternal(card.link) ? { href: card.link, target: '_blank' } : { to: card.link }"
						class="home-card"
					>
						<img class="home-card-image" :src="card.image" width="600" height="334" alt="">
						<div class="home-card-body">
							<h3 class="home-card-title">{{ card.title }}</h3>
							<p class="home-card-text">{{ card.text }}</p>
						</div>
					</component>
				</div>
			</section>
		</div>
	</main>
</template>

<style scoped lang="scss">
.home {
	padding-bottom: 40px;
}

.home-hero {
	position: relative;
	margin-bottom: 20px;
}

/* The art sits behind the page top and reaches under the first row of cards. It stops at 1920px, so it
   isn't blown up on wide screens, and dissolves into the page background to the sides and downwards. */
.home-hero-art {
	position: absolute;
	top: 0;
	left: 0;
	right: 0;
	height: 640px;
	max-width: 1920px;
	margin-inline: auto;
	opacity: 0.12;
	pointer-events: none;
	/* Many stops approximate an ease-out curve: a linear fade shows a visible band where it ends. */
	-webkit-mask-image:
		linear-gradient(90deg, transparent 0%, rgba(0, 0, 0, 0.35) 10%, rgba(0, 0, 0, 0.8) 22%, #000 32%, #000 68%, rgba(0, 0, 0, 0.8) 78%, rgba(0, 0, 0, 0.35) 90%, transparent 100%),
		linear-gradient(180deg, #000 0%, #000 25%, rgba(0, 0, 0, 0.75) 42%, rgba(0, 0, 0, 0.45) 58%, rgba(0, 0, 0, 0.2) 74%, rgba(0, 0, 0, 0.06) 88%, transparent 100%);
	-webkit-mask-composite: source-in;
	mask-image:
		linear-gradient(90deg, transparent 0%, rgba(0, 0, 0, 0.35) 10%, rgba(0, 0, 0, 0.8) 22%, #000 32%, #000 68%, rgba(0, 0, 0, 0.8) 78%, rgba(0, 0, 0, 0.35) 90%, transparent 100%),
		linear-gradient(180deg, #000 0%, #000 25%, rgba(0, 0, 0, 0.75) 42%, rgba(0, 0, 0, 0.45) 58%, rgba(0, 0, 0, 0.2) 74%, rgba(0, 0, 0, 0.06) 88%, transparent 100%);
	mask-composite: intersect;

	img {
		position: absolute;
		top: 0;
		height: 100%;
		object-fit: cover;
	}
}

/* A crossfade without a see-through middle: the Fallout art underneath is fully opaque across the whole
   transition zone (its own left edge fades out only where the TES art is still solid), and the TES art
   on top fades out over it. If both were half-transparent at once, the page would show through as a
   grey band. object-position keeps the characters in view when a picture is cropped. */
.home-hero-art-tes {
	left: 0;
	z-index: 1;
	width: 68%;
	object-position: 50% 40%;
	/* Solid up to 40% of the band, gone at 68%. */
	-webkit-mask-image: linear-gradient(90deg, #000 0%, #000 59%, rgba(0, 0, 0, 0.8) 68%, rgba(0, 0, 0, 0.5) 78%, rgba(0, 0, 0, 0.2) 89%, transparent 100%);
	mask-image: linear-gradient(90deg, #000 0%, #000 59%, rgba(0, 0, 0, 0.8) 68%, rgba(0, 0, 0, 0.5) 78%, rgba(0, 0, 0, 0.2) 89%, transparent 100%);
}

.home-hero-art-fallout {
	right: 0;
	width: 70%;
	object-position: 66% 45%;
	/* Fades in between 30% and 36% of the band, under the still solid TES art. */
	-webkit-mask-image: linear-gradient(90deg, transparent 0%, #000 8%);
	mask-image: linear-gradient(90deg, transparent 0%, #000 8%);
}

.home-hero-text {
	position: relative;
	padding-block: 72px 48px;
}

.home-title {
	max-width: 720px;
	margin: 0 0 14px;
	font-family: 'Onest', sans-serif;
	font-weight: 700;
	font-size: clamp(1.9rem, 1.3rem + 1.8vw, 2.75rem);
	line-height: 1.12;
	letter-spacing: -0.015em;
	color: #fff;
	text-wrap: balance;

	span {
		white-space: nowrap;
	}
}

.home-title-game {
	color: var(--bs-primary);
}

.home-lead {
	max-width: 620px;
	margin: 0;
	font-size: 1.1rem;
	line-height: 1.55;
	color: #c9ccd1;
	text-wrap: pretty;
}

.home-sections {
	position: relative;
	display: grid;
	grid-template-columns: repeat(2, minmax(0, 1fr));
	align-items: start;
	gap: 40px 3rem;

	/* Divider in the middle of the column gap; it fades out at both ends and spans the taller column. */
	&::before {
		content: '';
		position: absolute;
		top: 0;
		bottom: 0;
		left: 50%;
		width: 1px;
		background: linear-gradient(180deg, transparent 0%, rgba(255, 255, 255, 0.09) 20%, rgba(255, 255, 255, 0.09) 80%, transparent 100%);
		pointer-events: none;
	}
}

.home-grid {
	display: grid;
	grid-template-columns: repeat(2, minmax(0, 1fr));
	gap: 1rem;
}

.home-card {
	position: relative;
	display: flex;
	min-height: 150px;
	border: 1px solid #2a2a30;
	border-radius: var(--bs-block-border-radius);
	background: var(--bs-block-bg);
	overflow: hidden;
	color: #fff;
	text-decoration: none;

	&:hover .home-card-image,
	&:focus-visible .home-card-image {
		transform: scale(1.02);
		filter: brightness(1.6);
	}
}

.home-card-image {
	position: absolute;
	inset: 0;
	width: 100%;
	height: 100%;
	object-fit: cover;
	transition: transform 0.3s ease, filter 0.2s ease;
}

.home-card-body {
	position: relative;
	display: flex;
	flex-direction: column;
	justify-content: flex-end;
	gap: 4px;
	width: 100%;
	padding: 14px 18px;
	background: linear-gradient(to top, rgba(12, 12, 14, 0.94) 0%, rgba(12, 12, 14, 0.6) 55%, rgba(12, 12, 14, 0.2) 100%);
}

.home-card-title {
	margin: 0;
	font-size: 1.05rem;
	font-weight: 600;
	line-height: 1.3;
}

/* Clamped: a longer text must not push the title up over the art. */
.home-card-text {
	display: -webkit-box;
	-webkit-box-orient: vertical;
	-webkit-line-clamp: 2;
	line-clamp: 2;
	margin: 0;
	overflow: hidden;
	font-size: 0.85rem;
	line-height: 1.4;
	color: #c9ccd1;
}

@media (max-width: 991.98px) {
	.home-sections {
		grid-template-columns: minmax(0, 1fr);

		&::before {
			display: none;
		}
	}
}

@media (max-width: 575.98px) {
	.home-hero {
		margin-bottom: 12px;
	}

	.home-hero-text {
		padding-block: 44px 32px;
	}

	/* A narrow screen has no room for side fades. */
	.home-hero-art {
		height: 440px;
		-webkit-mask-image: linear-gradient(180deg, #000 0%, #000 30%, rgba(0, 0, 0, 0.6) 55%, rgba(0, 0, 0, 0.25) 75%, rgba(0, 0, 0, 0.06) 90%, transparent 100%);
		mask-image: linear-gradient(180deg, #000 0%, #000 30%, rgba(0, 0, 0, 0.6) 55%, rgba(0, 0, 0, 0.25) 75%, rgba(0, 0, 0, 0.06) 90%, transparent 100%);
	}

	.home-lead {
		font-size: 1rem;
	}

	.home-grid {
		grid-template-columns: minmax(0, 1fr);
		gap: 1rem;
	}
}

@media (prefers-reduced-motion: reduce) {
	.home-card-image {
		transition: none;
	}

	.home-card:hover .home-card-image {
		transform: none;
	}
}
</style>
