<script setup lang="ts">
import { computed, watch, ref } from 'vue';

const props = defineProps({
	currentPage: { type: Number, default: 1 },
	totalPages: { type: Number, default: 1 }
});

defineEmits(['changePage', 'submit']);

const pages = ref<string[]>([]);

const calculatePages = () => {
	if (props.totalPages <= 6) {
		pages.value = Array.from({ length: props.totalPages }, (_, i) => (i + 1).toString());
	} else if (props.currentPage <= 4) {
		pages.value = ['1', '2', '3', '4', '5', '...', props.totalPages.toString()];
	} else if (props.currentPage >= props.totalPages - 3) {
		pages.value = ['1', '...', (props.totalPages - 4).toString(), (props.totalPages - 3).toString(), (props.totalPages - 2).toString(), (props.totalPages - 1).toString(), props.totalPages.toString()];
	} else {
		pages.value = ['1', '...', (props.currentPage - 1).toString(), props.currentPage.toString(), (props.currentPage + 1).toString(), '...', props.totalPages.toString()];
	}
};

watch(() => [props.currentPage, props.totalPages], calculatePages, { immediate: true });
</script>


<template>
	<nav v-if="totalPages > 1" class="mt-3">
		<ul class="pagination justify-content-center">
			<li class="page-item" :class="{ disabled: currentPage === 1 }">
				<button class="page-link" @click="$emit('changePage', currentPage - 1)">«</button>
			</li>
			<li v-for="page in pages" :key="page" class="page-item" :class="{ active: currentPage === Number(page) }">
				<button v-if="page !== '...'" class="page-link" @click="$emit('changePage', Number(page))">
					{{ page }}
				</button>
				<span v-else class="page-link disabled">{{ page }}</span>
			</li>
			<li class="page-item" :class="{ disabled: currentPage === totalPages }">
				<button class="page-link" @click="$emit('changePage', currentPage + 1)">»</button>
			</li>
		</ul>
	</nav>
</template>

<style scoped>
.page-link {
	width: 42px;
	height: 42px;
	text-align: center;
	padding-left: 0;
	padding-right: 0;
}
</style>
