<script setup lang="ts">
import { computed } from 'vue';
import { prepareCampImage, atomicShopHandleImageError } from '@/utils';
import { useQueryClient } from '@tanstack/vue-query';
import { usePrefetchCampSubItem } from '@/composables/useApi';
import type { CampGivenItem } from '@/types';

const props = defineProps<{
	items: CampGivenItem[] | null;
	lang: 'ru' | 'en';
}>();

const emit = defineEmits<{ selectItem: [formId: string, name: string | null] }>();

const queryClient = useQueryClient();
const prefetchSubItem = (formId: string) => usePrefetchCampSubItem(queryClient, formId.replace(/^0x/i, ''));

const typeLabels: Record<string, [ru: string, en: string]> = {
	ARMO: ['Броня', 'Armor'],
	HAT: ['Головной убор', 'Hat'],
	WEAP: ['Оружие', 'Weapon'],
	ALCH: ['Расходуемый предмет', 'Consumable'],
	FOOD: ['Пища', 'Food'],
	CHEM: ['Препарат', 'Chem'],
	DRINK: ['Напиток', 'Drink'],
	MISC: ['Разное', 'Misc'],
	AMMO: ['Боеприпасы', 'Ammo'],
	BOOK: ['Записка', 'Note'],
	RECIPE: ['Схема или рецепт', 'Plan or recipe'],
	NOTE: ['Голозапись', 'Holotape'],
};

const ru = computed(() => props.lang === 'ru');
const pick = (ruText: string | null | undefined, enText: string | null | undefined) =>
	ru.value ? (ruText || enText) : (enText || ruText);

const typeLabel = (type: string | null) => {
	const pair = type ? typeLabels[type] : undefined;
	return pair ? (ru.value ? pair[0] : pair[1]) : null;
};

const formIdToImageFilename = (formId: string) => {
	const numeric = parseInt(formId.replace(/^0x/i, ''), 16) & 0x00FFFFFF;
	return numeric.toString(16).padStart(8, '0') + '.webp';
};

const select = (item: CampGivenItem) => emit('selectItem', item.formId.replace(/^0x/i, ''), pick(item.ru, item.en) ?? null);
</script>

<template>
	<div v-if="items && items.length > 0" class="gives-block">
		<div class="fo-sect-h">
			<span class="fo-bar"></span>
			<h3 class="fo-h3">{{ ru ? 'Взаимодействие' : 'Interaction' }}</h3>
		</div>

		<p class="gives-text">{{ ru ? 'При первом взаимодействии с этим объектом игрок получает:' : 'The first interaction with this object gives the player:' }}</p>
		<table class="gives-table sticky-thead">
			<thead>
				<tr>
					<th>{{ ru ? 'Предмет' : 'Item' }}</th>
					<th class="gives-th-type">{{ ru ? 'Тип' : 'Type' }}</th>
					<th class="gives-th-count">{{ ru ? 'Кол-во' : 'Qty' }}</th>
				</tr>
			</thead>
			<tbody>
				<tr v-for="item in items" :key="item.formId" class="gives-row" @click="select(item)" @mouseenter="prefetchSubItem(item.formId)">
					<td class="gives-td-item">
						<img :src="prepareCampImage(formIdToImageFilename(item.formId), 100)" class="gives-icon" width="32" height="32" :alt="pick(item.ru, item.en) || ''" loading="lazy" @error="atomicShopHandleImageError">
						<button type="button" class="gives-name" @click.stop="select(item)">{{ pick(item.ru, item.en) }}</button>
					</td>
					<td class="gives-td-type">{{ typeLabel(item.type) }}</td>
					<td class="gives-td-count">{{ item.count }}</td>
				</tr>
			</tbody>
		</table>
	</div>
</template>

<style scoped lang="scss">
.gives-block {
	margin-top: 2.25rem;
}

.gives-text {
	font-size: 1.0325rem;
	line-height: 1.6;
	color: var(--bs-body-color);
}

.gives-table {
	width: 100%;
	border-collapse: collapse;

	th {
		text-align: left;
		font-size: 0.7rem;
		text-transform: uppercase;
		letter-spacing: 0.03em;
		color: #a1a1aa;
		font-weight: 600;
		padding: 0.4rem 0.5rem;
		border-bottom: 1px solid rgba(255, 255, 255, 0.1);
	}

	.gives-th-count {
		text-align: right;
		width: 4.5rem;
	}
}

.gives-th-type {
	width: 12rem;
}

.gives-row {
	cursor: pointer;

	td {
		padding: 0.45rem 0.5rem;
		border-bottom: 1px solid rgba(255, 255, 255, 0.06);
	}

	&:hover {
		background: rgba(255, 255, 255, 0.02);
	}

	&:hover .gives-name {
		color: var(--bs-link-hover-color);
		text-decoration: underline;
	}
}

.gives-td-item {
	display: flex;
	align-items: center;
	gap: 0.6rem;
	min-width: 0;
}

.gives-icon {
	width: 32px;
	height: 32px;
	object-fit: contain;
	flex-shrink: 0;
	border-radius: 4px;
}

.gives-name {
	min-width: 0;
	padding: 0;
	border: 0;
	background: none;
	font-size: 0.875rem;
	color: var(--bs-link-color);
	text-align: left;
}

.gives-td-type {
	font-size: 0.875rem;
	color: #a1a1aa;
	white-space: nowrap;
}

.gives-td-count {
	text-align: right;
	font-size: 0.8rem;
	color: #a1a1aa;
	white-space: nowrap;
}

@media (max-width: 767.98px) {
	.gives-th-type,
	.gives-td-type {
		display: none;
	}
}
</style>
