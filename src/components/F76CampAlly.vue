<script setup lang="ts">
import { computed } from 'vue';
import { prepareCampImage, atomicShopHandleImageError, pluralizeRu } from '@/utils';
import { useQueryClient } from '@tanstack/vue-query';
import { usePrefetchCampSubItem } from '@/composables/useApi';
import type { Ally, AllyStockCategory, AllyStockItem } from '@/types';

const props = defineProps<{
	ally: Ally | null;
	lang: 'ru' | 'en';
}>();

const emit = defineEmits<{ selectItem: [formId: string, name: string | null] }>();

const queryClient = useQueryClient();
const prefetchSubItem = (formId: string) => usePrefetchCampSubItem(queryClient, formId.replace(/^0x/i, ''));
const selectItem = (item: AllyStockItem) => emit('selectItem', item.formId.replace(/^0x/i, ''), pick(item.ru, item.en) ?? null);

const pick = (ru: string | null | undefined, en: string | null | undefined) =>
	props.lang === 'ru' ? (ru || en) : (en || ru);

const items = computed<AllyStockItem[]>(() =>
	(props.ally?.stock ?? [])
		.filter((r): r is AllyStockItem => r.kind === 'item')
		.sort((a, b) => b.probability - a.probability || (pick(a.ru, a.en) ?? '').localeCompare(pick(b.ru, b.en) ?? '')));

const categories = computed<AllyStockCategory[]>(() =>
	(props.ally?.stock ?? []).filter((r): r is AllyStockCategory => r.kind === 'category'));

const hasStock = computed(() => items.value.length > 0 || categories.value.length > 0);

const typeLabels: Record<string, { ru: string; en: string }> = {
	ALCH: { ru: 'Расходуемый предмет', en: 'Consumable' },
	FOOD: { ru: 'Пища', en: 'Food' },
	CHEM: { ru: 'Препарат', en: 'Chem' },
	DRINK: { ru: 'Напиток', en: 'Drink' },
	MAGAZINE: { ru: 'Журнал', en: 'Magazine' },
	MISC: { ru: 'Разное', en: 'Misc' },
	AMMO: { ru: 'Боеприпасы', en: 'Ammo' },
	WEAP: { ru: 'Оружие', en: 'Weapon' },
	ARMO: { ru: 'Броня', en: 'Armor' },
	BOOK: { ru: 'Записка', en: 'Note' },
	RECIPE: { ru: 'Схема или рецепт', en: 'Plan or recipe' },
	NOTE: { ru: 'Голозапись', en: 'Holotape' },
	HAT: { ru: 'Головной убор', en: 'Hat' },
};

const typeLabel = (type: string | null): string | null => {
	const entry = type ? typeLabels[type] : undefined;
	return entry ? (props.lang === 'ru' ? entry.ru : entry.en) : null;
};

const formIdToImageFilename = (formId: string) => {
	const numeric = parseInt(formId.replace(/^0x/i, ''), 16) & 0x00FFFFFF;
	return numeric.toString(16).padStart(8, '0') + '.webp';
};

const formatPercent = (probability: number) => {
	const percent = Math.round(probability * 10000) / 100;
	return props.lang === 'ru' ? `${percent.toLocaleString('ru-RU')}%` : `${percent}%`;
};

const t = computed(() => props.lang === 'ru'
	? {
		title: 'Ассортимент',
		intro: (name: string) => `${name} торгует за крышки. Шанс — вероятность, что предмет есть в продаже у персонажа 50+ уровня.`,
		colItem: 'Предмет', colType: 'Тип', colChance: 'Шанс',
		eventOnly: 'только во время события',
		category: (count: number) => `${count} ${pluralizeRu(count, ['предмет', 'предмета', 'предметов'])}`
	}
	: {
		title: 'Stock',
		intro: (name: string) => `${name} sells items for caps. Chance is the probability that an item is in stock for a level 50+ character.`,
		colItem: 'Item', colType: 'Type', colChance: 'Chance',
		eventOnly: 'only during an event',
		category: (count: number) => `${count} item${count === 1 ? '' : 's'}`
	}
);
</script>

<template>
	<div v-if="ally && hasStock" class="stock-block">
		<div class="fo-sect-h">
			<span class="fo-bar"></span>
			<h3 class="fo-h3">{{ t.title }}</h3>
		</div>

		<p class="stock-intro">{{ t.intro(pick(ally.name.ru, ally.name.en) || '—') }}</p>

		<table class="stock-table">
			<thead>
				<tr>
					<th>{{ t.colItem }}</th>
					<th class="stock-th-type">{{ t.colType }}</th>
					<th class="stock-th-chance">{{ t.colChance }}</th>
				</tr>
			</thead>
			<tbody>
				<tr v-for="item in items" :key="item.formId" class="stock-row stock-row-clickable"
					@click="selectItem(item)" @mouseenter="prefetchSubItem(item.formId)">
					<td class="stock-td-item">
						<img :src="prepareCampImage(formIdToImageFilename(item.formId), 100)" class="stock-icon" :alt="pick(item.ru, item.en) || ''" loading="lazy" @error="atomicShopHandleImageError">
						<div class="stock-item-text">
							<button type="button" class="stock-name" @click.stop="selectItem(item)">{{ pick(item.ru, item.en) }}</button>
							<span v-if="item.eventOnly" class="stock-note">{{ t.eventOnly }}</span>
						</div>
					</td>
					<td class="stock-td-type">{{ typeLabel(item.type) }}</td>
					<td class="stock-td-chance">{{ formatPercent(item.probability) }}</td>
				</tr>
				<tr v-for="category in categories" :key="`${category.en}`" class="stock-row stock-row-category">
					<td class="stock-td-item">
						<span class="stock-category-name">{{ pick(category.ru, category.en) }}</span>
						<span class="stock-category-count">— {{ t.category(category.count) }}</span>
					</td>
					<td class="stock-td-type"></td>
					<td class="stock-td-chance"></td>
				</tr>
			</tbody>
		</table>
	</div>
</template>

<style scoped lang="scss">
.stock-block {
	margin-top: 2.25rem;
}

.stock-intro {
	font-size: 1.0325rem;
	line-height: 1.6;
	margin-bottom: 1rem;
}

.stock-table {
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

	.stock-th-type {
		width: 9rem;
	}

	.stock-th-chance {
		text-align: right;
		width: 4.5rem;
	}
}

.stock-row td {
	padding: 0.45rem 0.5rem;
	border-bottom: 1px solid rgba(255, 255, 255, 0.06);
}

.stock-row-clickable {
	cursor: pointer;

	&:hover {
		background: rgba(255, 255, 255, 0.02);
	}

	&:hover .stock-name {
		color: var(--bs-link-hover-color);
		text-decoration: underline;
	}
}

.stock-row-category td {
	background: rgba(255, 255, 255, 0.05);
}

.stock-td-item {
	display: flex;
	align-items: center;
	gap: 0.6rem;
	min-width: 0;
}

.stock-item-text {
	display: flex;
	flex-direction: column;
	min-width: 0;
	line-height: 1.15;
}

.stock-icon {
	width: 32px;
	height: 32px;
	object-fit: contain;
	flex-shrink: 0;
	border-radius: 4px;
}

.stock-name {
	min-width: 0;
	padding: 0;
	border: 0;
	background: none;
	color: var(--bs-link-color);
	text-align: left;
	font-size: 0.875rem;
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
}

.stock-note {
	font-size: 0.7rem;
	color: #a1a1aa;
	font-style: italic;
	line-height: 1;
	margin-top: 0.1rem;
}

.stock-category-name {
	font-weight: 600;
	font-size: 0.875rem;
	color: var(--bs-body-color);
}

.stock-category-count {
	font-size: 0.875rem;
	color: #a1a1aa;
}

.stock-td-type {
	font-size: 0.875rem;
	color: #a1a1aa;
	white-space: nowrap;
}

.stock-td-chance {
	text-align: right;
	font-weight: 600;
	font-size: 0.875rem;
	color: var(--bs-body-color);
	white-space: nowrap;
}

@media (max-width: 767.98px) {
	.stock-name {
		white-space: normal;
	}

	.stock-th-type,
	.stock-td-type {
		display: none;
	}
}
</style>
