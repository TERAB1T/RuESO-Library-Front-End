// Everything the map needs from OpenLayers, loaded with one dynamic import (one chunk): OpenLayers
// touches the DOM and is only needed in the browser.
export { default as Map } from 'ol/Map';
export { default as View } from 'ol/View';
export { default as Overlay } from 'ol/Overlay';
export { default as TileLayer } from 'ol/layer/Tile';
export { default as XYZ } from 'ol/source/XYZ';
export { default as TileGrid } from 'ol/tilegrid/TileGrid';
export { default as Projection } from 'ol/proj/Projection';
export { default as VectorLayer } from 'ol/layer/Vector';
export { default as WebGLVectorLayer } from 'ol/layer/WebGLVector';
export { default as VectorSource } from 'ol/source/Vector';
export { default as Feature } from 'ol/Feature';
export { default as Point } from 'ol/geom/Point';
export { default as Style } from 'ol/style/Style';
export { default as Icon } from 'ol/style/Icon';
export { default as Text } from 'ol/style/Text';
export { default as Fill } from 'ol/style/Fill';
export { default as Stroke } from 'ol/style/Stroke';
export { default as CircleStyle } from 'ol/style/Circle';
