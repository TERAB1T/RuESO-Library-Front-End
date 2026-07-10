<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { prepareCampImage, atomicShopHandleImageError, pluralizeRu } from '@/utils';
import type { ProducesMode, ProducesNode, ProducesItemNode, ProducesListNode } from '@/types';

const props = defineProps<{
	produces: ProducesMode[] | null;
	carryWeight: number | null;
	lang: 'ru' | 'en';
}>();

const hasProduces = computed(() => !!props.produces && props.produces.length > 0);
const hasMultipleModes = computed(() => (props.produces?.length ?? 0) > 1);

const activeModeIndex = ref(0);

watch(() => props.produces, () => {
	activeModeIndex.value = 0;
});

const activeMode = computed<ProducesMode | null>(() => props.produces?.[activeModeIndex.value] ?? null);

const pick = (ru: string | null | undefined, en: string | null | undefined) =>
	props.lang === 'ru' ? (ru || en) : (en || ru);

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
	CMPO: { ru: 'Компонент', en: 'Component' },
	BOOK: { ru: 'Записка', en: 'Note' },
	HAT: { ru: 'Головной убор', en: 'Hat' },
};

const typeLabel = (type: string | null): string | null => {
	if (!type) return null;
	const entry = typeLabels[type];
	if (!entry) return null;
	return props.lang === 'ru' ? entry.ru : entry.en;
};

const formIdToImageFilename = (formId: string) => {
	const numeric = parseInt(formId.replace(/^0x/i, ''), 16) & 0x00FFFFFF;
	return numeric.toString(16).padStart(8, '0') + '.webp';
};

const isListNode = (node: ProducesNode): node is ProducesListNode => node.kind === 'list';
const isItemNode = (node: ProducesNode): node is ProducesItemNode => node.kind === 'item';

const collectLeaves = (nodes: ProducesNode[]): ProducesItemNode[] => {
	const result: ProducesItemNode[] = [];
	for (const node of nodes) {
		if (isItemNode(node)) result.push(node);
		else if (isListNode(node)) result.push(...collectLeaves(node.entries));
	}
	return result;
};

interface DisplayGroup {
	isUngrouped: boolean;
	groupNumber: number | null;
	label: string | null;
	probability: number | null;
	availabilityNote: string | null;
	items: ProducesItemNode[];
}

const mergeDuplicates = (items: ProducesItemNode[]): ProducesItemNode[] => {
	const map = new Map<string, ProducesItemNode>();

	for (const item of items) {
		const key = `${item.formId}|${item.en ?? ''}|${item.ru ?? ''}|${item.count}`;
		const existing = map.get(key);

		if (existing) {
			existing.probability += item.probability;
		} else {
			map.set(key, { ...item });
		}
	}

	return Array.from(map.values());
};

const prepareItems = (items: ProducesItemNode[]) =>
	mergeDuplicates(items).sort((a, b) => b.probability - a.probability);

const makeUngrouped = (items: ProducesItemNode[], label: string | null = null): DisplayGroup => ({
	isUngrouped: true,
	groupNumber: null,
	label,
	probability: null,
	availabilityNote: null,
	items: prepareItems(items),
});

const activeRows = computed<DisplayGroup[]>(() => {
	if (!activeMode.value) return [];

	const outcomes = activeMode.value.outcomes;
	const onlyNode = outcomes.length === 1 ? outcomes[0] : undefined;

	if (onlyNode && isListNode(onlyNode)) {
		return [makeUngrouped(collectLeaves(onlyNode.entries))];
	}

	const groups: DisplayGroup[] = [];
	const looseItems: ProducesItemNode[] = [];

	for (const node of outcomes) {
		if (isItemNode(node)) {
			looseItems.push(node);
		} else if (isListNode(node)) {
			groups.push({
				isUngrouped: false,
				groupNumber: null,
				label: pick(node.ru, node.en) ?? null,
				probability: node.probability,
				availabilityNote: node.availabilityNote ? (pick(node.availabilityNote.ru, node.availabilityNote.en) ?? null) : null,
				items: prepareItems(collectLeaves(node.entries)),
			});
		}
	}

	if (groups.length === 0) {
		return looseItems.length > 0 ? [makeUngrouped(looseItems)] : [];
	}

	groups.sort((a, b) => (b.probability ?? 0) - (a.probability ?? 0));
	groups.forEach((g, i) => { g.groupNumber = i + 1; });

	if (looseItems.length > 0) {
		groups.push(makeUngrouped(looseItems, props.lang === 'ru' ? 'Без группы' : 'Ungrouped'));
	}

	return groups;
});

const formatPercent = (probability: number) => {
	const percent = probability * 100;
	if (props.lang === 'ru')
		return `${(Math.round(percent * 100) / 100).toLocaleString('ru-RU')}%`;
	return `${Math.round(percent * 100) / 100}%`;
};

const formatTimeSpan = (intervalHours: number): string => {
	const totalSeconds = Math.round(intervalHours * 3600);
	const hours = Math.floor(totalSeconds / 3600);
	const minutes = Math.floor((totalSeconds % 3600) / 60);
	const seconds = totalSeconds % 60;

	const parts: string[] = [];
	if (props.lang === 'ru') {
		if (hours > 0) parts.push(`${hours} ч.`);
		if (minutes > 0) parts.push(`${minutes} мин.`);
		if (seconds > 0) parts.push(`${seconds} сек.`);
		return parts.length > 0 ? parts.join(' ') : '0 сек.';
	}

	if (hours > 0) parts.push(`${hours} h`);
	if (minutes > 0) parts.push(`${minutes} min`);
	if (seconds > 0) parts.push(`${seconds} sec`);
	return parts.length > 0 ? parts.join(' ') : '0 sec';
};

const formatInterval = (intervalHours: number | null): string | null => {
	if (intervalHours == null || intervalHours <= 0) return null;

	const timeStr = formatTimeSpan(intervalHours);
	if (intervalHours > 1) {
		return props.lang === 'ru'
			? `По одному предмету раз в ${timeStr}`
			: `One item every ${timeStr}`;
	}
	const perHour = Math.round(1 / intervalHours);

	if (perHour === 1) {
		return props.lang === 'ru'
			? `${perHour} ${pluralizeRu(perHour, ['предмет', 'предмета', 'предметов'])} в час`
			: `${perHour} per hour`;
	}

	return props.lang === 'ru'
		? `${perHour} ${pluralizeRu(perHour, ['предмет', 'предмета', 'предметов'])} в час (по одному раз в ${timeStr})`
		: `${perHour} per hour (every ${timeStr})`;
};

const formatVendingSummary = (mode: ProducesMode): string | null => {
	if (mode.cost == null || mode.intervalHours == null || mode.intervalHours <= 0) return null;

	const timeStr = formatTimeSpan(mode.intervalHours);

	return props.lang === 'ru'
		? `Этот объект — торговый автомат. При взаимодействии с ним игрок получает случайный предмет из списка ниже. Можно использовать не чаще чем раз в ${timeStr} Стоимость: ${mode.cost} ${pluralizeRu(mode.cost, ['крышка', 'крышки', 'крышек'])}.`
		: `This object is a vending machine. Interacting with it gives the player a random item from the list below. Can be used once every ${timeStr}. Cost: ${mode.cost} cap${mode.cost === 1 ? '' : 's'}.`;
};

const vendingSummary = computed<string | null>(() =>
	activeMode.value ? formatVendingSummary(activeMode.value) : null);

const intervalText = computed<string | null>(() =>
	activeMode.value ? formatInterval(activeMode.value.intervalHours) : null);

const formatEveryPeriod = (intervalHours: number): { prefix: string; time: string } => {
	const totalSeconds = Math.round(intervalHours * 3600);
	const hours = Math.floor(totalSeconds / 3600);
	const minutes = Math.floor((totalSeconds % 3600) / 60);
	const seconds = totalSeconds % 60;

	const partCount = [hours, minutes, seconds].filter(v => v > 0).length;

	if (props.lang === 'ru') {
		if (partCount === 1) {
			if (hours > 0) return hours === 1 ? { prefix: 'Каждый', time: 'час' } : { prefix: 'Каждые', time: `${hours} ч.` };
			if (minutes > 0) return minutes === 1 ? { prefix: 'Каждую', time: 'минуту' } : { prefix: 'Каждые', time: `${minutes} мин.` };
			return seconds === 1 ? { prefix: 'Каждую', time: 'секунду' } : { prefix: 'Каждые', time: `${seconds} сек.` };
		}

		const parts: string[] = [];
		if (hours > 0) parts.push(`${hours} ч.`);
		if (minutes > 0) parts.push(`${minutes} мин.`);
		if (seconds > 0) parts.push(`${seconds} сек.`);
		return { prefix: 'Каждые', time: parts.join(' ') };
	}

	if (partCount === 1) {
		if (hours > 0) return hours === 1 ? { prefix: 'Every', time: 'hour' } : { prefix: 'Every', time: `${hours}h` };
		if (minutes > 0) return minutes === 1 ? { prefix: 'Every', time: 'minute' } : { prefix: 'Every', time: `${minutes}m` };
		return seconds === 1 ? { prefix: 'Every', time: 'second' } : { prefix: 'Every', time: `${seconds}s` };
	}

	const parts: string[] = [];
	if (hours > 0) parts.push(`${hours}h`);
	if (minutes > 0) parts.push(`${minutes}m`);
	if (seconds > 0) parts.push(`${seconds}s`);
	return { prefix: 'Every', time: parts.join(' ') };
};

const collectorPeriod = computed<{ prefix: string; time: string } | null>(() => {
	if (!activeMode.value) return null;
	if (activeMode.value.cost != null) return null;
	if (activeMode.value.intervalHours == null || activeMode.value.intervalHours <= 0) return null;
	return formatEveryPeriod(activeMode.value.intervalHours);
});

const carryWeightText = computed<string | null>(() => {
	if (props.carryWeight == null || vendingSummary.value) return null;

	const weight = Math.round(props.carryWeight);

	return props.lang === 'ru'
		? ` Максимальная вместимость — ${weight} ${pluralizeRu(weight, ['фунт', 'фунта', 'фунтов'])}.`
		: ` Maximum capacity — ${weight} lb${weight === 1 ? '' : 's'}.`;
});

const t = computed(() => props.lang === 'ru'
	? { title: vendingSummary.value ? 'Торговый автомат' : 'Сборщик', mode: (i: number) => `Режим ${i + 1}`, colItem: 'Предмет', colType: 'Тип', colCount: 'Кол-во', colChance: 'Шанс', group: (n: number) => `Группа ${n}` }
	: { title: vendingSummary.value ? 'Vending Machine' : 'Collector', mode: (i: number) => `Mode ${i + 1}`, colItem: 'Item', colType: 'Type', colCount: 'Qty', colChance: 'Chance', group: (n: number) => `Group ${n}` }
);

</script>

<template>
	<div v-if="hasProduces" class="produces-block">
		<div class="fo-sect-h">
			<span class="fo-bar"></span>
			<h3 class="fo-h3">{{ t.title }}</h3>
		</div>

		<ul v-if="hasMultipleModes" class="nav nav-tabs produces-mode-tabs">
			<li v-for="(mode, index) in produces" :key="index" class="nav-item">
				<button class="nav-link" :class="{ active: index === activeModeIndex }" type="button" @click="activeModeIndex = index">
					{{ pick(mode.modeRu, mode.modeEn) || t.mode(index) }}
				</button>
			</li>
		</ul>

		<div v-if="activeMode" class="produces-summary">
			<template v-if="vendingSummary">
				<span class="produces-summary-vending">{{ vendingSummary }}</span>
			</template>
			<template v-else-if="collectorPeriod">
				<span class="produces-summary-vending">
					<template v-if="lang === 'ru'">Этот объект — сборщик. {{ collectorPeriod.prefix }} <strong>{{ collectorPeriod.time }}</strong> он производит по одному предмету из списка ниже.</template>
					<template v-else>This object is a collector. {{ collectorPeriod.prefix }} <strong>{{ collectorPeriod.time }}</strong>, it produces one item from the list below.</template>
					<span v-if="carryWeightText">{{ carryWeightText }}</span>
				</span>
			</template>
			<template v-else>
				<span class="produces-summary-name">{{ pick(activeMode.ru, activeMode.en) }}:</span>
				<span v-if="intervalText" class="produces-summary-interval">
					{{ intervalText }}
				</span>
			</template>
		</div>

		<table class="produces-table">
			<thead>
				<tr>
					<th class="produces-th-item">{{ t.colItem }}</th>
					<th class="produces-th-type">{{ t.colType }}</th>
					<th class="produces-th-count">{{ t.colCount }}</th>
					<th class="produces-th-chance">{{ t.colChance }}</th>
				</tr>
			</thead>
			<tbody>
				<template v-for="(group, index) in activeRows" :key="index">
					<tr v-if="!(group.isUngrouped && activeRows.length === 1)" class="produces-row produces-row-group-header">
						<td colspan="3" class="produces-td-group-label">
							<template v-if="!group.isUngrouped">
								{{ t.group(group.groupNumber ?? 0) }}
								<span v-if="group.label" class="produces-group-name">— {{ group.label }}</span>
							</template>
							<template v-else>
								{{ group.label }}
							</template>
							<span v-if="group.availabilityNote" class="produces-note">{{ group.availabilityNote }}</span>
						</td>
						<td class="produces-td-chance">{{ group.probability !== null ? formatPercent(group.probability) : '' }}</td>
					</tr>

					<tr v-for="(item, ii) in group.items" :key="`${index}-${ii}`" class="produces-row produces-row-item">
						<td class="produces-td-item">
							<img :src="prepareCampImage(formIdToImageFilename(item.formId), 100)" class="produces-icon" :alt="pick(item.ru, item.en) || ''" loading="lazy" @error="atomicShopHandleImageError">
							<div class="produces-item-text">
								<span class="produces-name">{{ pick(item.ru, item.en) }}</span>
								<span v-if="item.availabilityNote" class="produces-note">{{ pick(item.availabilityNote.ru, item.availabilityNote.en) }}</span>
							</div>
						</td>
						<td class="produces-td-type">
							<span v-if="typeLabel(item.type)" class="produces-type-badge">{{ typeLabel(item.type) }}</span>
						</td>
						<td class="produces-td-count">{{ item.count }}</td>
						<td class="produces-td-chance">{{ formatPercent(item.probability) }}</td>
					</tr>
				</template>
			</tbody>
		</table>
	</div>
</template>

<style scoped lang="scss">
.produces-block {
	margin-top: 2.25rem;
}

.produces-mode-tabs {
	margin-bottom: 1rem;
}

.produces-summary {
	display: flex;
	align-items: baseline;
	gap: 0.5rem;
	margin-bottom: 1rem;
	font-size: 1.0325rem;
	line-height: 1.6;
}

.produces-summary-name {
	font-weight: 600;
	color: var(--bs-body-color);
}

.produces-summary-interval {
	color: white;
}

.produces-table {
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

	.produces-th-count,
	.produces-th-chance {
		text-align: right;
		width: 4.5rem;
	}
}

.produces-row-item td {
	padding: 0.45rem 0.5rem;
	border-bottom: 1px solid rgba(255, 255, 255, 0.06);
}

.produces-row-item:hover {
	background: rgba(255, 255, 255, 0.02);
}

.produces-row-group-header td {
	padding: 0.5rem 0.5rem;
	background: rgba(255, 255, 255, 0.05);
	border-bottom: 1px solid rgba(255, 255, 255, 0.08);
}

.produces-td-group-label {
	font-weight: 700;
	font-size: 0.8rem;
	color: var(--bs-body-color);
	padding-left: 0.5rem !important;
}

.produces-group-name {
	font-weight: 400;
	color: #a1a1aa;
}

.produces-td-item {
	display: flex;
	align-items: center;
	gap: 0.6rem;
	min-width: 0;
}

.produces-item-text {
	display: flex;
	flex-direction: column;
	min-width: 0;
	line-height: 1.15;
}

.produces-note {
	font-size: 0.7rem;
	color: #a1a1aa;
	font-style: italic;
	line-height: 1;
	margin-top: 0.1rem;
}

.produces-row-group-header .produces-note {
	font-size: 0.8rem;
	font-style: italic;
	line-height: 1;
	font-weight: 600;
	margin-left: 0.5rem;
}

.produces-icon {
	width: 32px;
	height: 32px;
	object-fit: contain;
	flex-shrink: 0;
	border-radius: 4px;
}

.produces-name {
	min-width: 0;
	font-size: 0.875rem;
	color: var(--bs-body-color);
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
}

.produces-td-count {
	text-align: right;
	font-size: 0.8rem;
	color: #a1a1aa;
	white-space: nowrap;
}

.produces-td-chance {
	text-align: right;
	font-weight: 600;
	font-size: 0.875rem;
	color: var(--bs-body-color);
	white-space: nowrap;
}

.produces-row-group-header .produces-td-chance {
	font-weight: 700;
}

.produces-th-type {
	text-align: left;
	width: 6rem;
}

.produces-td-type {
	padding: 0.45rem 0.5rem;
	white-space: nowrap;
}

.produces-type-badge {
	font-size: 0.875rem;
	color: #a1a1aa;
	display: inline-block;
}

.produces-summary-vending {
	font-size: 1.0325rem;
	line-height: 1.6;
}

@media (max-width: 767.98px) {
	.produces-name {
		white-space: normal;
	}

	.produces-th-type {
		display: none;
	}

	.produces-td-type {
		display: none;
	}
}
</style>
