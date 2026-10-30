<script setup lang="ts">
import { computed, ref } from 'vue';
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome';
import { faChevronDown, faChevronRight } from '@fortawesome/free-solid-svg-icons';
import { prepareCampImage, atomicShopHandleImageError, pluralizeRu, formatDurationSeconds } from '@/utils';
import { useQueryClient } from '@tanstack/vue-query';
import { usePrefetchCampSubItem } from '@/composables/useApi';
import type { Ally, AllyBuffMode, AllyStockCategory, AllyStockItem } from '@/types';

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

const name = computed(() => props.ally ? pick(props.ally.name.ru, props.ally.name.en) || '—' : '—');

const items = computed<AllyStockItem[]>(() =>
	(props.ally?.stock ?? [])
		.filter((r): r is AllyStockItem => r.kind === 'item')
		.sort((a, b) => b.probability - a.probability || (pick(a.ru, a.en) ?? '').localeCompare(pick(b.ru, b.en) ?? '')));

const categories = computed<AllyStockCategory[]>(() =>
	(props.ally?.stock ?? []).filter((r): r is AllyStockCategory => r.kind === 'category'));

const hasStock = computed(() => items.value.length > 0 || categories.value.length > 0);

const stockExpanded = ref(false);

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

const INSTANT_DURATION_MAX = 1;

const formatDuration = (duration: number): string | null =>
	duration > INSTANT_DURATION_MAX ? formatDurationSeconds(duration, props.lang) : null;

const buffs = computed(() => {
	const allyBuffs = props.ally?.buffs;
	if (!allyBuffs) return null;

	return {
		header: t.value.buffsHeader[allyBuffs.mode](name.value),
		options: allyBuffs.options.map((option, index) => {
			const { buff } = option;
			// A shared duration is shown once next to the buff name; meals mix instant and timed effects.
			const sharedDuration = buff.effects.every(e => e.duration === buff.effects[0]?.duration);
			const label = option.timeOfDay
				? t.value.timeOfDay[option.timeOfDay]
				: option.payment ? option.payment.map(i => pick(i.ru, i.en)).join(', ') : null;

			return {
				key: `${buff.spellFormId}-${index}`,
				label,
				name: pick(buff.name.ru, buff.name.en) || '—',
				duration: sharedDuration ? formatDuration(buff.effects[0]?.duration ?? 0) : null,
				effects: buff.effects.map(e => ({
					description: pick(e.description.ru, e.description.en) || '—',
					duration: sharedDuration ? null : formatDuration(e.duration)
				}))
			};
		})
	};
});

const t = computed(() => props.lang === 'ru'
	? {
		title: 'Союзник',
		tradeTitle: 'Торговля',
		intro: 'При установке этого объекта в вашей C.A.M.P. появляется союзник:',
		romance: (female: boolean) => `С ${female ? 'ней' : 'ним'} можно завести роман.`,
		buffsHeader: {
			single: (allyName: string) => `${allyName} может наложить на вас эффект:`,
			random: (allyName: string) => `${allyName} может наложить на вас один из следующих эффектов (выбирается случайно):`,
			timeOfDay: (allyName: string) => `${allyName} может наложить на вас эффект:`,
			payment: (allyName: string) => `${allyName} может наложить на вас эффект в обмен на предмет:`,
			services: (allyName: string) => `${allyName} оказывает услуги за крышки:`
		} as Record<AllyBuffMode, (allyName: string) => string>,
		timeOfDay: { day: 'Днем', night: 'Ночью' },
		vendor: (vendorName: string) => `${vendorName} продает товары за крышки.`,
		showStock: 'Показать ассортимент',
		hideStock: 'Скрыть ассортимент',
		colItem: 'Предмет', colType: 'Тип', colPrice: 'Цена', colChance: 'Шанс',
		chanceNote: 'Шанс — вероятность, что предмет появится в продаже для персонажа 50+ уровня.',
		eventOnly: 'только во время события',
		caps: 'крышек',
		category: (count: number) => `${count} ${pluralizeRu(count, ['предмет', 'предмета', 'предметов'])}`
	}
	: {
		title: 'Ally',
		tradeTitle: 'Trade',
		intro: 'When you place this object in your C.A.M.P., an ally appears:',
		romance: (female: boolean) => `You can romance ${female ? 'her' : 'him'}.`,
		buffsHeader: {
			single: (allyName: string) => `${allyName} can give you an effect:`,
			random: (allyName: string) => `${allyName} can give you one of the following effects (chosen at random):`,
			timeOfDay: (allyName: string) => `${allyName} can give you an effect:`,
			payment: (allyName: string) => `${allyName} can give you an effect in exchange for an item:`,
			services: (allyName: string) => `${allyName} offers services for caps:`
		} as Record<AllyBuffMode, (allyName: string) => string>,
		timeOfDay: { day: 'By day', night: 'At night' },
		vendor: (vendorName: string) => `${vendorName} sells goods for caps.`,
		showStock: 'Show stock',
		hideStock: 'Hide stock',
		colItem: 'Item', colType: 'Type', colPrice: 'Price', colChance: 'Chance',
		chanceNote: 'Chance is the probability that an item appears in stock for a level 50+ character.',
		eventOnly: 'only during an event',
		caps: 'caps',
		category: (count: number) => `${count} item${count === 1 ? '' : 's'}`
	}
);
</script>

<template>
	<div v-if="ally" class="ally-block">
		<div class="fo-sect-h">
			<span class="fo-bar"></span>
			<h3 class="fo-h3">{{ t.title }}</h3>
		</div>

		<p class="ally-text">{{ t.intro }} <strong>{{ name }}</strong>.{{ ally.hasRomance ? ` ${t.romance(ally.female)}` : '' }}</p>

		<template v-if="buffs">
			<p class="ally-text">{{ buffs.header }}</p>

			<ul class="ally-buffs">
				<li v-for="buff in buffs.options" :key="buff.key">
					<span v-if="buff.label" class="ally-buff-muted">{{ buff.label }}: </span>
					<span class="ally-buff-name">{{ buff.name }}</span>
					<span v-if="buff.duration" class="ally-buff-muted"> ({{ buff.duration }})</span>

					<ul class="ally-buff-effects">
						<li v-for="(effect, ei) in buff.effects" :key="ei">
							{{ effect.description }}
							<span v-if="effect.duration" class="ally-buff-muted">({{ effect.duration }})</span>
						</li>
					</ul>
				</li>
			</ul>
		</template>
	</div>

	<div v-if="ally?.isVendor" class="ally-block">
		<div class="fo-sect-h">
			<span class="fo-bar"></span>
			<h3 class="fo-h3">{{ t.tradeTitle }}</h3>
		</div>

		<p class="ally-text">{{ t.vendor(name) }}</p>

		<button v-if="hasStock" type="button" class="stock-toggle" :aria-expanded="stockExpanded" @click="stockExpanded = !stockExpanded">
			<FontAwesomeIcon :icon="stockExpanded ? faChevronDown : faChevronRight" class="stock-toggle-icon" size="sm" />
			{{ stockExpanded ? t.hideStock : t.showStock }}
		</button>

		<table v-if="hasStock" v-show="stockExpanded" class="stock-table sticky-thead">
			<thead>
				<tr>
					<th>{{ t.colItem }}</th>
					<th class="stock-th-type">{{ t.colType }}</th>
					<th class="stock-th-price">{{ t.colPrice }}</th>
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
					<td class="stock-td-price">
						<span v-if="item.value != null" class="stock-caps">{{ item.value }}<span class="visually-hidden"> {{ t.caps }}</span></span>
					</td>
					<td class="stock-td-chance">{{ formatPercent(item.probability) }}</td>
				</tr>
				<tr v-for="category in categories" :key="`${category.en}`" class="stock-row stock-row-category">
					<td class="stock-td-item">
						<span class="stock-category-name">{{ pick(category.ru, category.en) }}</span>
						<span class="stock-category-count">— {{ t.category(category.count) }}</span>
					</td>
					<td class="stock-td-type"></td>
					<td class="stock-td-price"></td>
					<td class="stock-td-chance"></td>
				</tr>
			</tbody>
		</table>

		<p v-if="items.length" v-show="stockExpanded" class="stock-footnote">{{ t.chanceNote }}</p>
	</div>
</template>

<style scoped lang="scss">
.ally-block {
	margin-top: 2.25rem;
}

.ally-text {
	font-size: 1.0325rem;
	line-height: 1.6;
	margin-bottom: 0.6rem;
}

.ally-buffs {
	margin: 0 0 1rem;
	padding-left: 1.5rem;
	font-size: 1.0325rem;
	line-height: 1.6;

	> li {
		margin-bottom: 0.35rem;

		&:last-child {
			margin-bottom: 0;
		}
	}
}

.ally-buff-name {
	font-weight: 600;
	color: var(--bs-body-color);
}

.ally-buff-muted {
	color: #a1a1aa;
}

.ally-buff-effects {
	margin: 0.1rem 0 0;
	padding-left: 1.5rem;
	list-style-type: circle;
	color: var(--bs-body-color);
}

.stock-toggle {
	display: inline-flex;
	align-items: center;
	gap: 0.4rem;
	padding: 0;
	border: 0;
	background: none;
	color: var(--bs-link-color);
	font-size: 0.95rem;

	&:hover {
		color: var(--bs-link-hover-color);
		text-decoration: underline;
	}
}

.stock-toggle-icon {
	width: 0.75rem;
}

.stock-table {
	width: 100%;
	margin-top: 0.6rem;
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

	.stock-th-price {
		text-align: right;
		width: 5rem;
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

.stock-td-price,
.stock-td-chance {
	text-align: right;
	font-size: 0.875rem;
	color: var(--bs-body-color);
	white-space: nowrap;
}

.stock-td-chance {
	font-weight: 600;
}

.stock-caps::after {
	content: '';
	display: inline-block;
	width: 1.1rem;
	height: 1rem;
	background: url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="-4.9 -2.55 62.25 55.65"><path fill="%23ffffcb" d="M36.6 19.2 Q40.9 19.2 41.55 13.35 41.55 7.4 35.75 7.4 L32.85 7.4 Q23.4 7.4 12.05 22.5 9.15 27.1 9.15 31.75 L9.15 32.8 Q9.15 43.15 21.25 43.15 28.3 43.15 36.6 32.8 36.15 32.2 36.15 31.75 L35.75 31.75 Q27.75 38.7 23.3 38.7 L22.95 38.7 Q17.6 38.7 16.65 32.5 L16.65 30.65 Q16.65 21.45 29.95 11.45 31.35 10.75 32.45 10.75 L33.3 10.75 Q33.75 10.75 34.5 11.85 32.45 15.25 32.45 17.0 33.5 19.2 36.15 19.2 L36.6 19.2 M53.6 18.45 Q53.6 21.6 57.35 24.75 L57.35 25.85 Q53.6 29.2 53.6 32.5 L54.85 36.15 Q54.85 37.2 50.25 39.1 47.35 41.65 47.35 45.75 46.7 46.55 41.15 46.8 38.8 47.8 36.15 51.65 L34.1 52.0 Q34.1 50.9 28.65 50.5 27.25 50.5 23.75 53.1 L22.05 53.1 Q18.6 49.45 16.25 49.45 L10.4 49.8 Q9.65 49.1 7.5 44.65 5.15 42.85 0.45 42.05 L0.1 40.95 0.45 37.65 Q-0.1 34.2 -4.5 31.75 -4.9 31.1 -4.9 30.3 -2.9 28.15 -2.9 26.6 L-2.9 24.0 Q-2.9 23.15 -4.9 20.0 L-0.35 15.15 Q0.45 13.75 0.45 12.65 L0.1 9.25 Q1.6 8.25 6.25 7.1 8.45 5.15 9.6 1.6 L11.3 0.8 Q12.75 1.6 14.6 1.6 18.4 1.6 22.05 -2.15 L23.75 -2.55 Q23.75 -1.1 28.65 0.1 L30.75 0.1 34.9 -1.1 35.75 -1.1 Q39.8 4.1 43.2 4.1 L46.15 4.1 Q47.55 4.1 48.6 10.05 52.05 13.35 54.45 13.35 L54.85 15.15 Q53.6 17.5 53.6 18.45"/></svg>') no-repeat center / contain;
	margin-left: 4px;
	vertical-align: middle;
	position: relative;
	top: -1px;
}

.stock-footnote {
	margin-top: 0.6rem;
	font-size: 0.8rem;
	color: #a1a1aa;
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
