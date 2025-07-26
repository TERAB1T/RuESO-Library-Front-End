<script setup lang="ts">
import { reactive, ref, watchEffect, onMounted, nextTick, onServerPrefetch } from 'vue';
import DataTable from 'datatables.net-vue3';
import DataTablesCore from 'datatables.net-bs5';
import { useHead } from '@unhead/vue';
import { debounceFn, formatDateTime } from '@/utils';
import { highlight, unhighlight } from '@/assets/js/highlight';
import { useFetchGlossaryUpdated } from '@/composables/useApi';

DataTable.use(DataTablesCore);

const metaTitle = 'База текстов TES | RuESO';
const metaDescription = 'Полная база текстов всех игр серии The Elder Scrolls: от Skyrim и ESO до Shadowkey и Castles.';
const metaLink = `https://rueso.ru/glossary`;
const metaIcon = `https://rueso.ru/public/img/main-card-glossary.jpg`;

useHead({
	title: metaTitle,
	meta: [
		{ name: 'description', content: metaDescription },
		{ name: 'robots', content: 'index, follow' },

		{ name: 'og:title', content: metaTitle },
		{ name: 'og:description', content: metaDescription },
		{ name: 'og:image', content: metaIcon },
		{ name: 'og:url', content: metaLink },
		{ name: 'og:locale', content: 'ru_RU' },
		{ name: 'og:site_name', content: 'RuESO' },

		{ name: 'twitter:title', content: metaTitle },
		{ name: 'twitter:description', content: metaDescription },
		{ name: 'twitter:image', content: metaIcon },
		{ name: 'twitter:card', content: 'summary' },
		{ name: 'twitter:creator', content: '@TERAB1T' },
	],
	link: [
		{ rel: 'canonical', href: metaLink }
	]
});

/* VARIABLES & CONSTANTS */

const tableID = '#main-table';
const dataTable = ref();
let dt: any;

const state = reactive({
	isFirstSearch: true,
	targetExists: false,
	lastUpdated: "",
});

const { data: glossaryUpdatedData, suspense: glossaryUpdatedSuspense, isSuccess: isGlossaryUpdatedFetched } = useFetchGlossaryUpdated();

const gameCheckboxes = [
	{ id: 'Arena', name: 'TES: Arena (1994)', icon: '/img/icons/arena.png' },
	{ id: 'Daggerfall', name: 'TES II: Daggerfall (1996)', icon: '/img/icons/daggerfall.png' },
	{ id: 'Morrowind', name: 'TES III: Morrowind (2002)', icon: '/img/icons/morrowind.png' },
	{ id: 'Oblivion', name: 'TES IV: Oblivion (2006)', icon: '/img/icons/oblivion.png' },
	{ id: 'Skyrim', name: 'TES V: Skyrim (2011)', icon: '/img/icons/skyrim.png' },
	{ id: 'ESO', name: 'TES Online (2014)', icon: '/img/icons/eso.png' },
	{ id: 'Battlespire', name: 'AESL: Battlespire (1997)', icon: '/img/icons/battlespire.png' },
	{ id: 'Redguard', name: 'TESA: Redguard (1998)', icon: '/img/icons/redguard.png' },
	{ id: 'Travels', name: 'TES Travels: Stormhold (2003), Dawnstar (2003), Shadowkey (2004), Oblivion (2006)', icon: '/img/icons/travels.png' },
	{ id: 'Legends', name: 'TES: Legends (2017)', icon: '/img/icons/legends.png' },
	{ id: 'Blades', name: 'TES: Blades (2019)', icon: '/img/icons/blades.png' },
	{ id: 'Castles', name: 'TES: Castles (2023)', icon: '/img/icons/castles.png' },
]

const gameTags = {
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
};

/* UTILS */

const getTagName = (tag: keyof typeof gameTags): string | undefined => gameTags[tag];

const replaceImage = (src: string, game: string, lang: string): string => {
	src = src.replace(/\[IMG=&quot;(.*?)&quot;\]/g, (match, p1) => {
		const [srcUrl, width, height] = p1.split(':');
		if (game === 'eso') {
			return `<img src="/public/img/${game}/${srcUrl}" width="${width}" height="${height}" class="book-image-no-bg">`;
		} else {
			return `<img src="/public/img/${game}/${lang}/${srcUrl}" class="book-image">`;
		}
	});
	return src;
}

const replaceColor = (src: string): string => src.replace(/\[C=([0-9a-f]{6})\](.*?)\[\/C\]/gis, "<span style=\"color: #$1\">$2</span>");

const prepareText = (data: any, type: string, row: any, meta: object, lang: string): string => {
	if (!data || data === "null") {
		return '';
	}

	if (data.includes('[IMG=')) {
		data = replaceImage(data, row.game, lang);
	}

	if (data.includes('[C=')) {
		data = replaceColor(data);
	}

	data = data.replace(/\[FONT=(.*?)\](.*?)\[\/FONT\]/gi, '<span class="font-$1" data-bs-toggle="tooltip" data-bs-title="$2">$2</span>');

	return data;
}

const enableTooltips = async () => {
	const { Tooltip } = await import("bootstrap");
	const tooltipTriggerList = document.querySelectorAll('[data-bs-toggle="tooltip"]');
	const tooltipList = [...tooltipTriggerList].map(tooltipTriggerEl => new Tooltip(tooltipTriggerEl));
};

/* EVENTS */

let shouldScroll = false;

const onPageChange = () => {
	shouldScroll = true;
};

const onPageDraw = () => {
	if (!import.meta.env.SSR && shouldScroll)
		window.scrollTo({ top: 0, behavior: 'smooth' });

	shouldScroll = false;
	enableTooltips();
};

const onCheckboxChanged = () => {
	if (!state.isFirstSearch) dt.search(dt.search()).draw();
}

/* LOCAL STORAGE */

const checkedGames = ref<string[]>([]);

if (!import.meta.env.SSR) {
	checkedGames.value = JSON.parse(localStorage.getItem('games') as string) || ['eso'];

	watchEffect(() => {
		localStorage.setItem('games', JSON.stringify(checkedGames.value));
	});
}

/* DATATABLES - OPTIONS */

const options: any = {
	language: {
		info: "Результаты с _START_ по _END_ (всего: _TOTAL_)",
		infoEmpty: '',
		zeroRecords: 'Ничего не найдено',
		emptyTable: '',
		thousands: ' ',
	},
	order: [],
	ajax: {
		url: '/api/glossary/',
		data: (d: any) => {
			d.games = checkedGames.value.join(',');
		}
	},
	processing: true,
	serverSide: true,
	pageLength: 50,
	searchHighlight: true,
	pagingType: 'simple_numbers',
	deferLoading: true,
	orderCellsTop: true,
	autoWidth: false,
	layout: {
		topStart: null,
		topEnd: null,
		bottomStart: 'info',
		bottomEnd: 'paging'
	},
	columns: [
		{
			data: 'game',
			orderable: false,
			searchable: false,
			width: '2%',
			className: 'dt-center',
			render: function (data: any, type: string, row: any, meta: object) {
				let tag = "";

				if (row.tag && getTagName(row.tag)) {
					tag = `<div class="badge-tag">${getTagName(row.tag)}</div>`;

					if (row.tag === 'Oblivion') data = 'oblivion';
					else if (row.tag === 'Stormhold') data = 'stormhold';
					else if (row.tag === 'Dawnstar') data = 'dawnstar';
				}

				return `<div class="game-icon"><img src="/public/img/icons/${data}.png" alt="${data}" width="32px" height="32px">${tag}</div>`;
			}
		},
		{
			data: 'type',
			width: '8%',
			render: function (data: any, type: string, row: any, meta: object) {
				if (!data || data === "null") {
					data = "Н/Д";
				}

				return `<div class="type-tag"><span>${data}</span></div>`;
			}
		},
		{
			data: 'en',
			width: '45%',
			render: function (data: any, type: string, row: any, meta: object) {
				return prepareText(data, type, row, meta, "en");
			}
		},
		{
			data: 'ru',
			width: '45%',
			render: function (data: any, type: string, row: any, meta: object) {
				return prepareText(data, type, row, meta, "ru");
			}
		}
	]
};

/* DATATABLES - MISC */

const dtInitFilters = (dt: any): void => {
	const footerRow = document.querySelector(`${tableID} tfoot tr`) as HTMLTableRowElement;
	const thead = document.querySelector(`${tableID} thead`) as HTMLTableSectionElement;

	thead.appendChild(footerRow);

	dt.columns().every(function (this: any) {
		const column = this;

		const columnSearch = debounceFn(function (currentValue) {
			if (currentValue.length < 3) currentValue = '';
			if (column.search() !== currentValue) column.search(currentValue).draw();
		});

		const input = column.footer().querySelector('input') as HTMLInputElement;
		if (input) {
			input.addEventListener('input', function () {
				columnSearch(this.value);
			});
		}
	});
};

const dtInitHighlight = (dt: any): void => {
	const body = dt.table().body() as HTMLElement;
	if (options.searchHighlight) {
		dt
			.on('draw.dt.dth column-visibility.dt.dth column-reorder.dt.dth', () => {
				highlightDt(body, dt);
			})
			.on('destroy', function () {
				dt.off('draw.dt.dth column-visibility.dt.dth column-reorder.dt.dth');
			});

		if (dt.search()) {
			highlightDt(body, dt);
		}
	}
};

const highlightDt = (body: HTMLElement, dt: any) => {
	const prepareToHighlight = (text: string) => text.trim().replace(/[‘’]/, '\'').replace(/[“”„]/, '"').replace(/ /, ' ');

	unhighlight(body);

	if (dt.rows({ filter: 'applied' }).data().length) {
		dt.columns().every(function (this: any) {
			const column = this;
			const columnNodes = column.nodes().toArray();

			columnNodes.forEach((node: HTMLElement) => {
				unhighlight(node, { className: 'column_highlight' });
				highlight(node, prepareToHighlight(column.search()), { className: 'column_highlight' });
			})

		});

		highlight(body, prepareToHighlight(dt.search()));
	}
};

const mainSearch = debounceFn(async (event: Event) => {
	const mainInput = event.target as HTMLInputElement;

	if (state.isFirstSearch) {
		state.isFirstSearch = false;
		const mainEl = document.getElementById('main') as HTMLDivElement;
		mainEl.classList.remove('flex-center');

		await nextTick();
		mainInput.focus();
	}

	let currentValue = mainInput.value;

	if (currentValue.length < 3) currentValue = '';
	if (dt.search() !== currentValue) dt.search(currentValue).draw();
});

/* ONMOUNTED */

watchEffect(() => {
	if (glossaryUpdatedData.value) {
		state.lastUpdated = glossaryUpdatedData.value.lastModified;
	}
});

onServerPrefetch(async () => {
	await glossaryUpdatedSuspense();
	if (glossaryUpdatedData.value) {
		state.lastUpdated = glossaryUpdatedData.value.lastModified;
	}
});

onMounted(async () => {
	dt = dataTable.value.dt;
	dtInitFilters(dt);
	dtInitHighlight(dt);

	state.targetExists = !!document.querySelector("#glossary-search-nav");

	enableTooltips();
});
</script>

<template>
	<div id="main" class="flex-center">
		<div class="search-wrap">
			<div class="d-flex justify-content-center w-100" :class="{ 'search-fixed-height': state.isFirstSearch }">
				<Teleport defer v-if="state.targetExists" to="#glossary-search-nav" :disabled="state.isFirstSearch">
					<input type="search" class="form-control form-control-lg" id="main-input" placeholder="Введите текст" autocomplete="off" @input="mainSearch" size="5">
				</Teleport>
			</div>

			<div class="game-checks d-flex justify-content-center flex-wrap">
				<template v-for="gameCheckbox in gameCheckboxes.slice(0, 6)" :key="gameCheckbox.id">
					<input type="checkbox" class="btn-check" :id="`btn-check-${gameCheckbox.id.toLowerCase()}`" :name="gameCheckbox.id.toLowerCase()" @change="onCheckboxChanged" v-model="checkedGames" :value="gameCheckbox.id.toLowerCase()">
					<label class="btn btn-outline-secondary" :for="`btn-check-${gameCheckbox.id.toLowerCase()}`" data-bs-toggle="tooltip" data-bs-placement="bottom" :data-bs-title="gameCheckbox.name"><img width="32px" :src="`/public/${gameCheckbox.icon}`"> <span>{{ gameCheckbox.id }}</span></label>
				</template>
				<div class="w-100 game-checks-divider"></div>
				<template v-for="gameCheckbox in gameCheckboxes.slice(6)" :key="gameCheckbox.id">
					<input type="checkbox" class="btn-check" :id="`btn-check-${gameCheckbox.id.toLowerCase()}`" :name="gameCheckbox.id.toLowerCase()" @change="onCheckboxChanged" v-model="checkedGames" :value="gameCheckbox.id.toLowerCase()">
					<label class="btn btn-outline-secondary" :for="`btn-check-${gameCheckbox.id.toLowerCase()}`" data-bs-toggle="tooltip" data-bs-placement="bottom" :data-bs-title="gameCheckbox.name"><img width="32px" :src="`/public/${gameCheckbox.icon}`"> <span>{{ gameCheckbox.id }}</span></label>
				</template>
				<div class="w-100 game-checks-updated">Последнее обновление: <time v-if="state.lastUpdated" :datetime="formatDateTime(state.lastUpdated)">{{ state.lastUpdated }}</time></div>
			</div>

			<div class="main-table-wrap">
				<DataTable id="main-table" class="table dataTable" style="width:100%" :options="options" ref="dataTable" @page="onPageChange" @draw="onPageDraw">
					<thead>
						<tr>
							<th></th>
							<th>Категория</th>
							<th>Английский</th>
							<th>Русский</th>
						</tr>
					</thead>
					<tfoot>
						<tr>
							<th></th>
							<th><input type="search" class="form-control form-control-sm" placeholder="Фильтр" /></th>
							<th><input type="search" class="form-control form-control-sm" placeholder="Фильтр" /></th>
							<th><input type="search" class="form-control form-control-sm" placeholder="Фильтр" /></th>
						</tr>
					</tfoot>
				</DataTable>
			</div>
		</div>
	</div>
</template>

<style scoped>
.search-fixed-height {
	height: 48px;
}
</style>
