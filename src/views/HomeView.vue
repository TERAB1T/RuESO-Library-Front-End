<script setup lang="ts">
import { useHead } from '@unhead/vue';
import { RouterLink, useRoute, useRouter } from 'vue-router';

useHead({
	title: `RuESO`,
	meta: [
		{ name: 'description', content: 'Всё о серии The Elder Scrolls.' },
		{ name: 'robots', content: 'index, follow' },
	],
	link: [
		{ rel: 'canonical', href: 'https://rueso.ru/' }
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
			<RouterLink to="/library" class="col">
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
