<script setup lang="ts">
import { computed } from 'vue';
import type { CampShopInfo } from '@/types';

const props = defineProps<{
	shopInfo: CampShopInfo | null;
	lang: 'ru' | 'en';
}>();

const text = computed(() => {
	const info = props.shopInfo;
	if (!info) return null;
	return props.lang === 'ru'
		? (info.descriptionRu || info.descriptionEn)
		: (info.descriptionEn || info.descriptionRu);
});

const t = computed(() => props.lang === 'ru'
	? {
		title: 'Описание в магазине',
		setWarning: 'Это описание относится ко всему набору из магазина, а не к отдельному предмету.'
	}
	: {
		title: 'Shop description',
		setWarning: 'This description applies to the whole shop bundle, not to an individual item.'
	}
);
</script>

<template>
	<div v-if="text" class="shop-description-block">
		<div class="fo-sect-h">
			<span class="fo-bar"></span>
			<h3 class="fo-h3">{{ t.title }}{{ shopInfo?.isSet ? '*' : '' }}</h3>
		</div>

		<div class="shop-description-text">{{ text }}</div>

		<div v-if="shopInfo?.isSet" class="shop-description-note">*&nbsp;{{ t.setWarning }}</div>
	</div>
</template>

<style scoped lang="scss">
.shop-description-block {
	margin-top: 2.25rem;
}

.shop-description-text {
	font-size: 1.0325rem;
	line-height: 1.6;
	white-space: pre-line;
}

.shop-description-note {
	margin-top: calc(1.0325rem * 1.6 + 2px);
	font-size: 0.9rem;
	line-height: 1.4;
	font-style: italic;
	color: #a1a1aa;
}
</style>
