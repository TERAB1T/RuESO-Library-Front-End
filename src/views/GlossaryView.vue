<script setup lang="ts">
import { ref, watchEffect, onMounted } from 'vue';
import DataTable from 'datatables.net-vue3';
import DataTablesCore from 'datatables.net-bs5';
import { Tooltip } from "bootstrap";
import { useHead } from '@unhead/vue';
import { debounceFn } from '@/utils';
import { highlight, unhighlight } from '@/assets/js/highlight';

DataTable.use(DataTablesCore);

useHead({
	title: `База текстов TES | RuESO`,
	meta: [
		{ name: 'description', content: 'SSR библиотека переводов для The Elder Scrolls' }
	]
});

/* VARIABLES & CONSTANTS */

const tableID = '#main-table';
const dataTable = ref();
let dt: any;
let isFirstSearch = true;

const gameCheckboxes = [
	{ id: 'Morrowind', name: 'TES III: Morrowind (2002)', icon: '/img/icons/morrowind.png' },
	{ id: 'Oblivion', name: 'TES IV: Oblivion (2006)', icon: '/img/icons/oblivion.png' },
	{ id: 'Skyrim', name: 'TES V: Skyrim (2011)', icon: '/img/icons/skyrim.png' },
	{ id: 'ESO', name: 'TES Online (2014)', icon: '/img/icons/eso.png' },
	{ id: 'Redguard', name: 'TESA: Redguard (1998)', icon: '/img/icons/redguard.png' },
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
};

/* UTILS */

const getTagName = (tag: keyof typeof gameTags): string | undefined => gameTags[tag];

const replaceImage = (src: string, game: string, lang: string): string => {
	src = src.replace(/\[IMG=&quot;(.*?)&quot;\]/g, (match, p1) => {
		const [srcUrl, width, height] = p1.split(':');
		if (game === 'eso') {
			return `<img src="img/${game}/${srcUrl}" width="${width}" height="${height}" class="book-image-no-bg">`;
		} else {
			return `<img src="img/${game}/${lang}/${srcUrl}" class="book-image">`;
		}
	});
	return src;
}

const replaceColor = (src: string): string => src.replace(/\[C=([0-9a-f]{6})\](.*?)\[\/C\]/gis, "<span style=\"color: #$1\">$2</span>");

const prepareText = (data: any, type: string, row: any, meta: object): string => {
	if (!data || data === "null") {
		return '';
	}

	if (data.includes('[IMG=')) {
		data = replaceImage(data, row.game, 'ru');
	}

	if (data.includes('[C=')) {
		data = replaceColor(data);
	}

	return data;
}

/* EVENTS */

let shouldScroll = false;

const onPageChange = () => {
	shouldScroll = true;
};

const onPageDraw = () => {
	if (!import.meta.env.SSR && shouldScroll)
		window.scrollTo({ top: 0, behavior: 'smooth' });

	shouldScroll = false;
};

const onCheckboxChanged = () => {
	if (!isFirstSearch) dt.search(dt.search()).draw();
}

/* LOCAL STORAGE */

const checkedGames = ref<string[]>([]);
checkedGames.value = JSON.parse(localStorage.getItem('games') as string) || ['eso'];

watchEffect(() => {
	localStorage.setItem('games', JSON.stringify(checkedGames.value));
});

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
		url: 'api/glossary/',
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
				}

				return `<div class="game-icon"><img src="img/icons/${data}.png" alt="${data}" width="32px">${tag}</div>`;
			}
		},
		{
			data: 'type',
			width: '8%',
			render: function (data: any, type: string, row: any, meta: object) {
				if (!data || data === "null") {
					data = "Н/Д";
				}

				return `<div class="type-tag">${data}</div>`;
			}
		},
		{
			data: 'en',
			width: '45%',
			render: prepareText
		},
		{
			data: 'ru',
			width: '45%',
			render: prepareText
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

const mainSearch = debounceFn((event: Event) => {
	if (isFirstSearch) {
		isFirstSearch = false;
		const mainEl = document.getElementById('main') as HTMLDivElement;
		mainEl.classList.remove('flex-center');

		const tooltipTriggerList = document.querySelectorAll('[data-bs-toggle="tooltip"]')
		const tooltipList = [...tooltipTriggerList].map(tooltipTriggerEl => new Tooltip(tooltipTriggerEl))
	}

	const mainInput = event.target as HTMLInputElement;
	let currentValue = mainInput.value;

	if (currentValue.length < 3) currentValue = '';
	if (dt.search() !== currentValue) dt.search(currentValue).draw();
});

/* ONMOUNTED */

onMounted(() => {
	dt = dataTable.value.dt;
	dtInitFilters(dt);
	dtInitHighlight(dt);
});
</script>

<template>
	<div id="main" class="flex-center">
		<div class="search-wrap">
			<div class="d-flex justify-content-center">
				<input type="search" class="form-control form-control-lg" id="main-input" placeholder="Введите искомый текст" autocomplete="off" @input="mainSearch">
			</div>

			<div class="game-checks d-flex justify-content-center flex-wrap">
				<template v-for="gameCheckbox in gameCheckboxes" :key="gameCheckbox.id">
					<input type="checkbox" class="btn-check" :id="`btn-check-${gameCheckbox.id.toLowerCase()}`" :name="gameCheckbox.id.toLowerCase()" @change="onCheckboxChanged" v-model="checkedGames" :value="gameCheckbox.id.toLowerCase()">
					<label class="btn btn-outline-secondary" :for="`btn-check-${gameCheckbox.id.toLowerCase()}`" data-bs-toggle="tooltip" data-bs-placement="bottom" :data-bs-title="gameCheckbox.name"><img width="32px" :src="gameCheckbox.icon"> <span>{{ gameCheckbox.id }}</span></label>
				</template>
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
