<script setup lang="ts">
import { RouterLink } from 'vue-router';
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome';
import { faChevronRight } from '@fortawesome/free-solid-svg-icons';

import type { BreadcrumbItem } from '@/types';

defineProps<{
	items: BreadcrumbItem[];
}>();
</script>

<template>
	<nav aria-label="breadcrumb" class="breadcrumb-nav">
		<ol class="breadcrumb-custom">
			<li v-for="(item, index) in items" :key="index" class="breadcrumb-custom-item">
				<FontAwesomeIcon v-if="index > 0" :icon="faChevronRight" class="breadcrumb-separator" />

				<RouterLink v-if="item.to" :to="item.to" class="breadcrumb-custom-link">
					{{ item.label }}
				</RouterLink>

				<span v-else class="breadcrumb-custom-active">
					{{ item.label }}
				</span>
			</li>
		</ol>
	</nav>
</template>

<style scoped>
.breadcrumb-nav {
	margin-top: 0.5rem;
	margin-bottom: 0.5rem;
}

.breadcrumb-custom {
	display: flex;
	flex-wrap: wrap;
	align-items: center;
	padding: 0.75rem 1rem;
	margin: 0;
	list-style: none;
	background-color: transparent;
	border-radius: 8px;
	font-size: 0.9rem;
}

.breadcrumb-custom-item {
	display: flex;
	align-items: center;
}

.breadcrumb-separator {
	color: #71717a;
	font-size: 0.7rem;
	margin: 0 0.5rem;
	max-height: .7rem;
}

.breadcrumb-custom-link {
	color: #a1a1aa;
	text-decoration: none;
	transition: color 0.2s ease;
}

.breadcrumb-custom-link:hover {
	color: var(--bs-primary);
	text-decoration: none;
}

.breadcrumb-custom-active {
	color: #71717a;
	font-weight: 500;
}
</style>
