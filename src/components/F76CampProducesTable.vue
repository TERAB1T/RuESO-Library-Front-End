<script setup lang="ts">
import { computed, ref } from 'vue';
import { prepareCampImage, atomicShopHandleImageError, pluralizeRu } from '@/utils';
import type { ProducesMode, ProducesNode, ProducesItemNode, ProducesListNode } from '@/types';

const props = defineProps<{
	produces: ProducesMode[] | null;
	lang: 'ru' | 'en';
}>();

const hasProduces = computed(() => !!props.produces && props.produces.length > 0);
const hasMultipleModes = computed(() => (props.produces?.length ?? 0) > 1);

const activeModeIndex = ref(0);

const activeMode = computed<ProducesMode | null>(() => {
	if (!props.produces || props.produces.length === 0) return null;
	return props.produces[Math.min(activeModeIndex.value, props.produces.length - 1)] ?? props.produces[0] ?? null;
});

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
	kind: 'group';
	isUngrouped: boolean;
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

const activeRows = computed<DisplayGroup[]>(() => {
	if (!activeMode.value) return [];

	const outcomes = activeMode.value.outcomes;
	const onlyNode = outcomes.length === 1 ? outcomes[0] : undefined;

	if (onlyNode && isListNode(onlyNode)) {
		return [{
			kind: 'group',
			isUngrouped: true,
			label: null,
			probability: null,
			availabilityNote: null,
			items: mergeDuplicates(collectLeaves(onlyNode.entries)).sort((a, b) => b.probability - a.probability)
		}];
	}

	const groups: DisplayGroup[] = [];
	const looseItems: ProducesItemNode[] = [];

	for (const node of outcomes) {
		if (isItemNode(node)) {
			looseItems.push(node);
		} else if (isListNode(node)) {
			groups.push({
				kind: 'group',
				isUngrouped: false,
				label: pick(node.ru, node.en) ?? null,
				probability: node.probability,
				availabilityNote: node.availabilityNote ? (pick(node.availabilityNote.ru, node.availabilityNote.en) ?? null) : null,
				items: mergeDuplicates(collectLeaves(node.entries)).sort((a, b) => b.probability - a.probability)
			});
		}
	}

	groups.sort((a, b) => (b.probability ?? 0) - (a.probability ?? 0));

	if (groups.length === 0) {
		return looseItems.length > 0
			? [{ kind: 'group', isUngrouped: true, label: null, probability: null, availabilityNote: null, items: mergeDuplicates(looseItems).sort((a, b) => b.probability - a.probability) }]
			: [];
	}

	if (looseItems.length > 0) {
		groups.push({
			kind: 'group',
			isUngrouped: true,
			label: props.lang === 'ru' ? 'Без группы' : 'Ungrouped',
			probability: null,
			availabilityNote: null,
			items: mergeDuplicates(looseItems).sort((a, b) => b.probability - a.probability)
		});
	}

	return groups;
});

const formatPercent = (probability: number) => {
	const percent = probability * 100;
	return `${Math.round(percent * 100) / 100}%`;
};

const formatTimeSpan = (intervalHours: number): string => {
	const totalSeconds = Math.round(intervalHours * 3600);
	const minutes = Math.floor(totalSeconds / 60);
	const seconds = totalSeconds % 60;

	if (props.lang === 'ru') {
		if (minutes > 0)
			return seconds > 0 ? `${minutes} мин. ${seconds} сек.` : `${minutes} мин.`;
		return `${seconds} сек.`;
	}

	if (minutes > 0)
		return seconds > 0 ? `${minutes} min ${seconds} sec` : `${minutes} min`;
	return `${seconds} sec`;
};

const formatInterval = (intervalHours: number | null): string | null => {
	if (intervalHours == null || intervalHours <= 0) return null;

	const timeStr = formatTimeSpan(intervalHours);
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
		? `При взаимодействии с автоматом игрок получает случайный предмет из списка ниже. Можно использовать не чаще чем раз в ${timeStr} Стоимость: ${mode.cost} ${pluralizeRu(mode.cost, ['крышка', 'крышки', 'крышек'])}.`
		: `Interacting with this machine gives the player a random item from the list below. Can be used once every ${timeStr}. Cost: ${mode.cost} cap${mode.cost === 1 ? '' : 's'}.`;
};

const t = computed(() => props.lang === 'ru'
	? { title: 'Производит', mode: (i: number) => `Режим ${i + 1}`, colItem: 'Предмет', colType: 'Тип', colCount: 'Кол-во', colChance: 'Шанс', group: (n: number) => `Группа ${n}` }
	: { title: 'Produces', mode: (i: number) => `Mode ${i + 1}`, colItem: 'Item', colType: 'Type', colCount: 'Qty', colChance: 'Chance', group: (n: number) => `Group ${n}` }
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
			<template v-if="formatVendingSummary(activeMode)">
				<span class="produces-summary-vending">{{ formatVendingSummary(activeMode) }}</span>
			</template>
			<template v-else>
				<span class="produces-summary-name">{{ pick(activeMode.ru, activeMode.en) }}:</span>
				<span v-if="formatInterval(activeMode.intervalHours)" class="produces-summary-interval">
					{{ formatInterval(activeMode.intervalHours) }}
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
								{{t.group(activeRows.slice(0, index + 1).filter(g => !g.isUngrouped).length)}}
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

.produces-row-nested .produces-td-item {
	padding-left: 1.5rem;
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
