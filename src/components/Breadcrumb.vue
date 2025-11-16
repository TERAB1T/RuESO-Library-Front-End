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
				<svg v-if="index > 0" class="breadcrumb-separator" viewBox="0 0 320 512" fill="currentColor">
					<path d="M310.6 233.4c12.5 12.5 12.5 32.8 0 45.3l-192 192c-12.5 12.5-32.8 12.5-45.3 0s-12.5-32.8 0-45.3L242.7 256 73.4 86.6c-12.5-12.5-12.5-32.8 0-45.3s32.8-12.5 45.3 0l192 192z" />
				</svg>

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
	flex-wrap: nowrap;
	align-items: center;
	padding: 0.75rem 1rem;
	margin: 0;
	list-style: none;
	background-color: transparent;
	border-radius: 8px;
	font-size: 0.9rem;

	overflow-x: auto;
	-webkit-overflow-scrolling: touch;
	scrollbar-width: thin;
}

.breadcrumb-custom::-webkit-scrollbar {
	height: 6px;
}

.breadcrumb-custom::-webkit-scrollbar-thumb {
	background: rgba(0, 0, 0, 0.2);
	border-radius: 3px;
}

.breadcrumb-custom-item {
	display: flex;
	align-items: center;
	flex: 0 0 auto;
}

.breadcrumb-separator {
	color: #71717a;
	width: 0.7rem;
	height: 0.7rem;
	margin: 0 0.5rem;
	flex-shrink: 0;
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
