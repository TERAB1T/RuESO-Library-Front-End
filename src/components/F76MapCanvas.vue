<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, watch } from 'vue';
import 'ol/ol.css';

import type OlMap from 'ol/Map';
import type Feature from 'ol/Feature';
import type TileLayerType from 'ol/layer/Tile';
import type VectorLayer from 'ol/layer/Vector';
import type WebGLVectorLayer from 'ol/layer/WebGLVector';
import type { StyleLike } from 'ol/style/Style';
import type { F76MapMarker } from '@/types';
import { LAYER_COLORS } from '@/f76Map';
import type { F76MapObjectPoint, F76MapStyle } from '@/f76Map';

const props = defineProps<{
	markers: F76MapMarker[];
	objects: F76MapObjectPoint[];
	regionLabels: F76MapMarker[];
	mapStyle: F76MapStyle;
	selectedId: string | null;
	// Marker or point under the cursor in the list: shown with a lighter ring
	highlightId: string | null;
	showIcons: boolean;
	showLabels: boolean;
}>();

const emit = defineEmits<{
	select: [formId: string | null];
	ready: [];
}>();

// The map texture is 4096×4096; its pixels are the map's coordinate units (OpenLayers' y axis points up).
const MAP_SIZE = 4096;
const EXTENT = [0, 0, MAP_SIZE, MAP_SIZE];
// 512px tiles, levels 0–3: level 0 is the whole map in one tile, level 3 is the texture at full size.
const TILE_SIZE = 512;
const TILE_RESOLUTIONS = [8, 4, 2, 1];
// Past resolution 1 the browser stretches the last level.
const VIEW_RESOLUTIONS = [16, ...TILE_RESOLUTIONS, 0.5, 0.25];
const MAP_STYLES: F76MapStyle[] = ['paper', 'military'];
// Location names appear from this resolution down, region names above it.
const LABEL_MAX_RESOLUTION = 2;
// Icon scale by resolution, like in game: small on the whole map, full size up close (1 = 24px icon).
const ICON_SCALE_STOPS: [number, number][] = [[0.25, 1.5], [0.5, 1.35], [1, 1.1], [2, 0.9], [4, 0.73], [8, 0.59], [16, 0.48]];

const ASSETS = '/public/img/f76/map';
const tileUrl = (style: F76MapStyle, z: number | string, x: number | string, y: number | string) => `${ASSETS}/tiles/${style}/${z}/${x}/${y}.webp`;
const iconUrl = (icon: string) => `${ASSETS}/icons/${icon}.svg`;
const PIN_SVG = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(
	'<svg xmlns="http://www.w3.org/2000/svg" width="28" height="38" viewBox="0 0 28 38">'
	+ '<path d="M14 37s12-14.5 12-23a12 12 0 0 0-24 0c0 8.5 12 23 12 23z" fill="#e5484d" stroke="#2a0e0e" stroke-width="2"/>'
	+ '<circle cx="14" cy="14" r="4.5" fill="#fff"/></svg>',
);
const toMapCoordinate = (m: F76MapMarker) => [m.mapX, MAP_SIZE - m.mapY];

interface IconAtlas {
	scale: number;
	icons: Record<string, [number, number, number, number]>;
}

const container = ref<HTMLDivElement>();
const tooltip = ref<{ text: string; x: number; y: number } | null>(null);
// Region names show on the zoomed-out map only, like location names show zoomed in
const showRegions = ref(true);
// Region names keep their size relative to the map, as in game (full size at resolution 3.5),
// but never shrink below readable
const regionScale = ref(1);
const REGION_FULL_SIZE_RESOLUTION = 3.5;
const REGION_MIN_SCALE = 0.45;

let map: OlMap | null = null;
let atlas: IconAtlas | null = null;
const tileLayers = new Map<F76MapStyle, TileLayerType>();
let markerLayer: WebGLVectorLayer | null = null;
let objectLayer: WebGLVectorLayer | null = null;
let labelLayer: VectorLayer | null = null;
let OverlayClass: typeof import('ol/Overlay').default | null = null;
let regionOverlays: InstanceType<typeof import('ol/Overlay').default>[] = [];
let selectedLayer: VectorLayer | null = null;
let FeatureClass: typeof Feature | null = null;
let PointClass: typeof import('ol/geom/Point').default | null = null;
let disposed = false;

// Every tile is fetched once per page: the browser keeps a loaded image URL in memory for the document,
// so OpenLayers asking for it again (after its own cache drops it, or on a style switch) costs no request.
const loadedTiles: HTMLImageElement[] = [];
const prefetchedStyles = new Set<F76MapStyle>();

const prefetchStyle = (style: F76MapStyle) => {
	if (prefetchedStyles.has(style)) return;
	prefetchedStyles.add(style);
	for (let z = 0; z < TILE_RESOLUTIONS.length; z++) {
		const count = 1 << z;
		for (let x = 0; x < count; x++)
			for (let y = 0; y < count; y++) {
				const img = new Image();
				img.decoding = 'async';
				img.src = tileUrl(style, z, x, y);
				loadedTiles.push(img);
			}
	}
};

const whenIdle = (fn: () => void) => {
	if ('requestIdleCallback' in window) window.requestIdleCallback(fn, { timeout: 3000 });
	else setTimeout(fn, 1000);
};

const buildFeatures = (markers: F76MapMarker[], withAtlas: boolean) => markers.map(m => {
	const feature = new FeatureClass!({ geometry: new PointClass!(toMapCoordinate(m)) });
	feature.setId(m.formId);
	feature.set('marker', m);
	if (withAtlas) {
		const [ax, ay, aw, ah] = atlas!.icons[m.icon] ?? [0, 0, 0, 0];
		feature.setProperties({ ax, ay, aw, ah });
	}
	return feature;
});

const setLayerMarkers = (layer: VectorLayer | WebGLVectorLayer | null, markers: F76MapMarker[]) => {
	const source = layer?.getSource();
	if (!source) return;
	source.clear(true);
	source.addFeatures(buildFeatures(markers, layer === markerLayer));
};

const setLayerObjects = (objects: F76MapObjectPoint[]) => {
	const source = objectLayer?.getSource();
	if (!source) return;
	source.clear(true);
	source.addFeatures(objects.map(o => {
		const feature = new FeatureClass!({ geometry: new PointClass!([o.mapX, MAP_SIZE - o.mapY]) });
		feature.setId(o.formId);
		feature.setProperties({ object: o, color: o.colorIndex });
		return feature;
	}));
};

// Region names are plain HTML over the map, styled like the game's: the point is the label's top left corner
const setRegionLabels = (labels: F76MapMarker[]) => {
	if (!map || !OverlayClass) return;
	for (const overlay of regionOverlays) map.removeOverlay(overlay);
	regionOverlays = labels.map(label => {
		const element = document.createElement('div');
		element.className = 'map-region-label';
		element.textContent = label.nameRu;
		const overlay = new OverlayClass!({ element, position: toMapCoordinate(label), positioning: 'top-left', stopEvent: false });
		map!.addOverlay(overlay);
		return overlay;
	});
};

const iconScale = (resolution: number) => {
	let [r0, s0] = ICON_SCALE_STOPS[0]!;
	if (resolution <= r0) return s0;
	for (const [r1, s1] of ICON_SCALE_STOPS) {
		if (resolution <= r1) return s0 + (s1 - s0) * (resolution - r0) / (r1 - r0);
		[r0, s0] = [r1, s1];
	}
	return s0;
};

const updateSelected = () => {
	const source = selectedLayer?.getSource();
	if (!source) return;
	source.clear(true);
	const ids = [props.highlightId, props.selectedId].filter((id, i, a) => id && a.indexOf(id) === i);
	for (const id of ids) {
		const marker = props.markers.find(m => m.formId === id);
		const object = marker ? undefined : props.objects.find(o => o.formId === id);
		const feature = marker
			? buildFeatures([marker], false)[0]!
			: object ? new FeatureClass!({ geometry: new PointClass!([object.mapX, MAP_SIZE - object.mapY]), object }) : null;
		if (!feature) continue;
		feature.set('highlight', id !== props.selectedId);
		source.addFeature(feature);
	}
	labelLayer?.changed();
};

onMounted(async () => {
	const [ol, atlasData] = await Promise.all([
		import('@/olMap'),
		// Without the atlas the map still works, just without marker icons
		fetch(`${ASSETS}/icons.json`).then(r => r.ok ? r.json() as Promise<IconAtlas> : null).catch(() => null),
	]);
	if (disposed || !container.value) return;
	const {
		Map, View, TileLayer, XYZ, TileGrid, Projection, VectorLayer: VectorLayerClass, WebGLVectorLayer: WebGLVectorLayerClass,
		VectorSource, Feature: FeatureImport, Point, Style, Icon, Text, Fill, Stroke, CircleStyle, Overlay,
	} = ol;
	OverlayClass = Overlay;

	atlas = atlasData;
	FeatureClass = FeatureImport;
	PointClass = Point;

	const projection = new Projection({ code: 'f76-appalachia', units: 'pixels', extent: EXTENT });
	const tileGrid = new TileGrid({ extent: EXTENT, origin: [0, MAP_SIZE], resolutions: TILE_RESOLUTIONS, tileSize: TILE_SIZE });

	// One layer per style: a switch shows the new one under the old and drops the old once it has rendered.
	// preload keeps the lower levels drawn, so a tile not decoded yet shows blurry instead of a hole.
	for (const style of MAP_STYLES) {
		tileLayers.set(style, new TileLayer({
			source: new XYZ({ url: tileUrl(style, '{z}', '{x}', '{y}'), projection, tileGrid, wrapX: false, transition: 0 }),
			preload: Infinity,
			visible: style === props.mapStyle,
		}));
	}

	// Markers are drawn by WebGL from one icon atlas: thousands of points cost about as much as a few hundred.
	if (!atlas) console.error('Map icon atlas failed to load');
	else markerLayer = new WebGLVectorLayerClass({
		source: new VectorSource(),
		style: {
			'icon-src': `${ASSETS}/icons.webp`,
			'icon-offset': ['array', ['get', 'ax'], ['get', 'ay']],
			'icon-size': ['array', ['get', 'aw'], ['get', 'ah']],
			'icon-scale': ['/', ['interpolate', ['linear'], ['resolution'], ...ICON_SCALE_STOPS.flat()], atlas.scale],
		},
		zIndex: 2,
	});

	// Layer points, also WebGL: a layer can hold thousands of them
	objectLayer = new WebGLVectorLayerClass({
		source: new VectorSource(),
		style: {
			'circle-radius': ['interpolate', ['linear'], ['resolution'], 0.25, 9, 1, 7, 4, 5, 16, 4],
			'circle-fill-color': ['match', ['get', 'color'], ...LAYER_COLORS.flatMap((color, i) => [i, color]), '#ffffff'],
			'circle-stroke-color': 'rgba(10, 18, 24, 0.9)',
			'circle-stroke-width': 1.5,
		},
		zIndex: 3,
	});

	// The selected marker is drawn again on top, bigger and with a ring; a selected point gets just the ring.
	// A highlighted one (hovered in the list) gets a lighter ring.
	// A pin above the point (its tip just over the icon) leaves the icon itself readable
	const selectedStyle: StyleLike = (feature, resolution) => {
		const marker = feature.get('marker') as F76MapMarker | undefined;
		const object = feature.get('object') as F76MapObjectPoint | undefined;
		const highlight = feature.get('highlight') === true;
		const scale = iconScale(resolution) * 1.3;
		const point = marker
			? new Style({ image: new Icon({ src: iconUrl(marker.icon), scale }) })
			: new Style({
				image: new CircleStyle({ radius: 9, fill: new Fill({ color: LAYER_COLORS[object!.colorIndex] }), stroke: new Stroke({ color: 'rgba(10, 18, 24, 0.9)', width: 2 }) }),
			});
		const halfHeight = marker ? 12 * scale : 9;
		const pin = new Style({
			image: new Icon({ src: PIN_SVG, anchor: [0.5, 1], displacement: [0, halfHeight - 2], opacity: highlight ? 0.55 : 1 }),
			zIndex: 1,
		});
		return [point, pin];
	};

	const labelStyles = new globalThis.Map<string, InstanceType<typeof Style>>();
	const labelStyle: StyleLike = (feature) => {
		const marker = feature.get('marker') as F76MapMarker;
		const selected = marker.formId === props.selectedId;
		const key = `${marker.formId}|${selected}`;
		let style = labelStyles.get(key);
		if (!style) {
			style = new Style({
				text: new Text({
					text: marker.nameRu,
					font: `${selected ? 700 : 600} 12px system-ui, -apple-system, "Segoe UI", sans-serif`,
					offsetY: 22,
					fill: new Fill({ color: selected ? '#ffffff' : '#f1ead2' }),
					stroke: new Stroke({ color: 'rgba(0, 0, 0, 0.85)', width: 3 }),
				}),
				zIndex: selected ? 10 : 0,
			});
			labelStyles.set(key, style);
		}
		return style;
	};


	// Above the labels: the pin must not hide under a neighbour's name
	selectedLayer = new VectorLayerClass({ source: new VectorSource(), style: selectedStyle, zIndex: 7 });
	labelLayer = new VectorLayerClass({ source: new VectorSource(), style: labelStyle, declutter: true, maxResolution: LABEL_MAX_RESOLUTION, zIndex: 5 });

	const olMap = new Map({
		target: container.value,
		// Zoom buttons are the page's own (see zoomBy/resetView)
		controls: [],
		layers: [...tileLayers.values(), ...(markerLayer ? [markerLayer] : []), objectLayer, selectedLayer, labelLayer],
		view: new View({
			projection,
			center: [MAP_SIZE / 2, MAP_SIZE / 2],
			resolutions: VIEW_RESOLUTIONS,
			extent: EXTENT,
			constrainOnlyCenter: true,
			showFullExtent: true,
		}),
	});
	map = olMap;
	olMap.getView().fit(EXTENT, { padding: [16, 16, 16, 16] });

	setLayerMarkers(markerLayer, props.markers);
	setLayerMarkers(labelLayer, props.markers);
	setRegionLabels(props.regionLabels);
	const updateRegions = () => {
		const resolution = olMap.getView().getResolution()!;
		showRegions.value = resolution >= LABEL_MAX_RESOLUTION;
		regionScale.value = Math.min(1, Math.max(REGION_MIN_SCALE, REGION_FULL_SIZE_RESOLUTION / resolution));
	};
	updateRegions();
	olMap.getView().on('change:resolution', updateRegions);
	setLayerObjects(props.objects);
	markerLayer?.setVisible(props.showIcons);
	labelLayer.setVisible(props.showLabels);
	updateSelected();

	// Points lie on top of markers, so they win a hit
	const hitOptions = { layerFilter: (layer: unknown) => layer === markerLayer || layer === objectLayer };

	olMap.on('pointermove', event => {
		if (event.dragging) {
			tooltip.value = null;
			return;
		}
		const feature = olMap.forEachFeatureAtPixel(event.pixel, f => f, hitOptions);
		container.value!.style.cursor = feature ? 'pointer' : '';
		const marker = feature?.get('marker') as F76MapMarker | undefined;
		const object = feature?.get('object') as F76MapObjectPoint | undefined;
		const [x, y] = event.pixel as [number, number];
		// Labels already name the markers when zoomed in
		if (marker) tooltip.value = olMap.getView().getResolution()! > LABEL_MAX_RESOLUTION ? { text: marker.nameRu, x, y } : null;
		else if (object) tooltip.value = { text: object.locationNameRu ? `${object.layerName} — ${object.locationNameRu}` : object.layerName, x, y };
		else tooltip.value = null;
	});

	container.value.addEventListener('pointerleave', () => { tooltip.value = null; });

	olMap.on('click', event => {
		const feature = olMap.forEachFeatureAtPixel(event.pixel, f => f, hitOptions);
		emit('select', (feature?.getId() as string | undefined) ?? null);
	});

	// After the first frame: every tile of the current style, then the other styles when the browser is idle
	olMap.once('rendercomplete', () => {
		prefetchStyle(props.mapStyle);
		const saveData = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection?.saveData;
		if (!saveData) whenIdle(() => MAP_STYLES.forEach(prefetchStyle));
	});

	emit('ready');
});

onBeforeUnmount(() => {
	disposed = true;
	map?.setTarget(undefined);
	map?.dispose();
	map = null;
	loadedTiles.length = 0;
});

watch(() => props.mapStyle, (style, previous) => {
	const next = tileLayers.get(style);
	const old = tileLayers.get(previous);
	if (!map || !next || !old) return;
	prefetchStyle(style);
	next.setZIndex(-1);
	next.setVisible(true);
	map.once('rendercomplete', () => {
		// Another switch may have happened meanwhile
		if (props.mapStyle !== style) return;
		old.setVisible(false);
		next.setZIndex(0);
	});
});

watch(() => props.markers, markers => {
	setLayerMarkers(markerLayer, markers);
	setLayerMarkers(labelLayer, markers);
	updateSelected();
});

watch(() => props.objects, objects => {
	setLayerObjects(objects);
	updateSelected();
});

watch(() => [props.selectedId, props.highlightId], updateSelected);

watch(() => props.showIcons, show => markerLayer?.setVisible(show));
watch(() => props.showLabels, show => labelLayer?.setVisible(show));

const flyTo = (point: { mapX: number; mapY: number }) => {
	const view = map?.getView();
	if (!view) return;
	view.animate({ center: [point.mapX, MAP_SIZE - point.mapY], resolution: Math.min(view.getResolution() ?? 1, 1), duration: 600 });
};

const zoomBy = (delta: number) => {
	const view = map?.getView();
	if (!view) return;
	view.animate({ zoom: (view.getZoom() ?? 0) + delta, duration: 200 });
};

const resetView = () => map?.getView().fit(EXTENT, { padding: [16, 16, 16, 16], duration: 400 });

defineExpose({ flyTo, zoomBy, resetView });
</script>

<template>
	<div class="map-canvas" :class="{ 'hide-regions': !showRegions }" :style="{ '--region-scale': regionScale }">
		<div ref="container" class="map-target"></div>
		<div v-if="tooltip" class="map-tooltip" :style="{ left: `${tooltip.x}px`, top: `${tooltip.y}px` }">{{ tooltip.text }}</div>
	</div>
</template>

<style scoped lang="scss">
.map-canvas {
	position: relative;
	width: 100%;
	height: 100%;
	overflow: hidden;
	background: #1b1a17;
}

.map-target {
	position: absolute;
	inset: 0;
}

// Like the game's region name: Roboto Condensed Bold (the Russian game's Futura) on a dark band fading out to the sides
:deep(.map-region-label) {
	min-width: 174px;
	padding: 0.15rem 2rem;
	background: linear-gradient(90deg, transparent, rgba(27, 29, 36, 0.8) 30%, rgba(27, 29, 36, 0.8) 70%, transparent);
	color: #a39a8f;
	font-family: "Roboto Condensed", "Arial Narrow", sans-serif;
	font-size: 20px;
	font-weight: 700;
	text-align: center;
	text-transform: uppercase;
	text-shadow: 1.5px 0.5px 0 rgba(0, 0, 0, 0.35);
	white-space: nowrap;
	pointer-events: none;
	user-select: none;
	// The point is the top left corner, so scale from there
	transform: scale(var(--region-scale, 1));
	transform-origin: 0 0;
}

.hide-regions :deep(.map-region-label) {
	display: none;
}

.map-tooltip {
	position: absolute;
	transform: translate(-50%, calc(-100% - 18px));
	padding: 0.2rem 0.5rem;
	border-radius: 0.25rem;
	background: rgba(15, 15, 15, 0.9);
	color: #f1ead2;
	font-size: 0.8125rem;
	white-space: nowrap;
	pointer-events: none;
	z-index: 5;
}

</style>
