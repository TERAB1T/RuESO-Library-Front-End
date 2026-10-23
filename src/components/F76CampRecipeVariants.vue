<script setup lang="ts">
import { computed } from 'vue';
import F76CampItemCards from '@/components/F76CampItemCards.vue';

import type { RecipeInfo, RecipeSiblingItem } from '@/types';

const props = defineProps<{
	recipe: RecipeInfo | null;
	recipeItems: RecipeSiblingItem[];
	lang: 'ru' | 'en';
}>();

const hasVariants = computed(() => props.recipeItems.length > 0 && !!props.recipe);

const pick = (ru: string | null | undefined, en: string | null | undefined) =>
	props.lang === 'ru' ? (ru || en) : (en || ru);

const recipeName = computed(() => pick(props.recipe?.nameRu, props.recipe?.nameEn) || props.recipe?.editorId || '');

const t = computed(() => props.lang === 'ru'
	? { title: 'Варианты' }
	: { title: 'Variants' }
);
</script>

<template>
	<div v-if="hasVariants" class="recipe-variants-block">
		<div class="fo-sect-h">
			<span class="fo-bar"></span>
			<h3 class="fo-h3">{{ t.title }}</h3>
		</div>

		<div class="recipe-variants-subtitle">
			<template v-if="lang === 'ru'">
				Этот объект относится к группе «<strong>{{ recipeName }}</strong>». В нее также {{ recipeItems.length === 1 ? 'входит' : 'входят' }}:
			</template>
			<template v-else>
				This object belongs to the “<strong>{{ recipeName }}</strong>” group. It also includes:
			</template>
		</div>

		<F76CampItemCards :items="recipeItems" :lang="lang" />
	</div>
</template>

<style scoped lang="scss">
.recipe-variants-block {
	margin-top: 2.25rem;
}

.recipe-variants-subtitle {
	font-size: 1.0325rem;
	line-height: 1.6;
	margin-bottom: 1.3rem;
}
</style>
