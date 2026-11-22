<script setup lang="ts">
import { computed } from 'vue';
import { RouterLink, useRoute } from 'vue-router';
import { getServerFilter, serverFilterParam } from '@/utils';

import type { ServerFilter } from '@/types';

const OPTIONS: { value: ServerFilter, label: string, hint: string }[] = [
	{ value: 'all', label: 'Live+PTS', hint: 'Всё, что есть в игре, вместе с новинками с PTS.' },
	{ value: 'live', label: 'Live', hint: 'Только то, что уже есть на основных серверах.' },
	{ value: 'pts', label: 'PTS', hint: 'Только новинки публичного тестового сервера.' }
];

const emit = defineEmits<{
	(e: 'select', value: ServerFilter): void
}>();

const route = useRoute();

const current = computed(() => getServerFilter(route.query.isPTS));
const currentHint = computed(() => OPTIONS.find(option => option.value === current.value)!.hint);

const linkTo = (server: ServerFilter) => {
	const query = { ...route.query, isPTS: serverFilterParam(server), page: undefined } as Record<string, any>;
	Object.keys(query).forEach(key => query[key] === undefined && delete query[key]);
	return { path: route.path, query };
};
</script>

<template>
	<div>
		<div class="server-switch" role="group" aria-label="Сервер">
			<RouterLink v-for="option in OPTIONS" :key="option.value" :to="linkTo(option.value)" class="server-switch-option" :class="{ active: current === option.value }" :aria-current="current === option.value ? 'true' : undefined" @click="emit('select', option.value)">
				{{ option.label }}
			</RouterLink>
		</div>
		<p class="server-switch-hint text-muted small">{{ currentHint }}</p>
	</div>
</template>

<style scoped lang="scss">
.server-switch {
	display: flex;
	gap: 2px;
	padding: 3px;
	background: #22222b;
	border-radius: 8px;
}

.server-switch-option {
	flex: 1 1 0;
	padding: 0.375rem 0.5rem;
	border-radius: 6px;
	color: var(--bs-body-color);
	text-align: center;
	text-decoration: none;
	transition: color 0.15s ease, background-color 0.15s ease;

	&:hover:not(.active) {
		color: var(--bs-primary);
	}

	&:focus-visible {
		outline: 2px solid var(--bs-primary);
		outline-offset: 1px;
	}

	&.active {
		background: var(--bs-primary);
		color: #000;
	}
}

.server-switch-hint {
	margin: 0.5rem 0 0;
	line-height: 1.35;
}
</style>
