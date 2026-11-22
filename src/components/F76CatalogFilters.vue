<script setup lang="ts">
import { computed } from 'vue';
import { RouterLink, useRoute } from 'vue-router';
import F76ServerSwitch from '@/components/F76ServerSwitch.vue';

import type { ServerFilter } from '@/types';

const props = defineProps<{
	/** Shows the "sold in support" toggle (Atomic Shop only). */
	support?: boolean
}>();

const emit = defineEmits<{
	(e: 'select-server', value: ServerFilter): void
	(e: 'toggle-support', enabled: boolean): void
}>();

const route = useRoute();
const hasSupport = computed(() => route.query.hasSupport === '1');

const supportLink = computed(() => {
	const query = { ...route.query, hasSupport: hasSupport.value ? undefined : '1', page: undefined } as Record<string, any>;
	Object.keys(query).forEach(key => query[key] === undefined && delete query[key]);
	return { path: route.path, query };
});
</script>

<template>
	<div class="catalog-filters-sticky">
		<section class="catalog-filters" aria-labelledby="catalog-filters-title">
			<h2 id="catalog-filters-title" class="catalog-filters-title">Фильтры</h2>
			<F76ServerSwitch @select="value => emit('select-server', value)" />
			<RouterLink v-if="props.support" :to="supportLink" class="support-toggle" role="switch" :aria-checked="hasSupport" @click="emit('toggle-support', !hasSupport)">
				<span class="support-toggle-track" :class="{ on: hasSupport }" aria-hidden="true"></span>
				Продается в поддержке
			</RouterLink>
		</section>
	</div>
</template>

<style scoped lang="scss">
.catalog-filters {
	background: var(--bs-block-bg);
	border-radius: var(--bs-block-border-radius);
	padding: 1rem 1.2rem 1.2rem;
}

.catalog-filters-title {
	margin: 0 0 0.75rem;
	font-size: 1rem;
	font-weight: 500;
}

.support-toggle {
	display: flex;
	align-items: center;
	gap: 0.75rem;
	margin-top: 1rem;
	color: var(--bs-body-color);
	text-decoration: none;
	transition: color 0.15s ease;

	&:hover {
		color: var(--bs-primary);
	}

	&:focus-visible {
		outline: 2px solid var(--bs-primary);
		outline-offset: 3px;
		border-radius: 4px;
	}
}

.support-toggle-track {
	position: relative;
	flex: none;
	width: 34px;
	height: 20px;
	border-radius: 10px;
	background: #22222b;
	transition: background-color 0.15s ease;

	&::after {
		content: '';
		position: absolute;
		top: 3px;
		left: 3px;
		width: 14px;
		height: 14px;
		border-radius: 50%;
		background: #8a8a94;
		transition: transform 0.15s ease, background-color 0.15s ease;
	}

	&.on {
		background: var(--bs-primary);

		&::after {
			background: #000;
			transform: translateX(14px);
		}
	}
}

// On desktop the sidebar scrolls on its own; sticking to its bottom keeps the filters in view under a long category list.
@media (min-width: 992px) {
	.catalog-filters-sticky {
		position: sticky;
		bottom: 0;
		z-index: 2;
		padding: 12px 0 16px;
		background: var(--bs-body-bg);
	}
}

@media (max-width: 991.98px) {
	.catalog-filters-sticky {
		margin-top: 12px;
	}
}
</style>
