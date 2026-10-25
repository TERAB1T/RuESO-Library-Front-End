<script setup lang="ts">
import { computed } from 'vue';
import type { CampWeatherInfo } from '@/types';

const props = defineProps<{
	weather: CampWeatherInfo | null;
	lang: 'ru' | 'en';
}>();

// Fishing loot lists only tell radstorm-like and rainy C.A.M.P. weather apart; sandstorm and the rest fish like clear weather.
const FISHING_WEATHER = {
	radiation: { ru: 'во время радиоактивной бури или в зоне ядерного удара', en: 'during a radstorm or in a nuke zone' },
	rain: { ru: 'во время дождя', en: 'in the rain' },
	sandstorm: { ru: 'в ясную погоду', en: 'in clear weather' },
	other: { ru: 'в ясную погоду', en: 'in clear weather' },
} as const;

const t = computed(() => props.lang === 'ru'
	? {
		title: 'Погода',
		fishing: 'В области действия этой станции шансы поймать ту или иную рыбу такие же, как ',
		sandstorm: 'Кроме того, здесь засчитываются испытания на ловлю рыбы во время песчаной бури.',
		intenseEffects: 'Визуальные эффекты погоды этой станции можно ослабить, отключив параметр «Показывать эффекты экстремальной погоды» (Настройки → Игра).',
	}
	: {
		title: 'Weather',
		fishing: 'Within this station\'s area, the chances of catching each kind of fish are the same as ',
		sandstorm: 'Fishing challenges that require a sandstorm also count here.',
		intenseEffects: 'This station\'s weather effects can be toned down by turning off "Show Intense Weather Effects" (Settings → Game).',
	}
);
</script>

<template>
	<div v-if="weather" class="weather-block">
		<div class="fo-sect-h">
			<span class="fo-bar"></span>
			<h3 class="fo-h3">{{ t.title }}</h3>
		</div>

		<div class="weather-text">
			<p>
				{{ t.fishing }}<strong>{{ FISHING_WEATHER[weather.type][lang] }}</strong>.
				<template v-if="weather.type === 'sandstorm'">{{ t.sandstorm }}</template>
			</p>
			<p v-if="weather.intenseEffects">{{ t.intenseEffects }}</p>
		</div>
	</div>
</template>

<style scoped lang="scss">
.weather-block {
	margin-top: 2.25rem;
}

.weather-text {
	font-size: 1.0325rem;
	line-height: 1.6;
}
</style>
