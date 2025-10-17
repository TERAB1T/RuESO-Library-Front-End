<script setup lang="ts">
import Glossary from '@/components/Glossary.vue';

import type { GlossaryConfig } from '@/types';

const tesConfig: GlossaryConfig = {
	title: 'База текстов TES | RuESO',
	description: 'Полная база текстов всех игр серии The Elder Scrolls: от Skyrim и ESO до Shadowkey и Castles.',
	url: 'https://rueso.ru/glossary',
	image: 'https://rueso.ru/public/img/main-card-glossary.jpg',
	apiEndpoint: '/api/glossary/',
	localStorageKey: 'glossary-tes-games',
	defaultGames: ['eso'],
	gameCheckboxes: [
		{ id: 'Arena', name: 'TES: Arena (1994)', icon: '/img/icons/arena.png' },
		{ id: 'Daggerfall', name: 'TES II: Daggerfall (1996)', icon: '/img/icons/daggerfall.png' },
		{ id: 'Morrowind', name: 'TES III: Morrowind (2002)', icon: '/img/icons/morrowind.png' },
		{ id: 'Oblivion', name: 'TES IV: Oblivion (2006)', icon: '/img/icons/oblivion.png' },
		{ id: 'Skyrim', name: 'TES V: Skyrim (2011)', icon: '/img/icons/skyrim.png' },
		{ id: 'ESO', name: 'TES Online (2014)', icon: '/img/icons/eso.png' },
		{ id: 'Battlespire', name: 'AESL: Battlespire (1997)', icon: '/img/icons/battlespire.png' },
		{ id: 'Redguard', name: 'TESA: Redguard (1998)', icon: '/img/icons/redguard.png' },
		{ id: 'Travels', name: 'TES Travels: Stormhold (2003), Dawnstar (2003), Shadowkey (2004), Oblivion (2006)', icon: '/img/icons/travels.png' },
		{ id: 'Legends', name: 'TES: Legends (2017)', icon: '/img/icons/legends.png' },
		{ id: 'Blades', name: 'TES: Blades (2019)', icon: '/img/icons/blades.png' },
		{ id: 'Castles', name: 'TES: Castles (2023)', icon: '/img/icons/castles.png' },
	],
	gameTags: {
		'Tribunal': 'Tribunal',
		'Bloodmoon': 'Bloodmoon',
		'Plugin': 'Официальный плагин',
		'KotN': 'Knights of the Nine',
		'SI': 'Shivering Isles',
		'Dawnguard': 'Dawnguard',
		'Hearthfire': 'Hearthfire',
		'Dragonborn': 'Dragonborn',
		'cc': 'Creation Club',
		'Stormhold': 'Stormhold',
		'Dawnstar': 'Dawnstar',
		'Shadowkey': 'Shadowkey',
		'Oblivion': 'Oblivion Mobile',
	},
	dividerIndex: 6,
};
</script>

<template>
	<Glossary :config="tesConfig" />
</template>
