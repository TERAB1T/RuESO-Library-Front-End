<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, toRef, watch } from 'vue';
import { useRouter } from 'vue-router';
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

const { data: subItem, isPending } = useFetchCampSubItem(toRef(props, 'formId'));

const queryClient = useQueryClient();
const prefetchCampItem = (formId: string) => usePrefetchCampItem(queryClient, formId);

const modalEl = ref<HTMLElement | null>(null);
let modal: { show(): void; hide(): void; dispose(): void } | null = null;

// Navigating with the modal open would remount the page under it and leave the backdrop behind, so links close it first.
const router = useRouter();
let pendingPath: string | null = null;

const goTo = (path: string) => {
	pendingPath = path;
	modal?.hide();
};

const onHidden = () => {
	emit('closed');
	if (pendingPath) router.push(pendingPath);
	pendingPath = null;
};

onMounted(async () => {
	const { Modal } = await import('bootstrap');
	if (!modalEl.value) return;
	modal = new Modal(modalEl.value);
	modalEl.value.addEventListener('hidden.bs.modal', onHidden);
	if (props.formId) modal.show();
});

onBeforeUnmount(() => {
	modalEl.value?.removeEventListener('hidden.bs.modal', onHidden);
	modal?.dispose();
});

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
	HAT: ['Головной убор', 'Hat'],
};

const title = computed(() => props.rowName || pick(subItem.value?.nameRu, subItem.value?.nameEn) || '');
const typeLabel = computed(() => {
	const type = subItem.value?.type;
	const pair = type ? typeLabels[type] : undefined;
	return pair ? (ru.value ? pair[0] : pair[1]) : null;
});

const imageFile = computed(() => {
	if (!props.formId) return null;
	const numeric = parseInt(props.formId, 16) & 0x00FFFFFF;
	return numeric.toString(16).padStart(8, '0') + '.webp';
});
const imageSrc = computed(() => prepareCampImage(imageFile.value, 512));

const description = computed(() => pick(subItem.value?.descriptionRu, subItem.value?.descriptionEn));

const SURVIVAL_LABELS: Record<string, [ru: string, en: string]> = {
	hunger: ['Сытость', 'Food'],
	thirst: ['Утоление жажды', 'Hydration'],
	rads: ['Радиация', 'Rads'],
	disease: ['Шанс болезни', 'Disease chance'],
	feral: ['Дикость', 'Feral'],
};

const CONDITION_LABELS: Record<string, [ru: string, en: string]> = {
	ghoul: ['только для гулей', 'ghouls only'],
	notGhoul: ['кроме гулей', 'not for ghouls'],
	night: ['ночью', 'at night'],
	ally: ['при наличии союзника', 'with an ally'],
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
	if (e.requiresPerk) {
		const rank = e.requiresPerk.rank ? (ru.value ? `, ранг ${e.requiresPerk.rank}` : `, rank ${e.requiresPerk.rank}`) : '';
		notes.push(ru.value ? `с перком «${loc(e.requiresPerk.name)}»${rank}` : `with the ${loc(e.requiresPerk.name)} perk${rank}`);
	}
	if (e.condition) notes.push(ru.value ? CONDITION_LABELS[e.condition]![0] : CONDITION_LABELS[e.condition]![1]);
	return notes.join(', ');
};

const consumable = computed(() => subItem.value?.details?.consumable ?? null);

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
						<div v-if="isPending && formId" class="skeleton placeholder-glow">
							<span class="placeholder col-4"></span>
							<span class="placeholder col-12"></span>
							<span class="placeholder col-10"></span>
							<span class="placeholder col-8"></span>
						</div>

						<template v-else-if="subItem">
							<p v-if="description" class="subitem-description">{{ description }}</p>

							<div v-if="typeLabel" class="subitem-row">
								<span class="subitem-label">{{ ru ? 'Тип' : 'Type' }}</span>
								<span class="subitem-value">{{ typeLabel }}</span>
							</div>

							<div v-if="consumable && consumable.effects.length" class="subitem-row">
								<span class="subitem-label">{{ ru ? 'Эффекты' : 'Effects' }}</span>
								<ul class="subitem-value subitem-list">
									<li v-for="(e, i) in consumable.effects" :key="i">
										{{ effectText(e) }}
										<span v-if="effectNote(e)" class="subitem-note">{{ effectNote(e) }}</span>
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
								<span class="subitem-value">{{ valueText }}</span>
							</div>

							<div v-if="usedElsewhere.length" class="subitem-row">
								<span class="subitem-label">{{ ru ? 'Также встречается' : 'Also found in' }}</span>
								<ul class="subitem-value subitem-list">
									<li v-for="i in usedElsewhere" :key="i.formId">
										<a :href="`/f76-camp/${i.formId}-${i.slug}`" @click.prevent="goTo(`/f76-camp/${i.formId}-${i.slug}`)" @mouseenter="prefetchCampItem(i.formId)">{{ pick(i.nameRu, i.nameEn) }}</a>
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
	margin: 0 0 0.5rem;
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

.subitem-list {
	list-style: none;
	margin: 0;
	padding: 0;

	li + li {
		margin-top: 0.2rem;
	}
}

.subitem-note {
	display: block;
	font-size: 0.8rem;
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
