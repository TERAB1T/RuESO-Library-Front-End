<script setup lang="ts">
import { computed } from 'vue';
import { formatDurationSeconds } from '@/utils';

import type { Ally, AllyVendorVisitor, ArcadeGame, Buff, BuffEffect, BuffTrigger, BuffCondition, BuffPlayerType, WaterSource } from '@/types';

const props = defineProps<{
	buffs: Buff[] | null;
	arcadeGame: ArcadeGame | null;
	waterSource: WaterSource | null;
	ally: Ally | null;
	lang: 'ru' | 'en';
}>();

const TRIGGER_ORDER: BuffTrigger[] = ['whileUsing', 'afterDelay', 'onActivate', 'onPassThrough', 'onDrink'];

const INSTANT_DURATION_MAX = 1;

const pick = (ru: string | null | undefined, en: string | null | undefined) =>
	props.lang === 'ru' ? (ru || en) : (en || ru);

const hasBuffs = computed(() => !!props.buffs && props.buffs.length > 0);
const hasArcadeGame = computed(() => !!props.arcadeGame);
const hasContent = computed(() => hasBuffs.value || hasArcadeGame.value || !!props.waterSource || !!props.ally);

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
	duration: string | null;
	perk: string | null;
	playerType: string | null;
}

interface ResolvedBuff {
	key: string;
	name: string;
	duration: string | null;
	cooldown: string | null;
	condition: string | null;
	effects: ResolvedEffect[];
}

interface BuffGroup {
	key: string;
	header: string;
	buffs: ResolvedBuff[];
}

const formatDuration = (duration: number): string | null =>
	duration > INSTANT_DURATION_MAX ? formatDurationSeconds(duration, props.lang) : null;

const resolveEffect = (effect: BuffEffect, showDuration: boolean): ResolvedEffect => ({
	description: pick(effect.description.ru, effect.description.en) || '—',
	duration: showDuration ? formatDuration(effect.duration) : null,
	perk: effect.requiresPerk ? pick(effect.requiresPerk.name.ru, effect.requiresPerk.name.en) ?? null : null,
	playerType: effect.playerType ? t.value.playerType[effect.playerType] ?? null : null
});

const resolveBuff = (buff: Buff, index: number): ResolvedBuff => {
	// A shared duration is shown once next to the buff name; water spells mix instant and timed effects.
	const sharedDuration = buff.effects.every(e => e.duration === buff.effects[0]?.duration);

	return {
		key: `${buff.spellFormId}-${index}`,
		name: pick(buff.name.ru, buff.name.en) || '—',
		duration: sharedDuration ? formatDuration(buff.effects[0]?.duration ?? 0) : null,
		cooldown: buff.cooldownSeconds ? formatDurationSeconds(buff.cooldownSeconds, props.lang) : null,
		condition: conditionLabel(buff.condition),
		effects: buff.effects.map(e => resolveEffect(e, !sharedDuration))
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
				return `При прохождении через этот объект вы получаете ${gained}:`;
			case 'onDrink':
				return `Из этого объекта можно пить. Вы получаете ${gained}:`;
			default:
				return `Этот объект дает ${gained}:`;
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
		case 'onDrink':
			return `You can drink from this object. You gain${oneOf}:`;
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

const arcadeInfo = computed(() => {
	if (!props.arcadeGame) return null;

	return {
		name: pick(props.arcadeGame.name.ru, props.arcadeGame.name.en) || '—',
		description: pick(props.arcadeGame.description.ru, props.arcadeGame.description.en) || '—',
		pointsDescription: pick(props.arcadeGame.pointsDescription.ru, props.arcadeGame.pointsDescription.en) || ''
	};
});

const waterText = computed(() => {
	if (!props.waterSource) return null;

	const { collectItem, collectRadiationDamage } = props.waterSource;
	const collect = t.value.waterCollect(pick(collectItem.ru, collectItem.en) || '—');

	return collectRadiationDamage != null ? `${collect} ${t.value.waterRadiation(collectRadiationDamage)}` : collect;
});

const visitorCondition = (visitor: AllyVendorVisitor): string => {
	if (visitor.byStory) return t.value.visitorByStory;
	if (visitor.beforeAnyQuest) return t.value.visitorBeforeAnyQuest;

	const ownerName = visitor.questsOf ? pick(visitor.questsOf.name.ru, visitor.questsOf.name.en) || '—' : null;
	return t.value.visitorAfterQuests(visitor.afterQuests ?? 0, ownerName);
};

const allyInfo = computed(() => {
	if (!props.ally) return null;

	const lines: string[] = [];
	if (props.ally.isVendor) lines.push(t.value.allyVendor);
	if (props.ally.hasRomance) lines.push(t.value.allyRomance);
	for (const visitor of props.ally.vendorVisitors)
		lines.push(t.value.allyVisitor(pick(visitor.name.ru, visitor.name.en) || '—', visitor.spawnChance, visitorCondition(visitor)));

	return {
		name: pick(props.ally.name.ru, props.ally.name.en) || '—',
		lines
	};
});

const t = computed(() => props.lang === 'ru'
	? {
		title: 'Взаимодействие',
		perk: (name: string) => `(только со способностью «${name}»)`,
		cooldown: (time: string) => `перезарядка: ${time}`,
		playerType: { human: '(только для людей)', ghoul: '(только для гулей)' } as Record<BuffPlayerType, string>,
		disease: 'При использовании можно подхватить заболевание.',
		waterCollect: (name: string) => `Из этого объекта можно набрать грязную воду (1 ед.).`,
		waterRadiation: (damage: number) => `При наборе вы получаете ${damage} ед. урона от радиации.`,
		arcadeIntro: 'Этот объект — игровой автомат «Ядер-Аркады», и с ним можно взаимодействовать. Каждая игра стоит 1 крышку.',
		allyIntro: 'Этот объект поселяет в вашем C.A.M.P. союзника:',
		allyVendor: 'Торгует за крышки',
		allyRomance: 'Можно завести роман',
		allyVisitor: (name: string, chance: number, condition: string) => `Иногда приходит гость-торговец «${name}» (шанс ${chance}%, ${condition})`,
		visitorAfterQuests: (count: number, owner: string | null) =>
			`после выполнения ${count} ${count === 1 ? 'задания' : 'заданий'}${owner ? ` союзника «${owner}»` : ''}`,
		visitorBeforeAnyQuest: 'пока не выполнено ни одного задания',
		visitorByStory: 'в зависимости от выбора в заданиях'
	}
	: {
		title: 'Interaction',
		perk: (name: string) => `(requires the ${name} perk)`,
		cooldown: (time: string) => `cooldown: ${time}`,
		playerType: { human: '(humans only)', ghoul: '(ghouls only)' } as Record<BuffPlayerType, string>,
		disease: 'Using this object may cause a disease.',
		waterCollect: (name: string) => `You can collect dirty water (1 unit) from this object.`,
		waterRadiation: (damage: number) => `Collecting it deals ${damage} radiation damage.`,
		arcadeIntro: 'This object is a Nuka-Cade arcade machine, and you can interact with it. Each game costs 1 cap.',
		allyIntro: 'This object brings an ally to your C.A.M.P.:',
		allyVendor: 'Sells items for caps',
		allyRomance: 'Can be romanced',
		allyVisitor: (name: string, chance: number, condition: string) => `A visiting merchant, ${name}, sometimes comes by (${chance}% chance, ${condition})`,
		visitorAfterQuests: (count: number, owner: string | null) =>
			`after completing ${count} ${count === 1 ? 'quest' : 'quests'}${owner ? ` for ${owner}` : ''}`,
		visitorBeforeAnyQuest: 'only until any of the quests is completed',
		visitorByStory: 'depending on your choices in quests'
	}
);
</script>

<template>
	<div v-if="hasContent" class="buffs-block">
		<div class="fo-sect-h">
			<span class="fo-bar"></span>
			<h3 class="fo-h3">{{ t.title }}</h3>
		</div>

		<div v-if="allyInfo" class="buffs-group">
			<p class="buffs-group-header">{{ t.allyIntro }}</p>

			<ul class="buffs-list">
				<li>
					<span class="buff-name">{{ allyInfo.name }}</span>

					<ul v-if="allyInfo.lines.length" class="buff-effects">
						<li v-for="(line, li) in allyInfo.lines" :key="li">{{ line }}</li>
					</ul>
				</li>
			</ul>
		</div>

		<div v-if="arcadeInfo" class="buffs-group">
			<p class="buffs-group-header">{{ t.arcadeIntro }}</p>

			<ul class="buffs-list">
				<li>
					<span class="buff-name">{{ arcadeInfo.name }}</span>

					<ul class="buff-effects">
						<li>{{ arcadeInfo.description }}</li>
					</ul>
				</li>
			</ul>

			<p v-if="arcadeInfo.pointsDescription" class="buffs-group-note">{{ arcadeInfo.pointsDescription }}</p>
		</div>

		<div v-for="group in buffGroups" :key="group.key" class="buffs-group">
			<p class="buffs-group-header">{{ group.header }}</p>

			<ul class="buffs-list">
				<li v-for="buff in group.buffs" :key="buff.key">
					<span class="buff-name">{{ buff.name }}</span>
					<span v-if="buff.duration" class="buff-duration"> ({{ buff.duration }})</span>
					<span v-if="buff.cooldown" class="buff-duration"> ({{ t.cooldown(buff.cooldown) }})</span>
					<span v-if="buff.condition" class="buff-condition"> — {{ buff.condition }}</span>

					<ul class="buff-effects">
						<li v-for="(effect, ei) in buff.effects" :key="ei">
							{{ effect.description }}
							<span v-if="effect.duration" class="buff-duration">({{ effect.duration }})</span>
							<span v-if="effect.perk" class="buff-effect-perk">{{ t.perk(effect.perk) }}</span>
							<span v-if="effect.playerType" class="buff-effect-perk">{{ effect.playerType }}</span>
						</li>
					</ul>
				</li>
			</ul>
		</div>

		<div v-if="waterText" class="buffs-group">
			<p class="buffs-group-header">{{ waterText }}</p>
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

// Closing paragraph after the list: Bootstrap resets p margin-top to 0 and the
// list has no bottom margin, so the gap has to be restored explicitly.
.buffs-group-note {
	font-size: 1.0325rem;
	line-height: 1.6;
	margin: 0.6rem 0 0;
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
