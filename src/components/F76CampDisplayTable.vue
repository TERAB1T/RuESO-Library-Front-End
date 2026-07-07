<script setup lang="ts">
import { computed } from 'vue';
import type { DisplayInfo } from '@/types';

const props = defineProps<{
	display: DisplayInfo | null;
	lang: 'ru' | 'en';
}>();

const hasDisplay = computed(() => !!props.display && (props.display.allowed.length > 0 || props.display.excluded.length > 0));
const hasExcluded = computed(() => (props.display?.excluded.length ?? 0) > 0);

const pick = (ru: string | null | undefined, en: string | null | undefined) =>
	props.lang === 'ru' ? (ru || en) : (en || ru);

const t = computed(() => props.lang === 'ru'
	? {
		title: 'Витрина',
		intro: 'Этот предмет — витрина. В нее можно поместить:',
		excludedIntro: 'выставить',
		colItem: 'Категория',
		colCount: 'Макс. количество'
	}
	: {
		title: 'Display',
		intro: 'This item is a display case. It can hold:',
		excludedIntro: 'display',
		colItem: 'Category',
		colCount: 'Max amount'
	}
);
</script>

<template>
	<div v-if="hasDisplay" class="display-block">
		<div class="fo-sect-h">
			<span class="fo-bar"></span>
			<h3 class="fo-h3">{{ t.title }}</h3>
		</div>

		<p class="display-intro">{{ t.intro }}</p>

		<ul>
			<li v-for="entry in display?.allowed" :key="entry.formId">
				{{ pick(entry.ru, entry.en) }} — <span class="display-count">{{ entry.maxAmount }}{{ lang === 'ru' ? ' ед.' : '' }}</span>
			</li>
		</ul>

		<template v-if="hasExcluded">
			<p class="display-intro display-excluded-intro">
				<template v-if="lang === 'ru'">В нее <strong class="display-cannot">нельзя</strong> поместить:</template>
				<template v-else>The following <strong class="display-cannot">cannot</strong> be displayed here:</template>
			</p>

			<ul>
				<li v-for="entry in display?.excluded" :key="entry.formId">
					{{ pick(entry.ru, entry.en) }}
				</li>
			</ul>
		</template>
	</div>
</template>

<style scoped lang="scss">
.display-block {
	margin-top: 2.25rem;
}

.display-intro {
	font-size: 1.0325rem;
	line-height: 1.6;
	color: var(--bs-body-color);
}

.display-excluded-intro {
	margin-top: 1.5rem;
}

.display-count {
	font-weight: 400;
}
</style>
