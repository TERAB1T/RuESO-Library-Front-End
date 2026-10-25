<script setup lang="ts">
import { computed } from 'vue';
import { prepareCampImage, atomicShopHandleImageError, pluralizeRu, formatDurationSeconds } from '@/utils';

import { useQueryClient } from '@tanstack/vue-query';
import { usePrefetchCampSubItem } from '@/composables/useApi';
import type { CampStorageInfo } from '@/types';

const props = defineProps<{
	storage: CampStorageInfo | null;
	spoilRate: number | null;
	// only one such object can be built, so there is nothing for the capacity to be shared with
	unique?: boolean;
	lang: 'ru' | 'en';
}>();

const emit = defineEmits<{ selectItem: [formId: string, name: string | null] }>();

const queryClient = useQueryClient();
const prefetchSubItem = (formId: string) => usePrefetchCampSubItem(queryClient, formId.replace(/^0x/i, ''));

type Layout = 'text' | 'lists' | 'table';

interface GroupText {
	layout: Layout;
	title: [ru: string, en: string];
	// "for all … in the C.A.M.P." in the capacity sentence; absent when only one such object can be built
	pool?: [ru: string, en: string];
	// lead-in for the lists and the table
	intro?: [ru: string, en: string];
	// dispensers hand out to other players
	shared?: [ru: string, en: string];
	// rechargers: what they charge, "up to N …"
	cores?: [ru: string, en: string];
}

const GROUPS: Record<string, GroupText> = {
	Refrigerator: { layout: 'text', title: ['Хранение продуктов', 'Food Storage'], pool: ['всех холодильников', 'all refrigerators'] },
	Cryo_Freezer: { layout: 'text', title: ['Хранение продуктов', 'Food Storage'] },
	Fermenter: { layout: 'text', title: ['Брожение', 'Fermentation'], pool: ['всех бродильных чанов', 'all fermenters'] },
	Dispenser_Alcohol: {
		layout: 'lists', title: ['Раздача напитков', 'Drink Dispenser'], pool: ['всех бочек и чаш для пунша', 'all kegs and punch bowls'],
		intro: ['Этот объект — раздатчик напитков. В него можно поместить:', 'This object is a drink dispenser. It can hold:'],
		shared: ['Другие игроки могут брать из него напитки.', 'Other players can take drinks from it.'],
	},
	Dispenser_NukaColaVending: {
		layout: 'lists', title: ['Раздача напитков', 'Drink Dispenser'], pool: ['всех автоматов "Ядер-колы"', 'all Nuka-Cola machines'],
		intro: ['Этот объект — раздатчик напитков. В него можно поместить:', 'This object is a drink dispenser. It can hold:'],
		shared: ['Другие игроки могут брать из него напитки.', 'Other players can take drinks from it.'],
	},
	Dispenser_Candy: {
		layout: 'table', title: ['Раздача сладостей', 'Candy Dispenser'], pool: ['всех мисок для сладостей', 'all candy bowls'],
		intro: ['В миску можно положить:', 'The bowl can hold:'],
		shared: ['Другие игроки могут брать из нее сладости.', 'Other players can take candy from it.'],
	},
	Recharger_FusionCore: { layout: 'text', title: ['Зарядка', 'Recharging'], cores: ['ядерных блоков', 'fusion cores'] },
	Recharger_PlasmaCore: { layout: 'text', title: ['Зарядка', 'Recharging'], cores: ['плазменных блоков', 'plasma cores'] },
	Vending: { layout: 'text', title: ['Торговля', 'Vending'], pool: ['всех торговых автоматов', 'all vending machines'] },
};

const typeLabels: Record<string, [ru: string, en: string]> = {
	ALCH: ['Расходуемый предмет', 'Consumable'],
	FOOD: ['Пища', 'Food'],
	CHEM: ['Препарат', 'Chem'],
	DRINK: ['Напиток', 'Drink'],
	MISC: ['Разное', 'Misc'],
	AMMO: ['Боеприпасы', 'Ammo'],
	CMPO: ['Компонент', 'Component'],
	BOOK: ['Записка', 'Note'],
};

const ru = computed(() => props.lang === 'ru');
const tr = (pair: [string, string]) => ru.value ? pair[0] : pair[1];
const pick = (ruText: string | null | undefined, enText: string | null | undefined) =>
	ru.value ? (ruText || enText) : (enText || ruText);

const group = computed(() => props.storage ? GROUPS[props.storage.group] ?? null : null);

const capacity = computed((): string | null => {
	const limit = props.storage?.limit;
	const g = group.value;
	if (!g) return null;

	if (limit == null)
		return ru.value ? 'Количество не ограничено.' : 'There is no limit on the amount.';

	const items = ru.value ? pluralizeRu(limit, ['предмет', 'предмета', 'предметов']) : (limit === 1 ? 'item' : 'items');

	const pool = props.unique ? undefined : g.pool;

	if (props.storage!.group === 'Vending' && pool)
		return ru.value
			? `Одновременно можно выставить на продажу до ${limit} ${items} (общий лимит для ${pool[0]} в C.A.M.P.).`
			: `Up to ${limit} ${items} can be listed for sale at once (shared by ${pool[1]} in the C.A.M.P.).`;

	if (!pool)
		return ru.value ? `Максимальная вместимость — ${limit} ${items}.` : `Maximum capacity: ${limit} ${items}.`;

	return ru.value
		? `Максимальная вместимость — ${limit} ${items} (общая для ${pool[0]} в C.A.M.P.).`
		: `Maximum capacity: ${limit} ${items} (shared by ${pool[1]} in the C.A.M.P.).`;
});

// The lead sentence of the text layout: what the object does.
const lead = computed((): string | null => {
	const storage = props.storage;
	const rate = props.spoilRate;
	if (!storage) return null;

	switch (storage.group) {
		case 'Refrigerator':
		case 'Cryo_Freezer': {
			const where = storage.group === 'Refrigerator'
				? (ru.value ? 'В холодильнике' : 'Refrigerators')
				: (ru.value ? 'В криоморозильнике' : 'Cryo-freezers');
			if (rate === 0) return ru.value ? `${where} пища и напитки не портятся.` : `${where} reduce the spoilage rate of food and drink items to 0%.`;
			if (rate != null && rate < 1) {
				const percent = Math.round((1 - rate) * 100);
				return ru.value ? `${where} пища и напитки портятся на ${percent}% медленнее.` : `${where} reduce the spoilage rate of food and drink items by ${percent}%.`;
			}
			return null;
		}
		case 'Fermenter':
			if (rate != null && rate > 1)
				return ru.value
					? (rate === 2 ? 'В бродильном чане алкоголь бродит вдвое быстрее.' : `В бродильном чане алкоголь бродит в ${rate} раза быстрее.`)
					: (rate === 2 ? 'Alcohol ferments twice as fast in a fermenter.' : `Alcohol ferments ${rate} times as fast in a fermenter.`);
			return null;
		case 'Vending':
			return ru.value
				? 'Позволяет продавать другим игрокам предметы из вашего ящика с припасами. Вы получаете 90% от назначенной цены, а ваша C.A.M.P. отображается на карте как торговец.'
				: 'Lets you sell items from your stash box to other players. You receive 90% of the price you set, and your C.A.M.P. is marked on the map as a vendor.';
		default:
			return null;
	}
});

// Only one recharger can be built in a C.A.M.P., so its limit is per object and is told without the shared pool.
const recharging = computed((): string | null => {
	const storage = props.storage;
	const cores = group.value?.cores;
	if (!storage || !cores) return null;

	const parts: string[] = [];
	if (storage.limit != null)
		parts.push(ru.value
			? `В зарядное устройство можно поместить до ${storage.limit} ${cores[0]}.`
			: `The recharger holds up to ${storage.limit} ${cores[1]}.`);

	const rate = storage.chargeRate;
	if (rate) {
		const full = formatDurationSeconds(100 / rate * 60, props.lang);
		parts.push(ru.value
			? `Все блоки в устройстве заряжаются одновременно на ${rate}% в минуту. Полностью разряженный блок заряжается на 100% за ${full}`
			: `All cores in it charge at once at ${rate}% per minute. An empty core is fully charged in ${full}.`);
	}

	return parts.join(' ');
});

const textLine = computed(() => recharging.value ?? [lead.value, capacity.value].filter(Boolean).join(' '));
const afterLine = computed(() => [group.value?.shared ? tr(group.value.shared) : null, capacity.value].filter(Boolean).join(' '));

const typeLabel = (type: string | null) => type && typeLabels[type] ? tr(typeLabels[type]) : null;

const formIdToImageFilename = (formId: string) => {
	const numeric = parseInt(formId.replace(/^0x/i, ''), 16) & 0x00FFFFFF;
	return numeric.toString(16).padStart(8, '0') + '.webp';
};

const visible = computed(() => {
	const g = group.value;
	if (!g || !props.storage) return false;
	if (g.layout === 'table') return (props.storage.items?.length ?? 0) > 0;
	if (g.layout === 'lists') return props.storage.lists.length > 0;
	return true;
});
</script>

<template>
	<div v-if="visible && group && storage" class="storage-block">
		<div class="fo-sect-h">
			<span class="fo-bar"></span>
			<h3 class="fo-h3">{{ tr(group.title) }}</h3>
		</div>

		<p v-if="group.layout === 'text'" class="storage-text">{{ textLine }}</p>

		<template v-else-if="group.layout === 'lists'">
			<p class="storage-text">{{ group.intro ? tr(group.intro) : '' }}</p>
			<ul>
				<li v-for="list in storage.lists" :key="list.formId">{{ pick(list.ru, list.en) }}</li>
			</ul>
			<p class="storage-text">{{ afterLine }}</p>
		</template>

		<template v-else>
			<p class="storage-text">{{ group.intro ? tr(group.intro) : '' }}</p>
			<table class="storage-table">
				<thead>
					<tr>
						<th>{{ ru ? 'Предмет' : 'Item' }}</th>
						<th class="storage-th-type">{{ ru ? 'Тип' : 'Type' }}</th>
					</tr>
				</thead>
				<tbody>
					<tr v-for="item in storage.items" :key="item.formId" class="storage-row storage-row-clickable"
						@click="emit('selectItem', item.formId.replace(/^0x/i, ''), pick(item.ru, item.en) ?? null)" @mouseenter="prefetchSubItem(item.formId)">
						<td class="storage-td-item">
							<img :src="prepareCampImage(formIdToImageFilename(item.formId), 100)" class="storage-icon" :alt="pick(item.ru, item.en) || ''" loading="lazy" @error="atomicShopHandleImageError">
							<button type="button" class="storage-name storage-name-button" @click.stop="emit('selectItem', item.formId.replace(/^0x/i, ''), pick(item.ru, item.en) ?? null)">{{ pick(item.ru, item.en) }}</button>
						</td>
						<td class="storage-td-type">{{ typeLabel(item.type) }}</td>
					</tr>
				</tbody>
			</table>
			<p class="storage-text storage-after-table">{{ afterLine }}</p>
		</template>
	</div>
</template>

<style scoped lang="scss">
.storage-block {
	margin-top: 2.25rem;
}

.storage-text {
	font-size: 1.0325rem;
	line-height: 1.6;
	color: var(--bs-body-color);
}

.storage-count {
	font-weight: 400;
}

.storage-after-table {
	margin-top: 1rem;
}

.storage-table {
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
}

.storage-th-type {
	width: 12rem;
}

.storage-row td {
	padding: 0.45rem 0.5rem;
	border-bottom: 1px solid rgba(255, 255, 255, 0.06);
}

.storage-row-clickable {
	cursor: pointer;

	&:hover .storage-name-button {
		text-decoration: underline;
	}
}

.storage-name.storage-name-button {
	padding: 0;
	border: 0;
	background: none;
	color: var(--bs-link-color);
	text-align: left;
}

.storage-row-clickable:hover .storage-name.storage-name-button {
	color: var(--bs-link-hover-color);
}

.storage-row:hover {
	background: rgba(255, 255, 255, 0.02);
}

.storage-td-item {
	display: flex;
	align-items: center;
	gap: 0.6rem;
	min-width: 0;
}

.storage-icon {
	width: 32px;
	height: 32px;
	object-fit: contain;
	flex-shrink: 0;
	border-radius: 4px;
}

.storage-name {
	min-width: 0;
	font-size: 0.875rem;
	color: var(--bs-body-color);
}

.storage-td-type {
	font-size: 0.875rem;
	color: #a1a1aa;
	white-space: nowrap;
}

@media (max-width: 767.98px) {
	.storage-th-type,
	.storage-td-type {
		display: none;
	}
}
</style>
