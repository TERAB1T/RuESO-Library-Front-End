<script setup lang="ts">
import { reactive, ref, watchEffect, onMounted, nextTick, onServerPrefetch } from 'vue';
import DataTable from 'datatables.net-vue3';
import DataTablesCore from 'datatables.net-bs5';
import { useHead } from '@unhead/vue';
import { debounceFn, formatDateTime } from '@/utils';
import { highlight, unhighlight } from '@/assets/js/highlight';
import { useFetchGlossaryUpdated } from '@/composables/useApi';
import { trackGlossarySearch } from '@/analytics';

import type { GlossaryConfig, GlossaryUpdated } from '@/types';
import type { GlossaryType } from '@/analytics';

DataTable.use(DataTablesCore);

const props = defineProps<{
	config: GlossaryConfig;
}>();

const metaTitle = props.config.title;
const metaDescription = props.config.description;
const metaLink = props.config.url;
const metaIcon = props.config.image;

useHead({
	title: metaTitle,
	meta: [
		{ name: 'description', content: metaDescription },
		{ name: 'robots', content: 'index, follow' },

		{ property: 'og:title', content: metaTitle },
		{ property: 'og:description', content: metaDescription },
		{ property: 'og:image', content: metaIcon },
		{ property: 'og:url', content: metaLink },
		{ property: 'og:locale', content: 'ru_RU' },
		{ property: 'og:site_name', content: 'RuESO' },

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

const { data: glossaryUpdatedData, suspense: glossaryUpdatedSuspense, isSuccess: isGlossaryUpdatedFetched } = useFetchGlossaryUpdated(props.config.type);

/* UTILS */

const getTagName = (tag: string): string | undefined => props.config.gameTags?.[tag] ?? tag;

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

	data = data.replace(/\[TERM\](.*?)\[\/TERM\]/gis, '<pre>$1</pre>');

	data = data.replace(/\[FONT=(.*?)\](.*?)\[\/FONT\]/gi, '<span class="font-$1" data-bs-toggle="tooltip" data-bs-title="$2">$2</span>');

	data = data.replace(/¬/gi, '★');

	return data;
}

const enableTooltips = async () => {
	const { Tooltip } = await import("bootstrap");
	const container = document.body;
	new Tooltip(container, {
		selector: '[data-bs-toggle="tooltip"]'
	});
};

/* EVENTS */

let shouldScroll = false;

const onPageChange = () => {
	shouldScroll = true;
};

const glossaryType: GlossaryType = props.config.type === 'fallout' ? 'fallout' : 'tes';

const onPageDraw = () => {
	if (!import.meta.env.SSR && shouldScroll)
		window.scrollTo({ top: 0, behavior: 'smooth' });

	shouldScroll = false;
};

const getGameValue = (id: string): string => id.toLowerCase();

const gameValues = props.config.gameCheckboxes.map(game => getGameValue(game.id));
const serverGameValues = props.config.gameCheckboxes.filter(game => game.server).map(game => getGameValue(game.id));
const legacyGameValues: Record<string, string> = Object.fromEntries(
	props.config.gameCheckboxes.filter(game => game.legacyId).map(game => [game.legacyId!, getGameValue(game.id)])
);

// Server variants of the online game are mutually exclusive: one search runs against one server's DB.
const onCheckboxChanged = (event: Event) => {
	const { value, checked } = event.target as HTMLInputElement;

	if (checked && serverGameValues.includes(value)) {
		checkedGames.value = checkedGames.value.filter(game => game === value || !serverGameValues.includes(game));
	}

	if (!state.isFirstSearch) dt.search(dt.search()).draw();
}

/* LOCAL STORAGE */

const checkedGames = ref<string[]>([]);

// The stored list may come from an older build (plain "eso") or be edited by hand, so keep only known
// games and at most one server variant; the first one wins, as on the backend.
const sanitizeGames = (stored: unknown): string[] => {
	if (!Array.isArray(stored)) return props.config.defaultGames;

	const games: string[] = [];
	for (const storedGame of stored) {
		const game = legacyGameValues[storedGame] ?? storedGame;

		if (!gameValues.includes(game) || games.includes(game)) continue;
		if (serverGameValues.includes(game) && games.some(g => serverGameValues.includes(g))) continue;

		games.push(game);
	}

	return games;
};

const readStoredGames = (): unknown => {
	try {
		return JSON.parse(localStorage.getItem(props.config.localStorageKey) as string);
	} catch {
		return null;
	}
};

if (!import.meta.env.SSR) {
	checkedGames.value = sanitizeGames(readStoredGames());

	watchEffect(() => {
		localStorage.setItem(props.config.localStorageKey, JSON.stringify(checkedGames.value));
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
		url: props.config.apiEndpoint,
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

				// The PTS DB stores the online game under its plain name; its icon is <game>pts.png.
				const ptsIcon = `/img/icons/${data}pts.png`;
				const isPtsRow = props.config.gameCheckboxes.some(game => game.server === 'pts' && game.icon === ptsIcon && checkedGames.value.includes(getGameValue(game.id)));

				return `<div class="game-icon"><img src="/public${isPtsRow ? ptsIcon : `/img/icons/${data}.png`}" alt="${data}" width="32px" height="32px">${tag}</div>`;
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
	const prepareToHighlight = (text: string) => text.trim().replace(/[‘’]/g, '\'').replace(/[“”„]/g, '"').replace(/ /g, ' ');

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

	if (dt.search() !== currentValue) {
		if (currentValue) trackGlossarySearch(glossaryType, currentValue);
		dt.search(currentValue).draw();
	}
});

/* ONMOUNTED */

const toSortableDate = (date: string): string => date.split('.').reverse().join('');

const getNewestDate = (updated: GlossaryUpdated): string =>
	[updated.live, updated.pts]
		.map(info => info?.lastModified ?? '')
		.reduce((newest, date) => toSortableDate(date) > toSortableDate(newest) ? date : newest, '');

watchEffect(() => {
	if (glossaryUpdatedData.value) {
		state.lastUpdated = getNewestDate(glossaryUpdatedData.value);
	}
});

onServerPrefetch(async () => {
	await glossaryUpdatedSuspense();
	if (glossaryUpdatedData.value) {
		state.lastUpdated = getNewestDate(glossaryUpdatedData.value);
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
				<template v-for="(gameCheckbox, index) in config.gameCheckboxes" :key="gameCheckbox.id">
					<div v-if="index === config.dividerIndex" class="w-100 game-checks-divider"></div>
					<input type="checkbox" class="btn-check" :id="`btn-check-${getGameValue(gameCheckbox.id)}`" :name="getGameValue(gameCheckbox.id)" @change="onCheckboxChanged" v-model="checkedGames" :value="getGameValue(gameCheckbox.id)" :disabled="gameCheckbox.disabled">
					<label class="btn btn-outline-secondary" :for="`btn-check-${getGameValue(gameCheckbox.id)}`" data-bs-toggle="tooltip" data-bs-placement="bottom" :data-bs-title="gameCheckbox.name">
						<img width="32px" :src="`/public/${gameCheckbox.icon}`">
						<span v-if="gameCheckbox.server" class="game-check-text">
							<span>{{ gameCheckbox.label }}</span>
							<small class="game-check-server">{{ glossaryUpdatedData?.[gameCheckbox.server]?.version ?? glossaryUpdatedData?.[gameCheckbox.server]?.lastModified }}</small>
						</span>
						<span v-else>{{ gameCheckbox.label ?? gameCheckbox.id }}</span>
					</label>
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

/* Server buttons carry a second text line, so center every button's content to keep the row even. */
.game-checks .btn {
	display: inline-flex;
	align-items: center;
	gap: 0.25rem;
}

.game-check-text {
	display: inline-flex;
	flex-direction: column;
	align-items: flex-start;
	line-height: 1.15;
}

.game-check-server {
	font-size: 0.65rem;
	opacity: 0.6;
}
</style>
