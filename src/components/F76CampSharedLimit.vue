<script setup lang="ts">
import { RouterLink } from 'vue-router';
import { computed } from 'vue';
import { useQueryClient } from '@tanstack/vue-query';
import { pluralizeRu } from '@/utils';
import { usePrefetchCampCategory } from '@/composables/useApi';
import F76CampItemCards from '@/components/F76CampItemCards.vue';

import type { CampSharedLimit } from '@/types';

const props = defineProps<{
	sharedLimit: CampSharedLimit | null;
	lang: 'ru' | 'en';
}>();

const hasList = computed(() => (props.sharedLimit?.items.length ?? 0) > 0);

const categories = computed(() => props.sharedLimit?.categories ?? []);

const pick = (ru: string | null | undefined, en: string | null | undefined) =>
	props.lang === 'ru' ? (ru || en) : (en || ru);

const queryClient = useQueryClient();
const prefetchCategory = (formId: string) => usePrefetchCampCategory(queryClient, formId);

const t = computed(() => {
	const n = props.sharedLimit?.total ?? 0;
	const end = categories.value.length > 0 ? ':' : '.';
	return props.lang === 'ru'
		? {
			title: 'Общий лимит строительства',
			listIntro: n === 1
				? 'У этого объекта общий лимит строительства со следующим объектом:'
				: 'У этого объекта общий лимит строительства со следующими объектами:',
			countIntro: `У этого объекта общий лимит строительства еще с ${n} ${pluralizeRu(n, ['объектом', 'объектами', 'объектами'])}`
				+ (categories.value.length > 0 ? ` из ${categories.value.length === 1 ? 'категории' : 'категорий'}${end}` : end)
		}
		: {
			title: 'Shared build limit',
			listIntro: n === 1
				? 'This object shares its build limit with the following object:'
				: 'This object shares its build limit with the following objects:',
			countIntro: `This object shares its build limit with ${n} other ${n === 1 ? 'object' : 'objects'}`
				+ (categories.value.length > 0 ? ` from the ${categories.value.length === 1 ? 'category' : 'categories'}${end}` : end)
		};
});
</script>

<template>
	<div v-if="sharedLimit" class="shared-limit-block">
		<div class="fo-sect-h">
			<span class="fo-bar"></span>
			<h3 class="fo-h3">{{ t.title }}</h3>
		</div>

		<div class="shared-limit-subtitle" :class="{ 'is-last': !hasList }">
			<template v-if="hasList">{{ t.listIntro }}</template>
			<template v-else>
				{{ t.countIntro }}
				<template v-for="(category, index) in categories" :key="category.formId">
					<RouterLink :to="`/f76-camp/category/${category.formId}-${category.slug}`" @mouseenter="prefetchCategory(category.formId)">{{ pick(category.nameRu, category.nameEn) }}</RouterLink> ({{ category.count }})<template v-if="index < categories.length - 1">, </template><template v-else>.</template>
				</template>
			</template>
		</div>

		<F76CampItemCards v-if="hasList" :items="sharedLimit.items" :lang="lang" />
	</div>
</template>

<style scoped lang="scss">
.shared-limit-block {
	margin-top: 2.25rem;
}

.shared-limit-subtitle {
	font-size: 1.0325rem;
	line-height: 1.6;
	margin-bottom: 1.3rem;

	&.is-last {
		margin-bottom: 0;
	}
}
</style>
