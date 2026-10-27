<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';
import { onBeforeRouteLeave, onBeforeRouteUpdate } from 'vue-router';
import { prepareCrownCrateImage, formatEsoText, formatDurationSeconds, crownCrateTier, CROWN_GEMS_ICON } from '@/utils';

import type { CrownCrateReward } from '@/types';

const props = defineProps<{
	reward: CrownCrateReward | null;
}>();

const emit = defineEmits<{ closed: [] }>();

// The page clears its selection when the modal starts hiding; the last reward is kept so the fading modal doesn't go blank.
const shown = ref<CrownCrateReward | null>(props.reward);
watch(() => props.reward, reward => {
	if (reward) shown.value = reward;
});

const modalEl = ref<HTMLElement | null>(null);
let modal: { show(): void; hide(): void } | null = null;

onMounted(async () => {
	const { Modal } = await import('bootstrap');
	if (!modalEl.value) return;
	modal = new Modal(modalEl.value);
	modalEl.value.addEventListener('hidden.bs.modal', () => emit('closed'));
	if (props.reward) modal.show();
});

onBeforeRouteLeave(() => modal?.hide());
onBeforeRouteUpdate(() => modal?.hide());

watch(() => props.reward, reward => {
	if (reward) modal?.show();
});

const tier = computed(() => shown.value ? crownCrateTier(shown.value.tier) : null);
const description = computed(() => formatEsoText(shown.value?.descriptionRu));
const flavor = computed(() => formatEsoText(shown.value?.flavorRu));
const cooldown = computed(() => shown.value?.cooldownMs ? formatDurationSeconds(shown.value.cooldownMs / 1000, 'ru') : null);
</script>

<template>
	<div ref="modalEl" class="modal fade" tabindex="-1" aria-labelledby="crownCrateRewardTitle" aria-hidden="true">
		<div class="modal-dialog modal-dialog-centered reward-dialog">
			<div v-if="shown" class="modal-content">
				<div class="modal-header">
					<div>
						<h2 id="crownCrateRewardTitle" class="modal-title reward-title">
							{{ shown.nameRu }}<span v-if="shown.count > 1" class="reward-count"> ×{{ shown.count }}</span>
						</h2>
						<div class="reward-title-en">{{ shown.nameEn }}</div>
					</div>
					<button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Закрыть"></button>
				</div>
				<div class="modal-body">
					<img v-if="shown.image" :src="prepareCrownCrateImage(shown.image)" :alt="shown.nameRu" width="1024" height="512" class="reward-image">
					<div class="reward-meta">
						<span v-if="tier" class="reward-tier" :style="{ color: tier.color }">{{ tier.ru }}</span>
						<span class="reward-type">{{ shown.typeRu }}</span>
					</div>
					<div v-if="description" class="reward-description" v-html="description"></div>
					<div v-if="cooldown" class="reward-cooldown">Перезарядка: {{ cooldown }}</div>
					<div v-if="flavor" class="reward-flavor" v-html="flavor"></div>
					<div class="reward-gems">
						<div v-if="shown.price">Стоимость: <strong>{{ shown.price }}</strong> <img :src="CROWN_GEMS_ICON" alt="кронных самоцветов" width="16" height="16"></div>
						<div v-else>Нельзя купить за кронные самоцветы.</div>
						<div v-if="shown.extraction">Извлечение самоцветов: <strong>{{ shown.extraction }}</strong> <img :src="CROWN_GEMS_ICON" alt="кронных самоцветов" width="16" height="16"></div>
					</div>
				</div>
			</div>
		</div>
	</div>
</template>

<style scoped lang="scss">
// As wide as the store picture (1024 px) plus the body padding.
.reward-dialog {
	max-width: min(calc(1024px + 3.5rem + 2px), calc(100vw - 1rem));
}

.modal-header {
	padding: 1.25rem 1.75rem;
	border-bottom-color: #6b6b6b33;
}

.modal-body {
	padding: 1.75rem;
}

.reward-title {
	font-size: 1.45rem;
	font-weight: 600;
	margin-bottom: 0.2rem;
}

.reward-count {
	color: var(--bs-secondary-color);
}

.reward-title-en {
	color: var(--bs-secondary-color);
	font-size: 0.95rem;
}

.reward-image {
	display: block;
	width: 100%;
	height: auto;
	aspect-ratio: 2 / 1;
	border-radius: var(--bs-border-radius);
	margin-bottom: 1.5rem;
}

.reward-meta {
	display: flex;
	flex-wrap: wrap;
	gap: 0.25rem 1.25rem;
	margin-bottom: 1rem;
	font-weight: 500;
}

.reward-type {
	color: var(--bs-secondary-color);
}

.reward-description,
.reward-cooldown,
.reward-flavor {
	line-height: 1.65;
	margin-bottom: 1rem;
}

.reward-flavor {
	font-style: italic;
	color: var(--bs-secondary-color);
}

.reward-gems {
	display: flex;
	flex-wrap: wrap;
	gap: 0.5rem 2rem;
	margin-top: 1.5rem;
	padding-top: 1.25rem;
	border-top: 1px solid #6b6b6b33;

	img {
		vertical-align: -2px;
	}
}
</style>
