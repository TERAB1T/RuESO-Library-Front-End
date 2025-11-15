<script setup lang="ts">
import { useHead } from '@unhead/vue';
import { RouterLink, useRoute, useRouter } from 'vue-router';

let metaTitle = 'RuESO | Всё о сериях TES и Fallout';
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
		{ rel: 'canonical', href: metaLink }
	]
});
</script>

<template>
	<main class="container-xl" style="margin: 20px auto;">
		<div class="row g-4 mb-4">
			<div class="col-12 col-md-6 col-lg-3">
				<a href="https://elderscrolls.net/tes-online/rueso/" target="_blank" class="card h-100 text-decoration-none main-page-card">
					<div class="card-img-wrapper">
						<img src="/public/img/main-card-rueso.jpg" class="card-img-top" alt="Модификация RuESO">
					</div>
					<div class="card-body">
						<h5 class="card-title">Модификация RuESO</h5>
						<p class="card-text">Модификация для The Elder Scrolls Online, которая содержит ряд полезных функций для тех, кто играет в ESO на русском.</p>
					</div>
				</a>
			</div>
			<div class="col-12 col-md-6 col-lg-3">
				<RouterLink to="/library/eso" class="card h-100 text-decoration-none main-page-card">
					<div class="card-img-wrapper">
						<img src="/public/img/main-card-library.jpg" class="card-img-top" alt="Библиотека ESO">
					</div>
					<div class="card-body">
						<h5 class="card-title">Библиотека ESO</h5>
						<p class="card-text">Полное собрание книг из The Elder Scrolls Online на русском и английском языках с разбивкой по категориям.</p>
					</div>
				</RouterLink>
			</div>

			<div class="col-12 col-md-6 col-lg-3"><a href="https://furniture.rueso.ru" target="_blank" class="card h-100 text-decoration-none main-page-card">
					<div class="card-img-wrapper">
						<img src="/public/img/main-card-furniture.jpg" class="card-img-top" alt="Предметы обстановки ESO">
					</div>
					<div class="card-body">
						<h5 class="card-title">Предметы обстановки ESO</h5>
						<p class="card-text">База предметов обстановки из The Elder Scrolls Online, которые можно разместить у себя в домах.</p>
					</div>
				</a></div>

			<div class="col-12 col-md-6 col-lg-3"><a href="https://elderscrolls.net/tes-online/crown-crates/" target="_blank" class="card h-100 text-decoration-none main-page-card">
					<div class="card-img-wrapper">
						<img src="/public/img/main-card-crowncrates.jpg" class="card-img-top" alt="Кронные ящики ESO">
					</div>
					<div class="card-body">
						<h5 class="card-title">Кронные ящики ESO</h5>
						<p class="card-text">Содержимое кронных ящиков из The Elder Scrolls Online, которые можно приобрести в кронном магазине.</p>
					</div>
				</a></div>

			<div class="col-12 col-md-6 col-lg-4">
				<RouterLink to="/glossary-tes" class="card h-100 text-decoration-none main-page-card">
					<div class="card-img-wrapper">
						<img src="/public/img/main-card-glossary.jpg" class="card-img-top" alt="База текстов TES">
					</div>
					<div class="card-body">
						<h5 class="card-title">База текстов TES</h5>
						<p class="card-text">Полная база текстов всех игр серии The Elder Scrolls: от Skyrim и TES Online до Shadowkey и Castles.</p>
					</div>
				</RouterLink>
			</div>

			<div class="col-12 col-md-6 col-lg-4">
				<RouterLink to="/glossary-fallout" class="card h-100 text-decoration-none main-page-card">
					<div class="card-img-wrapper">
						<img src="/public/img/main-card-fallout.jpg" class="card-img-top" alt="База текстов Fallout">
					</div>
					<div class="card-body">
						<h5 class="card-title">База текстов Fallout</h5>
						<p class="card-text">Полная база текстов всех игр серии Fallout: от Fallout 1 и Tactics до Shelter и Fallout 76.</p>
					</div>
				</RouterLink>
			</div>

			<div class="col-12 col-md-6 col-lg-4">
				<RouterLink to="/f76-atomic-shop" class="card h-100 text-decoration-none main-page-card">
					<div class="card-img-wrapper">
						<img src="/public/img/main-card-atomic-shop.jpg" class="card-img-top" alt="Атомная лавка Fallout 76">
					</div>
					<div class="card-body">
						<h5 class="card-title">Атомная лавка Fallout 76</h5>
						<p class="card-text">Полный каталог товаров, которые появлялись или появятся в Атомной лавке Fallout 76.</p>
					</div>
				</RouterLink>
			</div>

		</div>
	</main>
</template>

<style scoped lang="scss">
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
	padding: 0rem;
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
	font-size: 1rem;
	--bs-text-opacity: 1;
    color: var(--bs-secondary-color) !important;
}
</style>
