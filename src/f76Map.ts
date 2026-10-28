import type { F76MapObject } from '@/types';

export type F76MapStyle = 'paper' | 'military';

// A point of a turned-on layer; colorIndex picks its color from LAYER_COLORS.
export type F76MapObjectPoint = F76MapObject & { colorIndex: number; layerName: string };

// Point colors. No blues or cyans: location icons are blue.
export const LAYER_COLORS = ['#ff4545', '#c38cff', '#9be15d', '#f7d154', '#ff9a3c', '#ff5fa2'];

// A layer keeps its color however the layer list is sorted or grows
const LAYER_COLOR_INDEX: Record<string, number> = {
	'pint-sized-slasher-masks': 0,
	'brains-in-jars': 1,
};

// Layers without a fixed color take the palette in list order
export const layerColorIndex = (layerId: string, position: number) =>
	LAYER_COLOR_INDEX[layerId] ?? position % LAYER_COLORS.length;
