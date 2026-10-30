<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';
import { RouterLink, onBeforeRouteLeave, onBeforeRouteUpdate } from 'vue-router';
import { useQueryClient } from '@tanstack/vue-query';
import { useFetchCampSubItem, usePrefetchCampItem } from '@/composables/useApi';
import { prepareCampImage, atomicShopHandleImageError, pluralizeRu, formatDurationSeconds } from '@/utils';
import type { CampSubItemEffect, LocalizedName } from '@/types';

const props = defineProps<{
	formId: string | null;
	// Name of the clicked row: weapon rows carry a variant suffix the item itself doesn't have.
	rowName: string | null;
	currentItemFormId: string;
	lang: 'ru' | 'en';
}>();

const emit = defineEmits<{ closed: [] }>();

// The page clears its selection as soon as it moves to another item, while the modal is still fading out;
// the last item is kept so the closing modal doesn't go blank.
const shownFormId = ref(props.formId);
const shownRowName = ref(props.rowName);
watch(() => props.formId, formId => {
	if (!formId) return;
	shownFormId.value = formId;
	shownRowName.value = props.rowName;
});

const { data: subItem, isPending } = useFetchCampSubItem(shownFormId);

const queryClient = useQueryClient();
const prefetchCampItem = (formId: string) => usePrefetchCampItem(queryClient, formId);

const modalEl = ref<HTMLElement | null>(null);
let modal: { show(): void; hide(): void } | null = null;

onMounted(async () => {
	const { Modal } = await import('bootstrap');
	if (!modalEl.value) return;
	modal = new Modal(modalEl.value);
	modalEl.value.addEventListener('hidden.bs.modal', () => emit('closed'));
	if (props.formId) modal.show();
});

// Same as the Atomic Shop support modal; the update guard also covers moving to another item (same route).
onBeforeRouteLeave(() => modal?.hide());
onBeforeRouteUpdate(() => modal?.hide());

watch(() => props.formId, formId => {
	if (formId) modal?.show();
});

const ru = computed(() => props.lang === 'ru');
const pick = (ruText: string | null | undefined, enText: string | null | undefined) =>
	ru.value ? (ruText || enText) : (enText || ruText);
const loc = (name: LocalizedName | null | undefined) => pick(name?.ru, name?.en) ?? '';

const num = (value: number) => value.toLocaleString(ru.value ? 'ru-RU' : 'en-US', { maximumFractionDigits: 2 });
const signed = (value: number) => (value > 0 ? '+' : value < 0 ? '−' : '') + num(Math.abs(value));

const typeLabels: Record<string, [ru: string, en: string]> = {
	ALCH: ['Расходуемый предмет', 'Consumable'],
	FOOD: ['Пища', 'Food'],
	CHEM: ['Препарат', 'Chem'],
	DRINK: ['Напиток', 'Drink'],
	MAGAZINE: ['Журнал', 'Magazine'],
	MISC: ['Разное', 'Misc'],
	AMMO: ['Боеприпасы', 'Ammo'],
	WEAP: ['Оружие', 'Weapon'],
	ARMO: ['Броня', 'Armor'],
	BOOK: ['Записка', 'Note'],
	RECIPE: ['Схема или рецепт', 'Plan or recipe'],
	NOTE: ['Голозапись', 'Holotape'],
	HAT: ['Головной убор', 'Hat'],
};

const title = computed(() => shownRowName.value || pick(subItem.value?.nameRu, subItem.value?.nameEn) || '');
const typeLabel = computed(() => {
	const type = subItem.value?.type;
	const pair = type ? typeLabels[type] : undefined;
	return pair ? (ru.value ? pair[0] : pair[1]) : null;
});

const imageFile = computed(() => {
	if (!shownFormId.value) return null;
	const numeric = parseInt(shownFormId.value, 16) & 0x00FFFFFF;
	return numeric.toString(16).padStart(8, '0') + '.webp';
});
const imageSrc = computed(() => prepareCampImage(imageFile.value, 512));

// Note texts pad paragraphs with runs of empty lines; keep at most one between them.
const description = computed(() => pick(subItem.value?.descriptionRu, subItem.value?.descriptionEn)?.replace(/\r\n?/g, '\n').replace(/\n{3,}/g, '\n\n').trim());

const SURVIVAL_LABELS: Record<string, [ru: string, en: string]> = {
	hunger: ['Сытость', 'Food'],
	thirst: ['Утоление жажды', 'Hydration'],
	rads: ['Радиация', 'Rads'],
	disease: ['Шанс болезни', 'Disease chance'],
	feral: ['Дикость', 'Feral'],
};

const CONDITION_LABELS: Record<string, [ru: string, en: string]> = {
	ghoul: ['только для гулей', 'ghouls only'],
	notGhoul: ['только для людей', 'humans only'],
	night: ['ночью', 'at night'],
	ally: ['при наличии союзника', 'with an ally'],
	team: ['в команде', 'while in a team'],
	drunk: ['под действием алкоголя', 'while drunk'],
};

const effectText = (e: CampSubItemEffect) => {
	let text: string;
	if (e.kind) {
		const label = ru.value ? SURVIVAL_LABELS[e.kind]![0] : SURVIVAL_LABELS[e.kind]![1];
		text = e.kind === 'rads' ? `${label} ${signed(e.magnitude)}`
			: e.kind === 'disease' ? `${label} ${num(e.magnitude)}%`
				: `${label} ${signed(e.magnitude)}%`;
	} else {
		text = loc(e.description);
		if (e.duration > 0) text += ` (${formatDurationSeconds(e.duration, props.lang)})`;
	}
	return text;
};

const effectNote = (e: CampSubItemEffect) => {
	const notes: string[] = [];
	// Game terms: Perk = «способность», a perk card rank = «уровень».
	if (e.requiresPerk) {
		const rank = e.requiresPerk.rank ? (ru.value ? ` (уровень ${e.requiresPerk.rank})` : ` (rank ${e.requiresPerk.rank})`) : '';
		notes.push(ru.value ? `со способностью «${loc(e.requiresPerk.name)}»${rank}` : `with the ${loc(e.requiresPerk.name)} perk${rank}`);
	}
	if (e.condition) notes.push(ru.value ? CONDITION_LABELS[e.condition]![0] : CONDITION_LABELS[e.condition]![1]);
	return notes.join(', ');
};

const consumable = computed(() => subItem.value?.details?.consumable ?? null);

// Unconditional survival stats (fixed order), then other unconditional effects, then everything with a condition.
// Conditional effects sharing a condition (or a perk) stay together at the first of them; perk levels go up; otherwise the game's order.
const SURVIVAL_ORDER = ['hunger', 'thirst', 'rads', 'disease', 'feral'];
const conditionKey = (e: CampSubItemEffect) =>
	e.requiresPerk || e.condition ? `${e.requiresPerk?.name?.en ?? ''}|${e.condition ?? ''}` : null;
const survivalRank = (e: CampSubItemEffect) => (e.kind ? SURVIVAL_ORDER.indexOf(e.kind) : SURVIVAL_ORDER.length);
const sortedEffects = computed(() => {
	const effects = consumable.value?.effects ?? [];
	const keyed = effects.map((e, i) => ({ e, i, key: conditionKey(e) }));
	const firstIndex = (key: string) => keyed.find(x => x.key === key)!.i;
	const group = (x: typeof keyed[number]) => (x.key ? 2 : x.e.kind ? 0 : 1);
	return keyed
		.sort((a, b) => group(a) - group(b)
			|| (a.key && b.key ? firstIndex(a.key) - firstIndex(b.key) : 0)
			|| survivalRank(a.e) - survivalRank(b.e)
			|| (a.e.requiresPerk?.rank ?? 0) - (b.e.requiresPerk?.rank ?? 0)
			|| a.i - b.i)
		.map(x => x.e);
});

const spoilText = computed(() => {
	const c = consumable.value;
	if (!c || c.spoilMinutes == null) return null;
	const time = formatDurationSeconds(c.spoilMinutes * 60, props.lang);
	const into = c.spoilsInto ? loc(c.spoilsInto.name) : null;
	if (c.ferments)
		return ru.value ? `Бродит ${time}, затем превращается в «${into}»` : `Ferments for ${time}, then turns into ${into}`;
	return ru.value
		? `Портится через ${time}${into ? ` и превращается в «${into}»` : ''}`
		: `Spoils in ${time}${into ? ` and turns into ${into}` : ''}`;
});

const addictionText = computed(() => {
	const a = consumable.value?.addiction;
	if (!a) return null;
	const name = loc(a.name);
	const chance = `${num(a.chance * 100)}%`;
	return name ? `${name} — ${ru.value ? 'шанс' : 'chance'} ${chance}` : chance;
});

const valueText = computed(() => {
	const value = subItem.value?.value;
	if (value == null) return null;
	return ru.value ? `${value} ${pluralizeRu(value, ['крышка', 'крышки', 'крышек'])}` : `${value} caps`;
});

const usedElsewhere = computed(() => (subItem.value?.usedIn ?? []).filter(i => i.formId !== props.currentItemFormId));
</script>

<template>
	<div ref="modalEl" class="modal fade" tabindex="-1" aria-labelledby="subItemModalTitle" aria-hidden="true">
		<div class="modal-dialog modal-dialog-centered modal-xl">
			<div class="modal-content">
				<div class="modal-header subitem-header">
					<h2 id="subItemModalTitle" class="modal-title fs-5">{{ title }}</h2>
					<button type="button" class="btn-close" data-bs-dismiss="modal" :aria-label="ru ? 'Закрыть' : 'Close'"></button>
				</div>
				<div class="modal-body subitem-body">
					<div class="subitem-image">
						<img :key="imageSrc" :src="imageSrc" :alt="title" width="512" height="512" @error="atomicShopHandleImageError">
					</div>

					<div class="subitem-props">
						<div v-if="isPending && shownFormId" class="skeleton placeholder-glow">
							<span class="placeholder col-4"></span>
							<span class="placeholder col-12"></span>
							<span class="placeholder col-10"></span>
							<span class="placeholder col-8"></span>
						</div>

						<template v-else-if="subItem">
							<div v-if="typeLabel" class="subitem-row">
								<span class="subitem-label">{{ ru ? 'Тип' : 'Type' }}</span>
								<span class="subitem-value">{{ typeLabel }}</span>
							</div>

							<div class="subitem-row">
								<span class="subitem-label">{{ ru ? 'Оригинальное название' : 'Original name' }}</span>
								<span class="subitem-value">{{ subItem.nameEn || '—' }}</span>
							</div>

							<div v-if="consumable && consumable.effects.length" class="subitem-row">
								<span class="subitem-label">{{ ru ? 'Эффекты' : 'Effects' }}</span>
								<ul class="subitem-value subitem-list">
									<li v-for="(e, i) in sortedEffects" :key="i">
										{{ effectText(e) }}<span v-if="effectNote(e)" class="subitem-note"> — {{ effectNote(e) }}</span>
									</li>
								</ul>
							</div>

							<div v-if="spoilText" class="subitem-row">
								<span class="subitem-label">{{ consumable?.ferments ? (ru ? 'Брожение' : 'Fermentation') : (ru ? 'Порча' : 'Spoilage') }}</span>
								<span class="subitem-value">{{ spoilText }}</span>
							</div>

							<div v-if="addictionText" class="subitem-row">
								<span class="subitem-label">{{ ru ? 'Зависимость' : 'Addiction' }}</span>
								<span class="subitem-value">{{ addictionText }}</span>
							</div>

							<div v-if="subItem.details?.components" class="subitem-row">
								<span class="subitem-label">{{ ru ? 'Компоненты' : 'Components' }}</span>
								<ul class="subitem-value subitem-list">
									<li v-for="c in subItem.details.components" :key="c.formId">{{ loc(c.name) }} ({{ c.count }})</li>
								</ul>
							</div>

							<div v-if="subItem.details?.ammo" class="subitem-row">
								<span class="subitem-label">{{ ru ? 'Боеприпасы' : 'Ammo' }}</span>
								<span class="subitem-value">{{ loc(subItem.details.ammo.name) }}</span>
							</div>

							<div v-if="subItem.weight != null" class="subitem-row">
								<span class="subitem-label">{{ ru ? 'Вес' : 'Weight' }}</span>
								<span class="subitem-value">{{ num(subItem.weight) }}</span>
							</div>

							<div v-if="valueText" class="subitem-row">
								<span class="subitem-label">{{ ru ? 'Цена' : 'Value' }}</span>
								<span class="subitem-value subitem-caps" :title="valueText">{{ subItem.value }}<span class="visually-hidden"> {{ valueText }}</span></span>
							</div>

							<div v-if="usedElsewhere.length" class="subitem-row">
								<span class="subitem-label">{{ ru ? 'Также встречается' : 'Also found in' }}</span>
								<ul class="subitem-value subitem-list">
									<li v-for="i in usedElsewhere" :key="i.formId">
										<RouterLink :to="`/f76-camp/${i.formId}-${i.slug}`" @mouseenter="prefetchCampItem(i.formId)">{{ pick(i.nameRu, i.nameEn) }}</RouterLink>
									</li>
								</ul>
							</div>

							<div class="subitem-row">
								<span class="subitem-label">Form ID</span>
								<span class="subitem-value">{{ subItem.formId }}</span>
							</div>
							<div class="subitem-row">
								<span class="subitem-label">Editor ID</span>
								<span class="subitem-value"><template v-for="(part, index) in (subItem.editorId ?? '').split('_')" :key="index"><template v-if="index">_<wbr></template>{{ part }}</template></span>
							</div>

							<p v-if="description" class="subitem-description">{{ description }}</p>
						</template>
					</div>
				</div>
			</div>
		</div>
	</div>
</template>

<style scoped lang="scss">
.subitem-header {
	padding: 20px 30px;
}

.subitem-body {
	display: flex;
	gap: 1.5rem;
	padding: 24px 30px 30px;
}

.subitem-image {
	flex: 0 1 512px;
	min-width: 240px;
	align-self: flex-start;
	background: rgba(255, 255, 255, 0.03);
	border-radius: 6px;

	img {
		display: block;
		width: 100%;
		height: auto;
		aspect-ratio: 1;
		object-fit: contain;
	}
}

.subitem-props {
	flex: 1;
	min-width: 0;
}

.subitem-description {
	font-size: 0.95rem;
	line-height: 1.5;
	margin: 1rem 0 0;
	white-space: pre-line;
}

.subitem-row {
	display: flex;
	gap: 1rem;
	padding: 0.5rem 0;
	border-bottom: 1px solid rgba(255, 255, 255, 0.08);
	font-size: 0.875rem;

	&:last-child {
		border-bottom: 0;
	}
}

.subitem-label {
	flex: 0 0 9.5rem;
	color: #a1a1aa;
}

.subitem-value {
	flex: 1;
	min-width: 0;
}

.subitem-caps::after {
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

.subitem-list {
	list-style: none;
	margin: 0;
	padding: 0;

	li + li {
		margin-top: 0.2rem;
	}
}

.subitem-note {
	color: #a1a1aa;
}

@media (max-width: 767.98px) {
	.subitem-header {
		padding: 16px;
	}

	.subitem-body {
		flex-direction: column;
		padding: 16px;
	}

	.subitem-image {
		flex-basis: auto;
		width: 100%;
		max-width: 320px;
		min-width: 0;
		align-self: center;
	}

	.subitem-label {
		flex-basis: 7.5rem;
	}
}
</style>
