<script setup lang="ts">
import { RouterLink } from 'vue-router';
import { useHead } from '@unhead/vue';

useHead({
	title: `Страница не найдена | RuESO`,
	meta: [
		{ name: 'description', content: 'Всё о серии The Elder Scrolls.' },
    	{ name: 'robots', content: 'noindex, nofollow' },
	],
	link: [
		{ rel: 'canonical', href: 'https://rueso.ru/404' }
	]
});
</script>

<template>
	<div class="container d-flex justify-content-center align-items-center">
		<div class="error-container text-center py-5">
			<h1>404</h1>
			<h3>Страница не найдена</h3>
			<p>Возможно, вы ввели неправильный адрес или эта страница была удалена.</p>
			<RouterLink to="/" class="btn btn-primary mt-3">Вернуться на главную</RouterLink>
		</div>
	</div>
</template>

<style scoped>
.error-container {
	padding: 40px;
}

.error-container h1 {
	font-size: 120px;
}

.error-container p {
	margin-top: 30px;
	font-size: 18px;
}
</style>
