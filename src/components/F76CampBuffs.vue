<script setup lang="ts">
import { computed } from 'vue';
import { formatDurationSeconds } from '@/utils';

import type { Buff, BuffEffect, BuffTrigger, BuffCondition } from '@/types';

const props = defineProps<{
	buffs: Buff[] | null;
	lang: 'ru' | 'en';
}>();

const TRIGGER_ORDER: BuffTrigger[] = ['whileUsing', 'afterDelay', 'onActivate', 'onPassThrough'];

const INSTANT_DURATION_MAX = 1;

const pick = (ru: string | null | undefined, en: string | null | undefined) =>
	props.lang === 'ru' ? (ru || en) : (en || ru);

const hasBuffs = computed(() => !!props.buffs && props.buffs.length > 0);

const conditionLabels: Record<BuffCondition, { ru: string; en: string }> = {
	noAllyNearby: {
		ru: 'когда в C.A.M.P. нет союзника',
		en: 'when no ally is in your C.A.M.P.'
	},
	infatuatedAllyNearby: {
		ru: 'когда в C.A.M.P. есть обычный союзник',
		en: 'when a regular ally is in your C.A.M.P.'
	},
	romanticAllyNearby: {
		ru: 'когда в C.A.M.P. есть влюбленный союзник',
		en: 'when a romanced ally is in your C.A.M.P.'
	}
};

const conditionLabel = (condition: BuffCondition | null): string | null =>
	condition ? conditionLabels[condition]?.[props.lang] ?? null : null;

interface ResolvedEffect {
	description: string;
	perk: string | null;
}

interface ResolvedBuff {
	key: string;
	name: string;
	duration: string | null;
	condition: string | null;
	effects: ResolvedEffect[];
}

interface BuffGroup {
	key: string;
	header: string;
	buffs: ResolvedBuff[];
}

const resolveEffect = (effect: BuffEffect): ResolvedEffect => ({
	description: pick(effect.description.ru, effect.description.en) || '—',
	perk: effect.requiresPerk ? pick(effect.requiresPerk.name.ru, effect.requiresPerk.name.en) ?? null : null
});

const resolveBuff = (buff: Buff, index: number): ResolvedBuff => {
	// Every effect of a buff shares the same duration, so it is shown once next to the buff name.
	const duration = buff.effects[0]?.duration ?? 0;

	return {
		key: `${buff.spellFormId}-${index}`,
		name: pick(buff.name.ru, buff.name.en) || '—',
		duration: duration > INSTANT_DURATION_MAX ? formatDurationSeconds(duration, props.lang) : null,
		condition: conditionLabel(buff.condition),
		effects: buff.effects.map(resolveEffect)
	};
};

// Triggers and conditions come from an externally maintained database, so unknown
// values must degrade to a generic wording instead of rendering an empty header.
const buildHeader = (trigger: BuffTrigger, delaySeconds: number | null, isOneOf: boolean, buffCount: number): string => {
	const delay = delaySeconds != null ? formatDurationSeconds(delaySeconds, props.lang) : null;

	if (props.lang === 'ru') {
		const gained = isOneOf
			? 'один из следующих эффектов'
			: (buffCount === 1 ? 'эффект' : 'эффекты');

		switch (trigger) {
			case 'whileUsing':
				return isOneOf
					? `Во время взаимодействия с этим объектом на вас действует ${gained}:`
					: `Во время взаимодействия с этим объектом на вас ${buffCount === 1 ? 'действует эффект' : 'действуют эффекты'}:`;
			case 'afterDelay':
				return delay
					? `После взаимодействия с этим объектом в течение ${delay} вы получаете ${gained}:`
					: `После взаимодействия с этим объектом вы получаете ${gained}:`;
			case 'onActivate':
				return `При взаимодействии с этим объектом вы получаете ${gained}:`;
			case 'onPassThrough':
				return `При прохождении сквозь этот объект вы получаете ${gained}:`;
			default:
				return `Этот объект даёт ${gained}:`;
		}
	}

	const oneOf = isOneOf ? ' one of the following' : '';

	switch (trigger) {
		case 'whileUsing':
			return `While interacting with this object, you are affected by${oneOf}:`;
		case 'afterDelay':
			return delay
				? `After interacting with this object for ${delay}, you gain${oneOf}:`
				: `After interacting with this object, you gain${oneOf}:`;
		case 'onActivate':
			return `Interacting with this object grants you${oneOf}:`;
		case 'onPassThrough':
			return `Passing through this object grants you${oneOf}:`;
		default:
			return `This object grants you${oneOf}:`;
	}
};

const buffGroups = computed<BuffGroup[]>(() => {
	if (!props.buffs) return [];

	const grouped = new Map<string, Buff[]>();

	for (const buff of props.buffs) {
		const key = `${buff.trigger}|${buff.delaySeconds ?? ''}`;
		const bucket = grouped.get(key);
		if (bucket) bucket.push(buff);
		else grouped.set(key, [buff]);
	}

	const groups: BuffGroup[] = [...grouped.entries()].map(([key, buffs]) => {
		const first = buffs[0]!;
		const isOneOf = buffs.some(b => b.condition !== null);

		return {
			key,
			header: buildHeader(first.trigger, first.delaySeconds, isOneOf, buffs.length),
			buffs: buffs.map(resolveBuff)
		};
	});

	return groups.sort((a, b) => {
		const [aTrigger = '', aDelay = ''] = a.key.split('|');
		const [bTrigger = '', bDelay = ''] = b.key.split('|');

		const byTrigger = TRIGGER_ORDER.indexOf(aTrigger as BuffTrigger) - TRIGGER_ORDER.indexOf(bTrigger as BuffTrigger);
		if (byTrigger !== 0) return byTrigger;

		return Number(aDelay || 0) - Number(bDelay || 0);
	});
});

const hasDiseaseRisk = computed(() => !!props.buffs?.some(buff => buff.diseaseRisk));

const t = computed(() => props.lang === 'ru'
	? {
		title: 'Взаимодействие',
		perk: (name: string) => `(только со способностью «${name}»)`,
		disease: 'При использовании можно подхватить заболевание.'
	}
	: {
		title: 'Interaction',
		perk: (name: string) => `(requires the ${name} perk)`,
		disease: 'Using this object may cause a disease.'
	}
);
</script>

<template>
	<div v-if="hasBuffs" class="buffs-block">
		<div class="fo-sect-h">
			<span class="fo-bar"></span>
			<h3 class="fo-h3">{{ t.title }}</h3>
		</div>

		<div v-for="group in buffGroups" :key="group.key" class="buffs-group">
			<p class="buffs-group-header">{{ group.header }}</p>

			<ul class="buffs-list">
				<li v-for="buff in group.buffs" :key="buff.key">
					<span class="buff-name">{{ buff.name }}</span>
					<span v-if="buff.duration" class="buff-duration"> ({{ buff.duration }})</span>
					<span v-if="buff.condition" class="buff-condition"> — {{ buff.condition }}</span>

					<ul class="buff-effects">
						<li v-for="(effect, ei) in buff.effects" :key="ei">
							{{ effect.description }}
							<span v-if="effect.perk" class="buff-effect-perk">{{ t.perk(effect.perk) }}</span>
						</li>
					</ul>
				</li>
			</ul>
		</div>

		<p v-if="hasDiseaseRisk" class="buffs-disease">{{ t.disease }}</p>
	</div>
</template>

<style scoped lang="scss">
.buffs-block {
	margin-top: 2.25rem;
}

.buffs-group {
	margin-bottom: 1.25rem;

	&:last-of-type {
		margin-bottom: 0;
	}
}

.buffs-group-header {
	font-size: 1.0325rem;
	line-height: 1.6;
	margin-bottom: 0.6rem;
}

.buffs-list {
	margin: 0;
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

.buff-name {
	font-weight: 600;
	color: var(--bs-body-color);
}

.buff-duration,
.buff-condition {
	color: #a1a1aa;
}

.buff-effects {
	margin: 0.1rem 0 0;
	padding-left: 1.5rem;
	list-style-type: circle;
	color: var(--bs-body-color);
}

.buff-effect-perk {
	color: #a1a1aa;
}

.buffs-disease {
	margin: 1rem 0 0;
	font-size: 1.0325rem;
	line-height: 1.6;
	font-style: italic;
	color: var(--bs-body-color);
}
</style>
