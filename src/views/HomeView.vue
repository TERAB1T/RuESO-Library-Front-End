<script setup lang="ts">
import { useHead } from '@unhead/vue';
import { RouterLink, useRoute, useRouter } from 'vue-router';

let metaTitle = 'RuESO | Всё о серии The Elder Scrolls';
let metaDescription = 'Библиотека книг ESO, модификация RuESO, база текстов всех игр The Elder Scrolls и не только.';
let metaLink = 'https://rueso.ru/';
let metaIcon = 'https://rueso.ru/public/img/main-card-rueso.jpg';

useHead({
	title: metaTitle,
	meta: [
		{ name: 'description', content: metaDescription },
		{ name: 'robots', content: 'index, follow' },

		{ name: 'og:title', content: metaTitle },
		{ name: 'og:description', content: metaDescription },
		{ name: 'og:image', content: metaIcon },
		{ name: 'og:url', content: metaLink },
		{ name: 'og:locale', content: 'ru_RU' },
		{ name: 'og:site_name', content: 'RuESO' },

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
		<div class="row row-cols-1 row-cols-md-3 g-4">
			<a href="https://elderscrolls.net/tes-online/rueso/" target="_blank" class="col">
				<div class="card h-100">
					<img src="/public/img/main-card-rueso.jpg" class="card-img-top" alt="Модификация RuESO">
					<div class="card-body">
						<h5 class="card-title">Модификация RuESO</h5>
						<p class="card-text">Модификация для The Elder Scrolls Online, которая содержит ряд полезных функций для тех, кто играет в ESO на русском.</p>
					</div>
				</div>
			</a>
			<RouterLink to="/library/eso" class="col">
				<div class="card h-100">
					<img src="/public/img/main-card-library.jpg" class="card-img-top" alt="Библиотека ESO">
					<div class="card-body">
						<h5 class="card-title">Библиотека ESO</h5>
						<p class="card-text">Полное собрание книг из The Elder Scrolls Online на русском и английском языках с разбивкой по категориям.</p>
					</div>
				</div>
			</RouterLink>
			<a href="https://furniture.rueso.ru" target="_blank" class="col">
				<div class="card h-100">
					<img src="/public/img/main-card-furniture.jpg" class="card-img-top" alt="Предметы обстановки ESO">
					<div class="card-body">
						<h5 class="card-title">Предметы обстановки ESO</h5>
						<p class="card-text">База предметов обстановки из The Elder Scrolls Online, которые можно разместить у себя в домах.</p>
					</div>
				</div>
			</a>
			<a href="https://elderscrolls.net/tes-online/crown-crates/" target="_blank" class="col">
				<div class="card h-100">
					<img src="/public/img/main-card-crowncrates.jpg" class="card-img-top" alt="Кронные ящики ESO">
					<div class="card-body">
						<h5 class="card-title">Кронные ящики ESO</h5>
						<p class="card-text">Содержимое кронных ящиков из The Elder Scrolls Online, которые можно приобрести в кронном магазине.</p>
					</div>
				</div>
			</a>
			<RouterLink to="/glossary" class="col">
				<div class="card h-100">
					<img src="/public/img/main-card-glossary.jpg" class="card-img-top" alt="База текстов TES">
					<div class="card-body">
						<h5 class="card-title">База текстов TES</h5>
						<p class="card-text">Полная база текстов всех игр серии The Elder Scrolls: от Skyrim и TES Online до Shadowkey и Castles.</p>
					</div>
				</div>
			</RouterLink>
		</div>
	</main>
</template>
