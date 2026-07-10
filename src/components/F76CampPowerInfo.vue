<script setup lang="ts">
import { computed } from 'vue';
import { gameUnitsToMeters } from '@/utils';

const props = defineProps<{
	requiresPower: boolean;
	powerRequired: number;
	powerConnectable: boolean;
	powerGenerated: number;
	powerRadiated: number;
	lang: 'ru' | 'en';
}>();

const hasPowerInfo = computed(() =>
	props.requiresPower || props.powerConnectable || props.powerGenerated > 0 || props.powerRadiated > 0
);

const t = computed(() => props.lang === 'ru'
	? { title: 'Энергия' }
	: { title: 'Power' }
);

const description = computed((): string[] => {
	const parts: string[] = [];
	const requirementParts: string[] = [];

	if (props.lang === 'ru') {
		if (props.requiresPower) {
			requirementParts.push(
				props.powerRequired > 0
					? `Для работы этому объекту требуется ${props.powerRequired} ед. энергии.`
					: 'Для работы этому объекту требуется энергия.'
			);
			requirementParts.push(
				props.powerConnectable
					? 'Его можно соединить с источником энергии с помощью провода.'
					: 'Чтобы его запитать, необходимо разместить его в радиусе действия объекта, излучающего энергию.'
			);
		} else if (props.powerGenerated > 0) {
			requirementParts.push(`Этот объект производит ${props.powerGenerated} ед. энергии. Его можно соединить с другими с помощью провода.`);
		} else if (props.powerConnectable) {
			requirementParts.push('Этот объект можно соединить с другими с помощью провода.');
		}

		if (requirementParts.length > 0) {
			parts.push(requirementParts.join(' '));
		}

		if (props.powerRadiated > 0) {
			parts.push(`Этот объект излучает энергию в радиусе ${gameUnitsToMeters(props.powerRadiated).toLocaleString('ru-RU')} м от своего центра.`);
		}

		return parts;
	}

	if (props.requiresPower) {
		requirementParts.push(
			props.powerRequired > 0
				? `This object requires ${props.powerRequired} units of power to operate.`
				: 'This object requires power to operate.'
		);
		requirementParts.push(
			props.powerConnectable
				? 'It can be connected to a power source with a wire.'
				: 'To power it, place it within range of an object that radiates power.'
		);
	} else if (props.powerGenerated > 0) {
		requirementParts.push(`This object generates ${props.powerGenerated} units of power. It can be connected to other objects with a wire.`);
	} else if (props.powerConnectable) {
		requirementParts.push('This object can be connected to others with a wire.');
	}

	if (requirementParts.length > 0) {
		parts.push(requirementParts.join(' '));
	}

	if (props.powerRadiated > 0) {
		parts.push(`This object radiates power within a ${gameUnitsToMeters(props.powerRadiated)}m radius from its center.`);
	}

	return parts;
});
</script>

<template>
	<div v-if="hasPowerInfo" class="power-info-block">
		<div class="fo-sect-h">
			<span class="fo-bar"></span>
			<h3 class="fo-h3">{{ t.title }}</h3>
		</div>

		<div v-if="description.length > 0" class="power-info-text">
			<ul v-if="description.length > 1">
				<li v-for="(desc, index) in description" :key="index">{{ desc }}</li>
			</ul>
			<p v-else>{{ description[0] }}</p>
		</div>
	</div>
</template>

<style scoped lang="scss">
.power-info-block {
	margin-top: 2.25rem;
}

.power-info-text {
	font-size: 1.0325rem;
	line-height: 1.6;
}
</style>
