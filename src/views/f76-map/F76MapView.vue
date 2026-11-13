<script setup lang="ts">
import { computed, h, nextTick, onMounted, onServerPrefetch, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useHead } from '@unhead/vue';
import { faChevronDown, faChevronLeft, faChevronRight, faExpand, faFont, faLink, faMagnifyingGlass, faMinus, faPlus, faXmark } from '@fortawesome/free-solid-svg-icons';
import { useFetchMapData, useFetchMapItemCatalog, useFetchMapItemPoints, useFetchMapLayers, useFetchMapUpdated } from '@/composables/useApi';
import { formatDateTime } from '@/utils';
import F76MapCanvas from '@/components/F76MapCanvas.vue';
import { ITEM_CATEGORY_NAMES, POINT_COLORS, ZONE_ALLOWED, ZONE_BLOCKED, ZONE_COLORS, ZONE_WATER, itemColorIndex, layerColorIndex, regionZoneColor } from '@/f76Map';

import type { FunctionalComponent } from 'vue';
import type { IconDefinition } from '@fortawesome/free-solid-svg-icons';
import type { ReactiveHead } from '@unhead/vue';
import type { F76MapItem } from '@/types';
import type { F76MapPoint, F76MapStyle, F76MapZone } from '@/f76Map';

const TITLE = 'Интерактивная карта Fallout 76';
const DESCRIPTION = 'Интерактивная карта Аппалачии из Fallout 76: локации с игровыми значками, пупсы, журналы, торговцы, зоны запрета C.A.M.P., поиск хлама и ресурсов. Данные берутся прямо из файлов игры.';
const SKELETON_ROWS = 14;
// Short names fit the switch tile; the full ones go to its tooltip
const MAP_STYLE_NAMES: Record<F76MapStyle, string> = { paper: 'Обычная', military: 'Топокарта' };
const MAP_STYLE_TITLES: Record<F76MapStyle, string> = { paper: 'Обычная карта', military: 'Топографическая карта' };
// Search results shown before "show all"
const ITEM_RESULTS_SHORT = 8;
const ITEM_RESULTS_MAX = 100;

const route = useRoute();
const router = useRouter();

const { data: mapData, suspense: mapSuspense, isPending: isMapPending, isError: isMapError } = useFetchMapData();
const { data: updatedData } = useFetchMapUpdated();

onServerPrefetch(async () => {
	await mapSuspense();
});

// State from the URL is applied after mount: the SSR cache ignores these query params, so the server
// render and hydration always use the defaults.
const mapStyle = ref<F76MapStyle>('paper');
const regionId = ref<string | null>(null);
const selectedId = ref<string | null>(null);
const highlightId = ref<string | null>(null);
const activeLayers = ref<string[]>([]);
// Items and resources on the map: 'i-<item id>' or 'c-<component id>'; each has its own color, so there are as many as colors
const activeFinds = ref<string[]>([]);
const MAX_FINDS = POINT_COLORS.length - 6;
const showIcons = ref(true);
const showLabels = ref(true);
const search = ref('');
const showAllItemResults = ref(false);
// The location list is long: it opens on demand, and on its own while searching
// Icons as plain inline SVG sized in em: the FontAwesome component's styles are injected from JS, so in the SSR
// markup (slow connection, page refresh) its icons rendered at full size until the script ran
const Icon: FunctionalComponent<{ icon: IconDefinition }> = ({ icon }) => {
	const [width, height, , , path] = icon.icon;
	return h('svg', {
		viewBox: `0 0 ${width} ${height}`, width: `${width / height}em`, height: '1em',
		fill: 'currentColor', 'aria-hidden': 'true', style: 'overflow: visible; vertical-align: -0.125em',
	}, (Array.isArray(path) ? path : [path]).map(d => h('path', { d })));
};
Icon.props = ['icon'];

const isLocationListOpen = ref(false);
const isResourceListOpen = ref(false);
// Mobile: the panel covers the map; desktop: it can be collapsed to give the map the whole width
const isPanelOpen = ref(false);
const isPanelCollapsed = ref(false);

const canvas = ref<InstanceType<typeof F76MapCanvas>>();

const normalize = (s: string) => s.toLocaleLowerCase('ru').replace(/ё/g, 'е').replace(/["«»“”'’]/g, '');
const query = computed(() => normalize(search.value.trim()));

const locations = computed(() => (mapData.value?.markers ?? [])
	.filter(m => m.kind === 'location')
	.map(m => ({ marker: m, key: normalize(m.nameRu) }))
	.sort((a, b) => a.key.localeCompare(b.key, 'ru'))
	.map(({ marker }) => marker));
const regionLabels = computed(() => (mapData.value?.markers ?? []).filter(m => m.kind === 'region'));
const regions = computed(() => mapData.value?.regions ?? []);
const regionNames = computed(() => new Map(regions.value.map(r => [r.formId, r.nameRu])));

const regionCounts = computed(() => {
	const counts = new Map<string, number>();
	for (const m of locations.value)
		if (m.regionFormId) counts.set(m.regionFormId, (counts.get(m.regionFormId) ?? 0) + 1);
	return counts;
});

const mapMarkers = computed(() => regionId.value
	? locations.value.filter(m => m.regionFormId === regionId.value)
	: locations.value);

const listMarkers = computed(() => {
	const q = query.value;
	if (!q) return mapMarkers.value;
	return mapMarkers.value.filter(m => normalize(m.nameRu).includes(q) || normalize(m.nameEn).includes(q));
});

const layers = computed(() => mapData.value?.layers ?? []);
const layerQueries = useFetchMapLayers(computed(() => activeLayers.value));
const layerColor = (id: string) => {
	const layer = layers.value.find(l => l.id === id);
	if (layer?.kind !== 'zones') return POINT_COLORS[layerColorIndex(id, layers.value.indexOf(layer!))];
	if (id === 'camp') return `linear-gradient(135deg, ${ZONE_COLORS[ZONE_ALLOWED]![1]} 50%, ${ZONE_COLORS[ZONE_BLOCKED]![1]} 50%)`;
	if (id === 'fishing') return ZONE_COLORS[ZONE_WATER]![1];
	return `conic-gradient(${regions.value.map((r, i) => ZONE_COLORS[regionZoneColor(r.formId, i)]![1]).join(', ')})`;
};

// Points of the turned-on layers, filtered by region like the markers
const layerPoints = computed((): F76MapPoint[] => activeLayers.value.flatMap((id, i) => {
	const contents = layerQueries.value[i]?.data;
	if (contents?.kind !== 'points') return [];
	const position = layers.value.findIndex(l => l.id === id);
	const layerName = layers.value[position]?.nameRu ?? '';
	const colorIndex = layerColorIndex(id, position);
	return contents.objects
		.filter(o => !regionId.value || o.regionFormId === regionId.value)
		.map(o => ({
			id: o.formId,
			name: o.nameRu ?? layerName,
			group: o.nameRu ? layerName : null,
			placeNameRu: o.placeNameRu,
			inside: o.inside,
			count: o.count,
			regionFormId: o.regionFormId,
			mapX: o.mapX,
			mapY: o.mapY,
			isPts: o.isPts,
			formId: o.formId,
			colorIndex,
		}));
}));

// Area layers: regions at the bottom, then water, then C.A.M.P. zones on top
const ZONE_LAYER_ORDER = ['regions', 'fishing', 'camp'];
const regionIndex = computed(() => new Map(regions.value.map((r, i) => [r.formId, i])));

const zones = computed((): F76MapZone[] => activeLayers.value
	.map((id, i) => ({ id, contents: layerQueries.value[i]?.data }))
	.sort((a, b) => ZONE_LAYER_ORDER.indexOf(a.id) - ZONE_LAYER_ORDER.indexOf(b.id))
	.flatMap(({ id, contents }) => contents?.kind !== 'zones' ? [] : contents.zones.map(z => {
		// Regions and fishing waters carry the region's form ID as their kind
		const region = regionNames.value.get(z.kind);
		if (id === 'camp')
			return { rings: z.rings, color: z.kind === 'blocked' ? ZONE_BLOCKED : ZONE_ALLOWED, tooltip: z.kind === 'blocked' ? 'Здесь нельзя поставить C.A.M.P.' : null };
		if (id === 'fishing')
			return { rings: z.rings, color: ZONE_WATER, tooltip: region ? `Рыбалка: рыба региона «${region}»` : 'Рыбалка' };
		return { rings: z.rings, color: regionZoneColor(z.kind, regionIndex.value.get(z.kind) ?? 0), tooltip: region ?? null };
	})));

// Items: the catalog is only needed to search, so it loads with the first search
const { data: catalog, isPending: isCatalogPending } = useFetchMapItemCatalog(computed(() => query.value !== ''));
const components = computed(() => mapData.value?.components ?? []);
const ores = computed(() => mapData.value?.ores ?? []);
const findQueries = useFetchMapItemPoints(computed(() => activeFinds.value));

const itemResults = computed((): F76MapItem[] => {
	const q = query.value;
	if (!q || !catalog.value) return [];
	return catalog.value.items
		.map(item => {
			const ru = normalize(item.nameRu);
			const rank = ru.startsWith(q) ? 0 : ru.includes(q) ? 1 : normalize(item.nameEn).includes(q) ? 2 : -1;
			return { item, rank };
		})
		.filter(r => r.rank >= 0)
		.sort((a, b) => a.rank - b.rank || b.item.count - a.item.count)
		.slice(0, ITEM_RESULTS_MAX)
		.map(r => r.item);
});
const visibleItemResults = computed(() => showAllItemResults.value ? itemResults.value : itemResults.value.slice(0, ITEM_RESULTS_SHORT));
const componentResults = computed(() => query.value
	? components.value.filter(c => normalize(c.nameRu).startsWith(query.value) || normalize(c.nameEn).startsWith(query.value))
	: []);
watch(query, () => { showAllItemResults.value = false; });

const componentName = (id: string) => components.value.find(c => c.formId === id)?.nameRu ?? '';

// What the panel shows for a find: its name and how many points it has on the map
const finds = computed(() => activeFinds.value.map((key, i) => {
	const data = findQueries.value[i]?.data;
	const id = key.slice(2);
	const isComponent = key.startsWith('c-');
	const name = isComponent
		? componentName(id)
		: data?.items[0]?.nameRu ?? catalog.value?.items.find(item => item.id === id)?.nameRu ?? ores.value.find(o => o.id === id)?.nameRu ?? '…';
	const count = data ? data.points.reduce((sum, p) => sum + p[4], 0) : null;
	return { key, name, isComponent, count, color: POINT_COLORS[itemColorIndex(i)] };
}));

const findPoints = computed((): F76MapPoint[] => activeFinds.value.flatMap((key, i) => {
	const data = findQueries.value[i]?.data;
	if (!data) return [];
	const group = key.startsWith('c-') ? componentName(key.slice(2)) : null;
	const colorIndex = itemColorIndex(i);
	return data.points.map(([mapX, mapY, item, place, count, inside, isPts], j) => ({
		id: `${key}-${j}`,
		name: data.items[item]?.nameRu ?? '',
		group,
		placeNameRu: place >= 0 ? data.places[place]?.nameRu ?? null : null,
		inside: inside === 1,
		count,
		// Items aren't tied to regions; the region filter applies to locations and layers
		regionFormId: null,
		mapX,
		mapY,
		isPts: isPts === 1,
		formId: null,
		colorIndex,
	}));
}));

const points = computed(() => [...layerPoints.value, ...findPoints.value]);

const selected = computed(() => locations.value.find(m => m.formId === selectedId.value) ?? null);
const selectedPoint = computed(() => selected.value ? null : points.value.find(o => o.id === selectedId.value) ?? null);

const otherStyle = computed((): F76MapStyle => mapStyle.value === 'paper' ? 'military' : 'paper');

const iconUrl = (icon: string) => `/public/img/f76/map/icons/${icon}.svg`;

const updateQuery = () => {
	const query = { ...route.query };
	const set = (key: string, value: string | null) => {
		if (value) query[key] = value;
		else delete query[key];
	};
	set('m', selectedId.value);
	set('region', regionId.value);
	set('layers', activeLayers.value.length ? activeLayers.value.join(',') : null);
	set('find', activeFinds.value.length ? activeFinds.value.join(',') : null);
	set('style', mapStyle.value === 'paper' ? null : mapStyle.value);
	set('icons', showIcons.value ? null : '0');
	set('labels', showLabels.value ? null : '0');
	router.replace({ query });
};

const selectMarker = (formId: string | null, fly = false) => {
	selectedId.value = formId;
	const point = selected.value ?? selectedPoint.value;
	if (fly && point) {
		canvas.value?.flyTo(point);
		isPanelOpen.value = false;
	}
	updateQuery();
};

const setRegion = (formId: string | null) => {
	regionId.value = formId;
	if (selected.value && regionId.value && selected.value.regionFormId !== regionId.value) selectedId.value = null;
	updateQuery();
};

const toggleLayer = (id: string) => {
	activeLayers.value = activeLayers.value.includes(id)
		? activeLayers.value.filter(l => l !== id)
		: [...activeLayers.value, id];
	updateQuery();
};

// A new find past the color count pushes out the oldest one
const toggleFind = (key: string) => {
	activeFinds.value = activeFinds.value.includes(key)
		? activeFinds.value.filter(k => k !== key)
		: [...activeFinds.value, key].slice(-MAX_FINDS);
	updateQuery();
};

const findColor = (key: string) => {
	const i = activeFinds.value.indexOf(key);
	return i < 0 ? null : POINT_COLORS[itemColorIndex(i)];
};

const toggleStyle = () => {
	mapStyle.value = otherStyle.value;
	updateQuery();
};

// Enter takes the first result: a resource, then an item, then a location
const onSearchEnter = () => {
	const component = componentResults.value[0];
	const item = itemResults.value[0];
	const first = listMarkers.value[0];
	if (component) toggleFind(`c-${component.formId}`);
	else if (item) toggleFind(`i-${item.id}`);
	else if (first) selectMarker(first.formId, true);
};

const onCanvasReady = () => {
	const point = selected.value ?? selectedPoint.value;
	if (point) canvas.value?.flyTo(point);
};

// Region, layers, finds and the selected point from the URL wait for the data: on client-side navigation it
// arrives after mount, and a point of a layer or a find only exists once it has loaded.
let pendingQuery: { region?: unknown; layers?: unknown; find?: unknown } | null = null;
let pendingSelect: string | null = null;

const applyPendingQuery = () => {
	if (pendingQuery && mapData.value) {
		const { region, layers: layerParam, find } = pendingQuery;
		pendingQuery = null;
		if (typeof region === 'string' && regions.value.some(r => r.formId === region)) regionId.value = region;
		if (typeof layerParam === 'string')
			activeLayers.value = layerParam.split(',').filter(id => layers.value.some(l => l.id === id));
		if (typeof find === 'string')
			activeFinds.value = find.split(',').filter(key => /^[ic]-[0-9a-f]{8}$/.test(key)).slice(-MAX_FINDS);
	}
	if (pendingSelect && (locations.value.some(l => l.formId === pendingSelect) || points.value.some(o => o.id === pendingSelect))) {
		selectedId.value = pendingSelect;
		pendingSelect = null;
		onCanvasReady();
	}
};

onMounted(() => {
	const { m, region, style, layers: layerParam, find, icons, labels } = route.query;
	if (style === 'military') mapStyle.value = style;
	if (icons === '0') showIcons.value = false;
	if (labels === '0') showLabels.value = false;
	pendingQuery = { region, layers: layerParam, find };
	pendingSelect = typeof m === 'string' ? m : null;
	applyPendingQuery();
});

watch([mapData, points], applyPendingQuery);

// A point leaves the map when its layer or find is turned off or the region changes; the card and ?m= go with it.
// (A location stays in `locations` across regions, so setRegion drops it itself.)
watch([selected, selectedPoint], ([marker, point]) => {
	if (selectedId.value && !pendingSelect && !marker && !point) selectMarker(null);
});

// The selected marker scrolls into view in the list
watch(selectedId, async id => {
	if (!id) return;
	await nextTick();
	document.getElementById(`map-item-${id}`)?.scrollIntoView({ block: 'nearest' });
});

const coordinates = (p: { x: number; y: number }) => `${Math.round(p.x)}, ${Math.round(p.y)}`;

const pointPlace = (p: F76MapPoint) => {
	if (!p.inside) return p.placeNameRu;
	return p.placeNameRu ? `В помещении: ${p.placeNameRu}` : 'В помещении';
};

const linkCopied = ref(false);
const copyLink = async () => {
	await navigator.clipboard.writeText(window.location.href);
	linkCopied.value = true;
	setTimeout(() => { linkCopied.value = false; }, 1500);
};

const headInput = computed((): ReactiveHead => {
	const link = 'https://rueso.ru/f76-map/';
	const image = 'https://rueso.ru/public/img/main-card-fallout.jpg';

	return {
		title: TITLE,
		meta: [
			{ name: 'description', content: DESCRIPTION },
			{ name: 'robots', content: 'index, follow' },
			{ property: 'og:title', content: TITLE },
			{ property: 'og:description', content: DESCRIPTION },
			{ property: 'og:image', content: image },
			{ property: 'og:url', content: link },
			{ property: 'og:locale', content: 'ru_RU' },
			{ property: 'og:type', content: 'website' },
			{ property: 'og:site_name', content: 'RuESO' },
			{ name: 'twitter:title', content: TITLE },
			{ name: 'twitter:description', content: DESCRIPTION },
			{ name: 'twitter:image', content: image },
			{ name: 'twitter:card', content: 'summary_large_image' },
			{ name: 'twitter:creator', content: '@TERAB1T' },
		],
		link: [
			{ rel: 'canonical', href: link },
		],
	};
});

useHead(headInput);
</script>

<template>
	<div class="map-page" :class="{ 'panel-collapsed': isPanelCollapsed }">
		<aside class="map-panel" :class="{ open: isPanelOpen }">
			<header class="map-panel-header">
				<h1>{{ TITLE }}</h1>
				<p class="map-panel-meta">
					<template v-if="locations.length">{{ locations.length }} локаций</template>
					<template v-if="updatedData?.lastModified"> · обновлено <time :datetime="formatDateTime(updatedData.lastModified)">{{ updatedData.lastModified }}</time></template>
				</p>
			</header>

			<div class="map-search">
				<Icon :icon="faMagnifyingGlass" class="map-search-icon" />
				<input v-model="search" type="search" class="form-control" placeholder="Локация, предмет или ресурс" aria-label="Поиск локаций и предметов" @keydown.enter.prevent="onSearchEnter">
				<button v-if="search" type="button" class="map-search-clear" aria-label="Очистить поиск" @click="search = ''">
					<Icon :icon="faXmark" />
				</button>
			</div>

			<div class="map-panel-scroll">
				<section v-if="query" class="map-section map-section-list">
					<div class="map-section-title">
						Предметы
						<span v-if="catalog" class="map-section-count">{{ componentResults.length + itemResults.length }}</span>
					</div>

					<ul class="map-list">
						<li v-for="c in componentResults" :key="c.formId">
							<button type="button" class="map-list-item" :class="{ active: findColor(`c-${c.formId}`) }" @click="toggleFind(`c-${c.formId}`)">
								<span class="map-find-dot" :style="{ background: findColor(`c-${c.formId}`) ?? undefined }"></span>
								<span class="map-list-name">
									{{ c.nameRu }}
									<span class="map-list-name-en">Ресурс: весь хлам, из которого он разбирается</span>
								</span>
							</button>
						</li>
					</ul>

					<div v-if="isCatalogPending" class="skeleton placeholder-glow">
						<span class="visually-hidden" role="status">Загрузка…</span>
						<div v-for="n in 3" :key="n" class="map-list-item" aria-hidden="true">
							<span class="placeholder map-find-dot"></span>
							<span class="placeholder col-7"></span>
						</div>
					</div>

					<ul v-else class="map-list">
						<li v-for="item in visibleItemResults" :key="item.id">
							<button type="button" class="map-list-item" :class="{ active: findColor(`i-${item.id}`) }" @click="toggleFind(`i-${item.id}`)">
								<span class="map-find-dot" :style="{ background: findColor(`i-${item.id}`) ?? undefined }"></span>
								<span class="map-list-name">
									{{ item.nameRu }}
									<span class="map-list-name-en">{{ ITEM_CATEGORY_NAMES[item.category] ?? item.category }} · {{ item.count }} шт. на карте</span>
								</span>
								<span v-if="item.isPts" class="badge text-bg-warning">PTS</span>
							</button>
						</li>
						<li v-if="itemResults.length > visibleItemResults.length">
							<button type="button" class="map-list-more" @click="showAllItemResults = true">Показать ещё {{ itemResults.length - visibleItemResults.length }}</button>
						</li>
						<li v-if="catalog && !itemResults.length && !componentResults.length" class="map-list-empty">Предметов не найдено</li>
					</ul>
				</section>

				<template v-else>
					<section class="map-section">
						<label class="map-section-title" for="map-region">Регион</label>
						<select id="map-region" class="form-select form-select-sm" :value="regionId ?? ''" @change="setRegion(($event.target as HTMLSelectElement).value || null)">
							<option value="">Вся Аппалачия ({{ locations.length }})</option>
							<option v-for="r in regions" :key="r.formId" :value="r.formId">{{ r.nameRu }} ({{ regionCounts.get(r.formId) ?? 0 }})</option>
						</select>
					</section>

					<section class="map-section">
						<div class="map-section-title">Слои</div>
						<label class="map-layer">
							<img :src="iconUrl('TownMarker')" alt="" width="16" height="16" class="map-layer-icon">
							<span class="map-layer-name">Значки локаций</span>
							<span class="form-check form-switch m-0 ms-auto">
								<input v-model="showIcons" class="form-check-input" type="checkbox" role="switch" @change="updateQuery">
							</span>
						</label>
						<label class="map-layer">
							<Icon :icon="faFont" class="map-layer-icon" />
							<span class="map-layer-name">Названия локаций</span>
							<span class="form-check form-switch m-0 ms-auto">
								<input v-model="showLabels" class="form-check-input" type="checkbox" role="switch" @change="updateQuery">
							</span>
						</label>
						<label v-for="l in layers" :key="l.id" class="map-layer">
							<span class="map-layer-dot" :class="{ zone: l.kind === 'zones' }" :style="{ background: layerColor(l.id) }"></span>
							<span class="map-layer-name">{{ l.nameRu }}</span>
							<span v-if="l.isPts" class="badge text-bg-warning">PTS</span>
							<!-- An area layer's count is the number of its source pieces, which means nothing to a visitor -->
							<span v-if="l.kind !== 'zones'" class="map-layer-count">{{ l.count }}</span>
							<span class="form-check form-switch m-0" :class="{ 'ms-auto': l.kind === 'zones' }">
								<input class="form-check-input" type="checkbox" role="switch" :checked="activeLayers.includes(l.id)" @change="toggleLayer(l.id)">
							</span>
						</label>
						<p v-if="activeLayers.includes('camp')" class="map-hint map-layer-hint">
							<span class="map-legend" :style="{ background: ZONE_COLORS[ZONE_ALLOWED]![1] }"></span> — можно установить C.A.M.P.
							<br>
							<span class="map-legend" :style="{ background: ZONE_COLORS[ZONE_BLOCKED]![1] }"></span> — нельзя установить C.A.M.P.
						</p>
						<p v-if="activeLayers.includes('fishing')" class="map-hint map-layer-hint">
							Вода, где под поплавком хватает глубины. Рыба зависит от региона: он в подсказке при наведении.
						</p>
					</section>

					<section v-if="finds.length" class="map-section">
						<div class="map-section-title">Найдено на карте</div>
						<div v-for="f in finds" :key="f.key" class="map-layer">
							<span class="map-layer-dot" :style="{ background: f.color }"></span>
							<span class="map-layer-name">{{ f.name }}<span v-if="f.isComponent" class="map-find-kind"> · ресурс</span></span>
							<span class="map-layer-count">{{ f.count ?? '…' }}</span>
							<button type="button" class="map-find-remove" :aria-label="`Убрать «${f.name}» с карты`" @click="toggleFind(f.key)">
								<Icon :icon="faXmark" />
							</button>
						</div>
					</section>
					<section v-if="ores.length || components.length" class="map-section">
						<button type="button" class="map-section-title map-section-toggle" :aria-expanded="isResourceListOpen" @click="isResourceListOpen = !isResourceListOpen">
							Ресурсы
							<Icon :icon="faChevronDown" class="map-section-chevron" :class="{ open: isResourceListOpen }" />
						</button>
						<template v-if="isResourceListOpen">
							<div class="map-subtitle">Рудные жилы</div>
							<div class="map-chip-list">
								<button v-for="o in ores" :key="o.id" type="button" class="map-chip-button" :class="{ active: findColor(`i-${o.id}`) }" :style="{ '--find-color': findColor(`i-${o.id}`) ?? undefined }" @click="toggleFind(`i-${o.id}`)">{{ o.nameRu }}</button>
							</div>
							<div class="map-subtitle">Хлам, который разбирается на</div>
							<div class="map-chip-list">
								<button v-for="c in components" :key="c.formId" type="button" class="map-chip-button" :class="{ active: findColor(`c-${c.formId}`) }" :style="{ '--find-color': findColor(`c-${c.formId}`) ?? undefined }" @click="toggleFind(`c-${c.formId}`)">{{ c.nameRu }}</button>
							</div>
							<p class="map-hint">Любой предмет из мира — через поиск: «чайник», «мешок цемента», «секач».</p>
						</template>
					</section>

				</template>

				<section class="map-section map-section-list">
					<button v-if="!query" type="button" class="map-section-title map-section-toggle" :aria-expanded="isLocationListOpen" @click="isLocationListOpen = !isLocationListOpen">
						Локации
						<span class="map-section-count">{{ listMarkers.length }}</span>
						<Icon :icon="faChevronDown" class="map-section-chevron" :class="{ open: isLocationListOpen }" />
					</button>
					<div v-else class="map-section-title">
						Локации
						<span class="map-section-count">{{ listMarkers.length }}</span>
					</div>

					<template v-if="isLocationListOpen || query">
						<div v-if="isMapPending" class="skeleton placeholder-glow">
							<span class="visually-hidden" role="status">Загрузка…</span>
							<div v-for="n in SKELETON_ROWS" :key="n" class="map-list-item" aria-hidden="true">
								<span class="placeholder map-list-icon"></span>
								<span class="placeholder col-8"></span>
							</div>
						</div>

						<div v-else-if="isMapError" class="alert alert-danger mt-2">
							Не удалось загрузить карту. Попробуйте обновить страницу.
						</div>

						<ul v-else class="map-list">
							<li v-for="m in listMarkers" :id="`map-item-${m.formId}`" :key="m.formId">
								<button
									type="button"
									class="map-list-item"
									:class="{ active: m.formId === selectedId }"
									@click="selectMarker(m.formId, true)"
									@mouseenter="highlightId = m.formId"
									@mouseleave="highlightId = null"
								>
									<img :src="iconUrl(m.icon)" alt="" width="24" height="24" class="map-list-icon" loading="lazy">
									<span class="map-list-name">
										{{ m.nameRu }}
										<span v-if="m.nameEn !== m.nameRu" class="map-list-name-en">{{ m.nameEn }}</span>
									</span>
									<span v-if="m.isPts" class="badge text-bg-warning">PTS</span>
								</button>
							</li>
							<li v-if="!listMarkers.length" class="map-list-empty">Локаций не найдено</li>
						</ul>
					</template>
				</section>
			</div>

			<button type="button" class="map-panel-collapse" :aria-label="isPanelCollapsed ? 'Показать панель' : 'Скрыть панель'" @click="isPanelCollapsed = !isPanelCollapsed">
				<Icon :icon="isPanelCollapsed ? faChevronRight : faChevronLeft" />
			</button>
		</aside>

		<div class="map-main">
			<F76MapCanvas
				ref="canvas"
				:markers="mapMarkers"
				:objects="points"
				:zones="zones"
				:region-labels="regionLabels"
				:map-style="mapStyle"
				:selected-id="selectedId"
				:highlight-id="highlightId"
				:show-icons="showIcons"
				:show-labels="showLabels"
				@select="id => selectMarker(id)"
				@ready="onCanvasReady"
			/>

			<button type="button" class="map-style-switch" :title="MAP_STYLE_TITLES[otherStyle]" @pointerenter="canvas?.prefetchStyle(otherStyle)" @focus="canvas?.prefetchStyle(otherStyle)" @click="toggleStyle">
				<span class="map-style-preview" :style="{ backgroundImage: `url('/public/img/f76/map/tiles/${otherStyle}/0/0/0.webp')` }"></span>
				<span class="map-style-label">{{ MAP_STYLE_NAMES[otherStyle] }}</span>
			</button>

			<div class="map-controls" role="group" aria-label="Масштаб">
				<button type="button" aria-label="Приблизить" @click="canvas?.zoomBy(1)"><Icon :icon="faPlus" /></button>
				<button type="button" aria-label="Отдалить" @click="canvas?.zoomBy(-1)"><Icon :icon="faMinus" /></button>
				<button type="button" aria-label="Вся карта" @click="canvas?.resetView()"><Icon :icon="faExpand" /></button>
			</div>

			<button type="button" class="map-panel-toggle" @click="isPanelOpen = !isPanelOpen">
				<Icon :icon="isPanelOpen ? faXmark : faMagnifyingGlass" />
				{{ isPanelOpen ? 'Карта' : 'Поиск и слои' }}
			</button>

			<div v-if="selected || selectedPoint" class="map-card">
				<button type="button" class="map-card-close" aria-label="Закрыть" @click="selectMarker(null)">
					<Icon :icon="faXmark" />
				</button>

				<template v-if="selected">
					<div class="map-card-title">
						<img :src="iconUrl(selected.icon)" alt="" width="36" height="36">
						<div>
							<div class="map-card-name">{{ selected.nameRu }}</div>
							<div v-if="selected.nameEn !== selected.nameRu" class="map-card-name-en">{{ selected.nameEn }}</div>
						</div>
					</div>

					<div class="map-card-chips">
						<span v-if="selected.regionFormId" class="map-chip">{{ regionNames.get(selected.regionFormId) }}</span>
						<span v-if="selected.isPts" class="map-chip map-chip-pts">Новое на PTS</span>
						<span v-if="selected.initiallyDisabled" class="map-chip">Появляется по сюжету или событию</span>
					</div>

					<dl class="map-card-details">
						<dt>Координаты</dt>
						<dd>{{ coordinates(selected) }}</dd>
						<dt>Form ID</dt>
						<dd><code>{{ selected.formId }}</code></dd>
					</dl>
				</template>

				<template v-else-if="selectedPoint">
					<div class="map-card-title">
						<span class="map-card-dot" :style="{ background: POINT_COLORS[selectedPoint.colorIndex] }"></span>
						<div>
							<div class="map-card-name">{{ selectedPoint.name }}</div>
							<div v-if="pointPlace(selectedPoint)" class="map-card-name-en">{{ pointPlace(selectedPoint) }}</div>
						</div>
					</div>

					<div class="map-card-chips">
						<span v-if="selectedPoint.group" class="map-chip">{{ selectedPoint.group }}</span>
						<span v-if="selectedPoint.regionFormId" class="map-chip">{{ regionNames.get(selectedPoint.regionFormId) }}</span>
						<span v-if="selectedPoint.inside && selectedPoint.count > 1" class="map-chip">Внутри: {{ selectedPoint.count }}</span>
						<span v-if="selectedPoint.isPts" class="map-chip map-chip-pts">Новое на PTS</span>
					</div>

					<p v-if="selectedPoint.inside" class="map-card-note">Точка стоит у входа в помещение.</p>

					<dl v-if="selectedPoint.formId" class="map-card-details">
						<dt>Form ID</dt>
						<dd><code>{{ selectedPoint.formId }}</code></dd>
					</dl>
				</template>

				<button type="button" class="map-card-action" @click="copyLink">
					<Icon :icon="faLink" />
					{{ linkCopied ? 'Ссылка скопирована' : 'Скопировать ссылку' }}
				</button>
			</div>
		</div>
	</div>
</template>

<style scoped lang="scss">
$panel-width: 340px;
$map-surface: rgba(24, 24, 22, 0.94);
$map-text: #f1ead2;
$map-muted: rgba(241, 234, 210, 0.62);

.map-page {
	position: relative;
	display: flex;
	// Navbar height: brand logo 50px + paddings
	height: calc(100dvh - 66px);
	min-height: 420px;
}

.map-panel {
	position: relative;
	display: flex;
	flex-direction: column;
	width: $panel-width;
	flex-shrink: 0;
	min-height: 0;
	border-right: 1px solid var(--bs-border-color);
	background: var(--bs-body-bg);
	transition: margin-left 0.2s ease;
	z-index: 20;

	.panel-collapsed & {
		margin-left: -$panel-width;
	}
}

.map-panel-header {
	padding: 1rem 1rem 0.75rem;

	h1 {
		font-size: 1.15rem;
		font-weight: 600;
		margin-bottom: 0.2rem;
	}
}

.map-panel-meta {
	margin: 0;
	font-size: 0.8125rem;
	color: var(--bs-secondary-color);
}

.map-search {
	position: relative;
	margin: 0 1rem 0.75rem;

	.form-control {
		padding-left: 2.25rem;
		padding-right: 2.25rem;
		border-radius: 2rem;
	}

	// The browser's own clear button would duplicate ours
	input::-webkit-search-cancel-button {
		display: none;
	}
}

.map-search-icon {
	position: absolute;
	left: 0.9rem;
	top: 50%;
	transform: translateY(-50%);
	color: var(--bs-secondary-color);
	pointer-events: none;
}

.map-search-clear {
	position: absolute;
	right: 0.5rem;
	top: 50%;
	transform: translateY(-50%);
	width: 1.75rem;
	height: 1.75rem;
	border: 0;
	border-radius: 50%;
	background: transparent;
	color: var(--bs-secondary-color);

	&:hover {
		background: var(--bs-tertiary-bg);
		color: var(--bs-body-color);
	}
}

.map-panel-scroll {
	flex: 1;
	min-height: 0;
	overflow-y: auto;
	// Reserve the scrollbar's space: otherwise the layer hints that appear make it show up and narrow the content
	scrollbar-gutter: stable;
	border-top: 1px solid var(--bs-border-color);
}

.map-section {
	padding: 0.75rem 1rem;

	& + & {
		border-top: 1px solid var(--bs-border-color);
	}
}

.map-section-list {
	padding-left: 0;
	padding-right: 0;

	.map-section-title {
		padding: 0 1rem;
	}
}

.map-section-title {
	display: flex;
	align-items: center;
	gap: 0.4rem;
	margin-bottom: 0.4rem;
	font-size: 0.75rem;
	font-weight: 600;
	text-transform: uppercase;
	letter-spacing: 0.05em;
	color: var(--bs-secondary-color);
}

.map-section-count {
	font-weight: 400;
}

.map-section-toggle {
	width: 100%;
	padding: 0;
	margin-bottom: 0;
	border: 0;
	background: transparent;

	&:hover {
		color: var(--bs-body-color);
	}

	&[aria-expanded="true"] {
		margin-bottom: 0.4rem;
	}
}

.map-section-chevron {
	margin-left: auto;
	transition: transform 0.15s;

	&.open {
		transform: rotate(180deg);
	}
}

.map-subtitle {
	margin: 0.35rem 0 0.3rem;
	font-size: 0.8125rem;
	color: var(--bs-secondary-color);
}

.map-chip-list {
	display: flex;
	flex-wrap: wrap;
	gap: 0.3rem;
}

.map-chip-button {
	padding: 0.15rem 0.6rem;
	border: 1px solid var(--bs-border-color);
	border-radius: 1rem;
	background: transparent;
	color: var(--bs-body-color);
	font-size: 0.8125rem;

	&:hover {
		background: var(--bs-tertiary-bg);
	}

	// The point color of the find, so the chip and its points read as one
	&.active {
		border-color: var(--find-color);
		box-shadow: inset 0 0 0 1px var(--find-color);
		background: color-mix(in srgb, var(--find-color) 18%, transparent);
	}
}

.map-hint {
	margin: 0.5rem 0 0;
	font-size: 0.8125rem;
	color: var(--bs-secondary-color);
}

.map-layer-hint {
	margin: 0 0 0.35rem;
}

.map-legend {
	display: inline-block;
	width: 0.6rem;
	height: 0.6rem;
	border-radius: 0.15rem;
	vertical-align: baseline;
}

.map-find-dot {
	width: 0.75rem;
	height: 0.75rem;
	flex-shrink: 0;
	border-radius: 50%;
	box-shadow: inset 0 0 0 1.5px var(--bs-secondary-color);
	margin: 0 0.35rem;
}

.map-find-kind {
	color: var(--bs-secondary-color);
}

.map-find-remove {
	width: 1.6rem;
	height: 1.6rem;
	flex-shrink: 0;
	border: 0;
	border-radius: 50%;
	background: transparent;
	color: var(--bs-secondary-color);

	&:hover {
		background: var(--bs-tertiary-bg);
		color: var(--bs-body-color);
	}
}

.map-list-more {
	width: 100%;
	padding: 0.35rem 1rem;
	border: 0;
	background: transparent;
	color: var(--bs-link-color);
	font-size: 0.875rem;
	text-align: left;

	&:hover {
		text-decoration: underline;
	}
}

.map-layer {
	display: flex;
	align-items: center;
	gap: 0.55rem;
	padding: 0.35rem 0;
	font-size: 0.9rem;
	cursor: pointer;

	.form-check-input {
		cursor: pointer;
	}
}

.map-layer-dot {
	width: 0.75rem;
	height: 0.75rem;
	flex-shrink: 0;
	border-radius: 50%;
	box-shadow: 0 0 0 1.5px rgba(10, 18, 24, 0.9);

	// Areas, not points
	&.zone {
		border-radius: 0.2rem;
		opacity: 0.8;
	}
}

.map-layer-icon {
	width: 0.75rem;
	height: 0.75rem;
	flex-shrink: 0;
	object-fit: contain;
	color: var(--bs-secondary-color);
	transform: scale(1.4);
}

.map-layer-name {
	min-width: 0;
}

.map-layer-count {
	margin-left: auto;
	font-size: 0.8125rem;
	color: var(--bs-secondary-color);
}

.map-list {
	list-style: none;
	margin: 0;
	padding: 0;

	// ~480 locations, a dozen of them on screen: the browser skips the layout of the rest.
	// 43px is an item with an English subtitle; `auto` keeps the real size once an item has been shown.
	> li {
		content-visibility: auto;
		contain-intrinsic-size: auto 43px;
	}
}

.map-list-item {
	display: flex;
	align-items: center;
	gap: 0.65rem;
	width: 100%;
	padding: 0.35rem 1rem;
	border: 0;
	background: transparent;
	color: var(--bs-body-color);
	text-align: left;

	&:hover {
		background: var(--bs-tertiary-bg);
	}

	&.active {
		background: var(--bs-primary-bg-subtle);
	}

	.badge {
		margin-left: auto;
	}
}

.map-list-icon {
	width: 24px;
	height: 24px;
	flex-shrink: 0;
}

.map-list-name {
	display: flex;
	flex-direction: column;
	line-height: 1.2;
	font-size: 0.9rem;
}

.map-list-name-en {
	font-size: 0.75rem;
	color: var(--bs-secondary-color);
}

.map-list-empty {
	padding: 0.5rem 1rem;
	color: var(--bs-secondary-color);
}

.skeleton .map-list-item {
	.col-8,
	.col-7 {
		height: 1rem;
	}
}

.map-panel-collapse {
	position: absolute;
	top: 50%;
	right: -1.5rem;
	transform: translateY(-50%);
	width: 1.5rem;
	height: 3rem;
	border: 1px solid var(--bs-border-color);
	border-left: 0;
	border-radius: 0 0.5rem 0.5rem 0;
	background: var(--bs-body-bg);
	color: var(--bs-secondary-color);
	font-size: 0.75rem;

	&:hover {
		color: var(--bs-body-color);
	}
}

.map-main {
	position: relative;
	flex: 1;
	min-width: 0;
}

// Floating controls over the map share one look
@mixin map-floating {
	border: 0;
	background: $map-surface;
	color: $map-text;
	box-shadow: 0 2px 10px rgba(0, 0, 0, 0.45);
}

.map-style-switch {
	@include map-floating;
	position: absolute;
	left: 0.75rem;
	bottom: 0.75rem;
	display: flex;
	flex-direction: column;
	padding: 3px;
	border-radius: 0.6rem;
	z-index: 10;

	&:hover .map-style-preview {
		filter: brightness(1.12);
	}
}

.map-style-preview {
	display: block;
	width: 76px;
	height: 76px;
	border-radius: 0.45rem;
	background: #1b1a17 center / 135% no-repeat;
	transition: filter 0.15s;
}

.map-style-label {
	position: absolute;
	left: 3px;
	right: 3px;
	bottom: 3px;
	padding: 0.15rem 0;
	border-radius: 0 0 0.45rem 0.45rem;
	background: linear-gradient(transparent, rgba(0, 0, 0, 0.8));
	font-size: 0.75rem;
	font-weight: 600;
	text-align: center;
}

.map-controls {
	@include map-floating;
	position: absolute;
	right: 0.75rem;
	bottom: 0.75rem;
	display: flex;
	flex-direction: column;
	border-radius: 0.6rem;
	overflow: hidden;
	z-index: 10;

	button {
		width: 2.4rem;
		height: 2.4rem;
		border: 0;
		background: transparent;
		color: $map-text;

		& + button {
			border-top: 1px solid rgba(255, 255, 255, 0.08);
		}

		&:hover {
			background: rgba(255, 255, 255, 0.08);
		}
	}
}

.map-panel-toggle {
	display: none;
}

.map-card {
	@include map-floating;
	position: absolute;
	top: 0.75rem;
	right: 0.75rem;
	width: 310px;
	max-width: calc(100% - 1.5rem);
	padding: 1rem;
	border-radius: 0.75rem;
	z-index: 10;
}

.map-card-close {
	position: absolute;
	top: 0.5rem;
	right: 0.5rem;
	width: 1.9rem;
	height: 1.9rem;
	border: 0;
	border-radius: 50%;
	background: transparent;
	color: $map-muted;

	&:hover {
		background: rgba(255, 255, 255, 0.08);
		color: $map-text;
	}
}

.map-card-title {
	display: flex;
	align-items: center;
	gap: 0.75rem;
	padding-right: 1.75rem;
	margin-bottom: 0.65rem;
}

.map-card-name {
	font-size: 1.05rem;
	font-weight: 600;
	line-height: 1.25;
}

.map-card-name-en {
	font-size: 0.8125rem;
	color: $map-muted;
}

.map-card-dot {
	width: 1.1rem;
	height: 1.1rem;
	flex-shrink: 0;
	margin: 0 0.4rem;
	border-radius: 50%;
	box-shadow: 0 0 0 2px rgba(10, 18, 24, 0.9);
}

.map-card-chips {
	display: flex;
	flex-wrap: wrap;
	gap: 0.35rem;
	margin-bottom: 0.65rem;

	&:empty {
		display: none;
	}
}

.map-chip {
	padding: 0.15rem 0.55rem;
	border-radius: 1rem;
	background: rgba(255, 255, 255, 0.09);
	font-size: 0.78rem;
}

.map-chip-pts {
	background: rgba(255, 193, 7, 0.22);
	color: #ffd65c;
}

.map-card-note {
	margin: -0.25rem 0 0.65rem;
	font-size: 0.8125rem;
	color: $map-muted;
}

.map-card-details {
	display: grid;
	grid-template-columns: auto 1fr;
	gap: 0.2rem 0.75rem;
	margin-bottom: 0.75rem;
	font-size: 0.85rem;

	dt {
		font-weight: 400;
		color: $map-muted;
	}

	dd {
		margin: 0;
	}

	code {
		color: inherit;
	}
}

.map-card-action {
	display: inline-flex;
	align-items: center;
	gap: 0.45rem;
	padding: 0.35rem 0.8rem;
	border: 1px solid rgba(255, 255, 255, 0.18);
	border-radius: 2rem;
	background: transparent;
	color: $map-text;
	font-size: 0.85rem;

	&:hover {
		background: rgba(255, 255, 255, 0.08);
	}
}

@media (max-width: 767.98px) {
	.map-panel {
		position: absolute;
		inset: 0;
		width: 100%;
		border-right: 0;
		visibility: hidden;

		&.open {
			visibility: visible;
		}
	}

	.map-panel-collapse {
		display: none;
	}

	.map-panel-toggle {
		@include map-floating;
		position: fixed;
		left: 50%;
		bottom: 0.75rem;
		transform: translateX(-50%);
		display: inline-flex;
		align-items: center;
		gap: 0.5rem;
		padding: 0.55rem 1.1rem;
		border-radius: 2rem;
		font-weight: 600;
		z-index: 30;
	}

	// Pinch zooms on a phone, and the bottom belongs to the card and the panel button
	.map-style-switch {
		top: 0.75rem;
		bottom: auto;
	}

	.map-style-preview {
		width: 56px;
		height: 56px;
	}

	.map-controls {
		top: 0.75rem;
		bottom: auto;

		button:not(:last-child) {
			display: none;
		}

		button:last-child {
			border-top: 0;
		}
	}

	// Room for the floating panel button
	.map-panel-scroll {
		padding-bottom: 4rem;
	}

	.map-card {
		top: auto;
		bottom: 4rem;
		left: 0.75rem;
		right: 0.75rem;
		width: auto;
	}
}
</style>
