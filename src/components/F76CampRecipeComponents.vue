<script setup lang="ts">
import { computed } from 'vue';
import { prepareCampImage, atomicShopHandleImageError } from '@/utils';
import type { RecipeComponent } from '@/types';

const props = defineProps<{
	components: RecipeComponent[];
}>();

const hasComponents = computed(() => props.components && props.components.length > 0);

const formIdToImageFilename = (formId: string) => {
	const numeric = parseInt(formId.replace(/^0x/i, ''), 16) & 0x00FFFFFF;
	return numeric.toString(16).padStart(8, '0') + '.webp';
};
</script>

<template>
	<div v-if="hasComponents" class="recipe-components-block">
		<h5 class="h5-list-group-item">Компоненты</h5>
		<table class="recipe-components-table">
			<tbody>
				<tr v-for="comp in components" :key="comp.formId">
					<td class="recipe-components-icon-cell">
						<img
							:src="prepareCampImage(formIdToImageFilename(comp.formId), 100)"
							class="recipe-components-icon"
							:alt="comp.nameRu || comp.nameEn || ''"
							loading="lazy"
							@error="atomicShopHandleImageError"
						>
					</td>
					<td class="recipe-components-name">{{ comp.nameRu || comp.nameEn || comp.editorId || '—' }}</td>
					<td class="recipe-components-count">{{ comp.count }}</td>
				</tr>
			</tbody>
		</table>
	</div>
</template>

<style scoped lang="scss">
.h5-list-group-item {
	padding: 0 0 20px;
	font-size: 1.125rem;
	text-align: center;
	border-bottom: 1px solid rgba(255, 255, 255, .1);
	background: none;
}

.recipe-components-block {
	margin-top: 1.5rem;
}

.recipe-components-table {
	width: 100%;
	border-collapse: collapse;
}

.recipe-components-table td {
	padding: 0.4rem 0;
	font-size: 0.875rem;
	border-bottom: 1px solid rgba(255, 255, 255, 0.06);
	vertical-align: middle;
}

.recipe-components-table tr:last-child td {
	border-bottom: none;
}

.recipe-components-icon-cell {
	width: 40px;
	padding-right: 0.6rem;
}

.recipe-components-icon {
	width: 32px;
	height: 32px;
	object-fit: contain;
	border-radius: 6px;
	display: block;
}

.recipe-components-name {
	color: var(--bs-body-color);
}

.recipe-components-count {
	color: #a1a1aa;
	font-weight: 600;
	text-align: right;
	white-space: nowrap;
	width: 3rem;
}
</style>
