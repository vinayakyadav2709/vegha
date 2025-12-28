/**
 * leaflet-heat.d.ts
 * 
 * Purpose: TypeScript type declarations for leaflet.heat plugin.
 * Allows TypeScript to recognize L.heatLayer() method.
 */

import * as L from 'leaflet';

declare module 'leaflet' {
  function heatLayer(
    latlngs: Array<[number, number, number?]>,
    options?: {
      radius?: number;
      blur?: number;
      maxZoom?: number;
      max?: number;
      gradient?: { [key: number]: string };
    }
  ): L.Layer;
}
