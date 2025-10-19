<script setup lang="ts">
import Glossary from '@/components/Glossary.vue';

import type { GlossaryConfig } from '@/types';

const falloutConfig: GlossaryConfig = {
	type: 'fallout',
	title: 'База текстов Fallout | RuESO',
	description: 'Полная база текстов всех игр серии Fallout: от Fallout 1 и Tactics до Shelter и Fallout 76.',
	url: 'https://rueso.ru/glossary-fallout',
	image: 'https://rueso.ru/public/img/main-card-fallout.jpg',
	apiEndpoint: '/api/glossary/fallout/',
	localStorageKey: 'glossary-fallout-games',
	defaultGames: ['fallout 4'],
	gameCheckboxes: [
		{ id: 'Fallout 1', name: 'Fallout (1997)', icon: '/img/icons/fallout1.png' },
		{ id: 'Fallout 2', name: 'Fallout 2 (1998)', icon: '/img/icons/fallout2.png' },
		{ id: 'Tactics', name: 'Fallout Tactics (2001)', icon: '/img/icons/tactics.png' },
		// { id: 'Brotherhood of Steel', name: 'Fallout: Brotherhood of Steel (2004)', icon: '/img/icons/fallout-bos.png', disabled: true },
		{ id: 'Fallout 3', name: 'Fallout 3 (2008)', icon: '/img/icons/fallout3.png' },
		{ id: 'New Vegas', name: 'Fallout: New Vegas (2010)', icon: '/img/icons/newvegas.png' },
		{ id: 'Fallout 4', name: 'Fallout 4 (2015)', icon: '/img/icons/fallout4.png' },
		{ id: 'Shelter', name: 'Fallout Shelter (2015)', icon: '/img/icons/shelter.png' },
		{ id: 'Fallout 76', name: 'Fallout 76 (2018)', icon: '/img/icons/fallout76.png' },
	],
	gameTags: {
		'cc': 'Creation Club',
	},
	dividerIndex: 5,
};
</script>

<template>
	<Glossary :config="falloutConfig" />
</template>
