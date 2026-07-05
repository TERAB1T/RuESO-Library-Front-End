<script setup lang="ts">
import { RouterLink } from 'vue-router';
import { computed } from 'vue';
import { useQueryClient } from '@tanstack/vue-query';
import { usePrefetchAtomicShopItem } from '@/composables/useApi';
import { prepareCampImage, prepareAtomicShopImage, atomicShopHandleImageError } from '@/utils';

import type { LearnConditionLeaf, LearnConditionGroup, LearnConditionOrGroup, UnlockedByEntitlement } from '@/types';

const props = defineProps<{
	learnConditions: LearnConditionGroup | null;
	unlockedByEntitlements: UnlockedByEntitlement[] | null;
	lang: 'ru' | 'en';
}>();

const pick = (ru: string | null | undefined, en: string | null | undefined) =>
	props.lang === 'ru' ? (ru || en) : (en || ru);

const conditionIcons: Record<string, string> = {
	food: '/public/img/f76/camp/notfound.webp',
	plan: '/public/img/f76/camp/004e4881-100px.webp',
	challenge: '/public/img/f76/atx/notfound.webp',
	entitlement: '/public/img/f76/atx/notfound.webp',
	workshop: '/public/img/f76/atx/notfound.webp',
	level: '/public/img/f76/atx/notfound.webp',
	quest: '/public/img/f76/atx/notfound.webp',
	misc: '/public/img/f76/atx/notfound.webp'
};

const conditionLabelsRu: Record<string, string> = {
	food: 'Собрать',
	plan: 'Изучить',
	challenge: 'Выполнить испытание',
	entitlementAtx: 'Купить',
	entitlement: 'Получить',
	workshop: 'Захватить',
	level: 'Достичь',
	quest: 'Выполнить задание',
	misc: 'Условие'
};

const conditionLabelsEn: Record<string, string> = {
	food: 'Collect',
	plan: 'Learn',
	challenge: 'Complete challenge',
	entitlementAtx: 'Purchase',
	entitlement: 'Claim',
	workshop: 'Capture',
	level: 'Reach',
	quest: 'Complete quest',
	misc: 'Condition'
};

const conditionLabels = computed(() => (props.lang === 'ru' ? conditionLabelsRu : conditionLabelsEn));

interface ResolvedConditionLeaf {
	type: string;
	label: string;
	content: string;
	image: string | null;
	link: string | null;
	linkFormId: string | null;
}

const formIdToImageFilename = (formId: string) => {
	const numeric = parseInt(formId.replace(/^0x/i, ''), 16) & 0x00FFFFFF;
	return numeric.toString(16).padStart(8, '0') + '.webp';
};

const resolveConditionLeaf = (leaf: LearnConditionLeaf): ResolvedConditionLeaf => {
	if (leaf.type === 'entitlement') {
		const normalizedFormId = leaf.formId.replace(/^0x/i, '');
		const entItem = props.unlockedByEntitlements?.find(e => e.formId === normalizedFormId);
		return {
			type: 'entitlement',
			label: (entItem?.editorId.includes('atx_') ? conditionLabels.value.entitlementAtx : conditionLabels.value.entitlement) ?? '',
			content: pick(entItem?.nameRu, entItem?.nameEn) || leaf.editorId || (props.lang === 'ru' ? 'Неизвестный предмет' : 'Unknown item'),
			image: entItem?.mainImage ? prepareAtomicShopImage(entItem.mainImage) : null,
			link: entItem?.slug ? `/f76-atomic-shop/${entItem.formId}-${entItem.slug}` : null,
			linkFormId: entItem?.formId ?? null
		};
	}

	if (leaf.type === 'food') {
		return {
			type: 'food',
			label: conditionLabels.value.food ?? '',
			content: pick(leaf.ru, leaf.en) || leaf.editorId || '—',
			image: prepareCampImage(formIdToImageFilename(leaf.formId), 100),
			link: null,
			linkFormId: null
		};
	}

	if (leaf.type === 'workshop') {
		return {
			type: 'workshop',
			label: conditionLabels.value.workshop ?? '',
			content: props.lang === 'ru' ? 'Любая мастерская' : 'Any workshop',
			image: null,
			link: null,
			linkFormId: null
		};
	}

	if (leaf.type === 'level') {
		return {
			type: 'level',
			label: conditionLabels.value.level ?? '',
			content: leaf.level != null
				? (props.lang === 'ru' ? `${leaf.level}-й уровень` : `Level ${leaf.level}`)
				: (props.lang === 'ru' ? '0-й уровень' : 'Level 0'),
			image: null,
			link: null,
			linkFormId: null
		};
	}

	return {
		type: leaf.type,
		label: conditionLabels.value[leaf.type] ?? conditionLabels.value.misc ?? '',
		content: pick(leaf.ru, leaf.en)
			|| ('editorId' in leaf ? leaf.editorId : null)
			|| ('formId' in leaf ? leaf.formId : null)
			|| '—',
		image: null,
		link: null,
		linkFormId: null
	};
};

type ConditionSlot =
	| { kind: 'leaf'; item: ResolvedConditionLeaf }
	| { kind: 'nestedAnd'; items: ResolvedConditionLeaf[] };

const resolveOrMember = (member: LearnConditionLeaf | LearnConditionGroup): ConditionSlot => {
	if (!Array.isArray(member)) {
		return { kind: 'leaf', item: resolveConditionLeaf(member) };
	}

	if (member.length !== 1) {
		console.warn('Условия получения: неожиданная вложенная AND-группа из нескольких OR-групп, отображается только первая', member);
	}

	const innerOrGroup: LearnConditionOrGroup = member[0] ?? [];

	const leaves = innerOrGroup
		.map(inner => {
			if (Array.isArray(inner)) {
				console.warn('Условия получения: вложенность глубже одного уровня не поддерживается отображением, элемент пропущен', inner);
				return null;
			}
			return resolveConditionLeaf(inner);
		})
		.filter((x): x is ResolvedConditionLeaf => x !== null);

	return { kind: 'nestedAnd', items: leaves };
};

const conditionAndGroups = computed<ConditionSlot[][]>(() => {
	if (!props.learnConditions) return [];
	return props.learnConditions.map(orGroup => orGroup.map(resolveOrMember));
});

const hasUnlockConditions = computed(() => conditionAndGroups.value.length > 0);

const hasOrCondition = computed(() => conditionAndGroups.value.some(g => g.length > 1));

const flattenedAndSlots = computed<ConditionSlot[]>(() =>
	conditionAndGroups.value.map(g => g[0]).filter((s): s is ConditionSlot => !!s)
);

const t = computed(() => props.lang === 'ru'
	? { title: 'Условия разблокировки', and: 'И', or: 'ИЛИ' }
	: { title: 'Unlock Conditions', and: 'AND', or: 'OR' }
);

defineExpose({ hasUnlockConditions });

const queryClient = useQueryClient();
const prefetchAtxItem = (formId: string) => usePrefetchAtomicShopItem(queryClient, formId);
</script>

<template>
	<div v-if="hasUnlockConditions" class="unlock-conditions-block">
		<div class="fo-sect-h">
			<span class="fo-bar"></span>
			<h3 class="fo-h3">{{ t.title }}</h3>
		</div>

		<template v-if="hasOrCondition">
			<template v-for="(orGroup, gi) in conditionAndGroups" :key="gi">
				<div v-if="gi > 0" class="unlock-and-divider"><span class="unlock-and-badge">{{ t.and }}</span></div>

				<div class="unlock-or-row">
					<template v-for="(slot, si) in orGroup" :key="si">
						<div v-if="si > 0" class="unlock-or-label">{{ t.or }}</div>

						<component v-if="slot.kind === 'leaf'" :is="slot.item.link ? RouterLink : 'div'" :to="slot.item.link || undefined" class="unlock-card" :class="{ 'unlock-card-link': !!slot.item.link }" @mouseenter="slot.item.linkFormId && prefetchAtxItem(slot.item.linkFormId)">
							<img v-if="slot.item.image" :src="slot.item.image" class="unlock-card-icon" :alt="slot.item.content" loading="lazy" @error="atomicShopHandleImageError">
							<img v-else :src="conditionIcons[slot.item.type]" class="unlock-card-icon" :alt="slot.item.label" loading="lazy" @error="atomicShopHandleImageError">
							<div class="unlock-card-text">
								<div class="unlock-card-label">{{ slot.item.label }}:</div>
								<div class="unlock-card-content">{{ slot.item.content }}</div>
							</div>
						</component>

						<div v-else class="unlock-nested-and">
							<component v-for="(leaf, li) in slot.items" :key="li" :is="leaf.link ? RouterLink : 'div'" :to="leaf.link || undefined" class="unlock-card unlock-card-small" :class="{ 'unlock-card-link': !!leaf.link }" @mouseenter="leaf.linkFormId && prefetchAtxItem(leaf.linkFormId)">
								<img v-if="leaf.image" :src="leaf.image" class="unlock-card-icon" :alt="leaf.content" loading="lazy" @error="atomicShopHandleImageError">
								<img v-else :src="conditionIcons[leaf.type]" class="unlock-card-icon" :alt="leaf.label" loading="lazy" @error="atomicShopHandleImageError">
								<div class="unlock-card-text">
									<div class="unlock-card-label">{{ leaf.label }}:</div>
									<div class="unlock-card-content">{{ leaf.content }}</div>
								</div>
							</component>
						</div>
					</template>
				</div>
			</template>
		</template>

		<template v-else>
			<div class="unlock-or-row" :class="{ 'unlock-or-row-single': flattenedAndSlots.length === 1 }">
				<template v-for="(slot, si) in flattenedAndSlots" :key="si">
					<div v-if="si > 0" class="unlock-or-label">{{ t.and }}</div>

					<component v-if="slot.kind === 'leaf'" :is="slot.item.link ? RouterLink : 'div'" :to="slot.item.link || undefined" class="unlock-card" :class="{ 'unlock-card-link': !!slot.item.link }" @mouseenter="slot.item.linkFormId && prefetchAtxItem(slot.item.linkFormId)">
						<img v-if="slot.item.image" :src="slot.item.image" class="unlock-card-icon" :alt="slot.item.content" loading="lazy" @error="atomicShopHandleImageError">
						<img v-else :src="conditionIcons[slot.item.type]" class="unlock-card-icon" :alt="slot.item.label" loading="lazy" @error="atomicShopHandleImageError">
						<div class="unlock-card-text">
							<div class="unlock-card-label">{{ slot.item.label }}:</div>
							<div class="unlock-card-content">{{ slot.item.content }}</div>
						</div>
					</component>

					<div v-else class="unlock-nested-and">
						<component v-for="(leaf, li) in slot.items" :key="li" :is="leaf.link ? RouterLink : 'div'" :to="leaf.link || undefined" class="unlock-card unlock-card-small" :class="{ 'unlock-card-link': !!leaf.link }" @mouseenter="leaf.linkFormId && prefetchAtxItem(leaf.linkFormId)">
							<img v-if="leaf.image" :src="leaf.image" class="unlock-card-icon" :alt="leaf.content" loading="lazy" @error="atomicShopHandleImageError">
							<img v-else :src="conditionIcons[leaf.type]" class="unlock-card-icon" :alt="leaf.label" loading="lazy" @error="atomicShopHandleImageError">
							<div class="unlock-card-text">
								<div class="unlock-card-label">{{ leaf.label }}:</div>
								<div class="unlock-card-content">{{ leaf.content }}</div>
							</div>
						</component>
					</div>
				</template>
			</div>
		</template>
	</div>
</template>

<style scoped lang="scss">
.unlock-conditions-block {
	margin-top: 2.25rem;
}

.unlock-and-divider {
	position: relative;
	height: 1px;
	background: rgba(255, 255, 255, 0.1);
	margin: 0.85rem 0;
}

.unlock-and-badge {
	position: absolute;
	left: 50%;
	top: 50%;
	transform: translate(-50%, -50%);
	background: var(--bs-block-bg);
	padding: 0.15rem 0.55rem;
	font-size: 0.7rem;
	font-weight: 700;
	color: #a1a1aa;
	white-space: nowrap;
}

.unlock-or-row {
	display: flex;
	flex-wrap: wrap;
	align-items: stretch;
	gap: 0.6rem;
	margin-bottom: 0.6rem;

	&:last-child {
		margin-bottom: 0;
	}
}

.unlock-or-row-single .unlock-card,
.unlock-or-row-single .unlock-nested-and {
	flex: 0 1 50%;
}

.unlock-or-label {
	flex: 0 0 auto;
	align-self: center;
	font-size: 0.7rem;
	font-weight: 700;
	color: #a1a1aa;
	text-transform: uppercase;
	letter-spacing: 0.04em;
}

.unlock-card,
.unlock-nested-and {
	flex: 1 1 32%;
	min-width: 0;
}

.unlock-card {
	display: flex;
	align-items: center;
	gap: 0.65rem;
	padding: 0.5rem;
	border-radius: 10px;
	background: rgba(255, 255, 255, 0.03);
	border: 1px solid rgba(255, 255, 255, 0.07);
	transition: border-color 0.15s ease, background-color 0.15s ease;
}

.unlock-card-link {
	color: inherit;
	text-decoration: none;

	&:hover {
		border-color: #6c757d;
		background: rgba(255, 255, 255, 0.05);
	}
}

.unlock-card-icon {
	width: 44px;
	height: 44px;
	object-fit: contain;
	flex-shrink: 0;
	border-radius: 6px;
}

.unlock-card-text {
	display: flex;
	flex-direction: column;
	min-width: 0;
	gap: 0.1rem;
}

.unlock-card-label {
	font-size: 0.7rem;
	color: #a1a1aa;
	text-transform: uppercase;
	letter-spacing: 0.03em;
}

.unlock-card-content {
	font-size: 0.875rem;
	font-weight: 500;
	color: var(--bs-body-color);
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
}

.unlock-card-small {
	padding: 0.3rem 0.5rem;
}

.unlock-nested-and {
	display: flex;
	flex-direction: column;
	gap: 0.3rem;
}

@media (max-width: 991.98px) {

	.unlock-or-row-single .unlock-card,
	.unlock-or-row-single .unlock-nested-and {
		flex-basis: 100%;
	}
}

@media (max-width: 767.98px) {

	.unlock-card,
	.unlock-nested-and {
		flex-basis: 100%;
	}

	.unlock-or-label {
		flex-basis: 100%;
		text-align: center;
	}
}
</style>
