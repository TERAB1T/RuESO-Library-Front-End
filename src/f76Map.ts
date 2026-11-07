export type F76MapStyle = 'paper' | 'military';

// A point drawn over the map: a layer's point or a found item's. colorIndex picks its color from POINT_COLORS.
export interface F76MapPoint {
	// Feature id; also the ?m= value
	id: string;
	// Vendor or item name, or the layer's name
	name: string;
	// Where the point comes from when that differs from its name: the layer of a vendor, the resource of an item
	group: string | null;
	placeNameRu: string | null;
	// Inside an interior: the point is the entrance, count is the copies inside
	inside: boolean;
	count: number;
	regionFormId: string | null;
	mapX: number;
	mapY: number;
	isPts: boolean;
	formId: string | null;
	colorIndex: number;
}

// An area drawn over the map; color indexes ZONE_COLORS
export interface F76MapZone {
	// Outer ring and holes, map pixels: x0, y0, x1, y1, …
	rings: number[][];
	color: number;
	tooltip: string | null;
}

// Point colors. No blues or cyans: location icons are blue. The first six belong to the layers,
// the rest go to found items and resources in turn.
export const POINT_COLORS = [
	'#ff4545', '#c38cff', '#9be15d', '#f7d154', '#ff9a3c', '#ff5fa2',
	'#ffffff', '#d9ff3d', '#a0703c', '#9aa0a6', '#8e1b3a', '#1fbf75',
];
const LAYER_COLOR_COUNT = 6;

// A layer keeps its color however the layer list is sorted or grows
const LAYER_COLOR_INDEX: Record<string, number> = {
	'pint-sized-slasher-masks': 0,
	'brains-in-jars': 1,
	'magazines': 2,
	'bobbleheads': 3,
	'animal-taming': 4,
	'vendors': 5,
};

// Layers without a fixed color take the layer colors in list order
export const layerColorIndex = (layerId: string, position: number) =>
	LAYER_COLOR_INDEX[layerId] ?? position % LAYER_COLOR_COUNT;

export const itemColorIndex = (position: number) => LAYER_COLOR_COUNT + position % (POINT_COLORS.length - LAYER_COLOR_COUNT);

// Area colors: [fill, outline]
export const ZONE_COLORS: [string, string][] = [
	// C.A.M.P. zones
	['rgba(70, 200, 90, 0.2)', 'rgba(70, 200, 90, 0.7)'],
	['rgba(229, 72, 77, 0.35)', 'rgba(229, 72, 77, 0.85)'],
	// Fishing waters: water is the one blue thing allowed
	['rgba(40, 170, 255, 0.55)', 'rgba(120, 210, 255, 0.95)'],
	// Regions, in the order of the region list
	['rgba(76, 175, 80, 0.22)', 'rgba(76, 175, 80, 0.9)'],
	['rgba(255, 193, 7, 0.22)', 'rgba(255, 193, 7, 0.9)'],
	['rgba(156, 39, 176, 0.22)', 'rgba(186, 104, 200, 0.9)'],
	['rgba(244, 67, 54, 0.2)', 'rgba(244, 67, 54, 0.9)'],
	['rgba(255, 152, 0, 0.22)', 'rgba(255, 152, 0, 0.9)'],
	['rgba(0, 150, 136, 0.22)', 'rgba(77, 182, 172, 0.9)'],
	['rgba(158, 158, 158, 0.25)', 'rgba(224, 224, 224, 0.9)'],
	['rgba(121, 85, 72, 0.3)', 'rgba(161, 136, 127, 0.95)'],
];
export const ZONE_ALLOWED = 0;
export const ZONE_BLOCKED = 1;
export const ZONE_WATER = 2;
const ZONE_REGION_FIRST = 3;

// Each region keeps a color that suits it (by its LCTN form ID): the Forest green, the Toxic Valley yellow…
const REGION_ZONE_COLORS: Record<string, number> = {
	'00095004': 3, // Forest
	'00088aba': 4, // Toxic Valley
	'006923e8': 5, // Skyline Valley
	'000012a2': 6, // Cranberry Bog
	'007ae5a6': 7, // Burning Springs
	'000045e1': 8, // the Mire
	'001789f8': 9, // Savage Divide
	'000045d0': 10, // Ash Heap
};

// A region without a fixed color takes the region colors in list order
export const regionZoneColor = (formId: string, position: number) =>
	REGION_ZONE_COLORS[formId] ?? ZONE_REGION_FIRST + position % (ZONE_COLORS.length - ZONE_REGION_FIRST);

export const ITEM_CATEGORY_NAMES: Record<string, string> = {
	junk: 'Хлам',
	misc: 'Разное',
	weapon: 'Оружие',
	apparel: 'Одежда и броня',
	aid: 'Еда и препараты',
	book: 'Книги и журналы',
	ammo: 'Боеприпасы',
	note: 'Записки и голозаписи',
	key: 'Ключи',
	flora: 'Растения',
	ore: 'Рудная жила',
};
