import L from 'leaflet';

const JOVIAT_MARKER_HTML = '<span class="joviat-map-marker__letter">J</span>';

export const joviatMapIcon = L.divIcon({
  html: JOVIAT_MARKER_HTML,
  className: 'joviat-map-marker',
  iconSize: L.point(34, 44, true),
  iconAnchor: L.point(17, 42, true),
  popupAnchor: L.point(0, -38, true),
});
