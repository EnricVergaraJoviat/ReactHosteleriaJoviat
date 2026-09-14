export const NEUTRAL_MAP_TILE_ATTRIBUTION = [
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
  '&copy; <a href="https://carto.com/attributions">CARTO</a>',
].join(' ');

const CARTO_BASEMAPS_API_KEY = process.env.REACT_APP_CARTO_BASEMAPS_API_KEY ?? '';
const CARTO_LIGHT_TILE_URL = 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png';

export const NEUTRAL_MAP_TILE_URL = CARTO_BASEMAPS_API_KEY
  ? `${CARTO_LIGHT_TILE_URL}?key=${encodeURIComponent(CARTO_BASEMAPS_API_KEY)}`
  : CARTO_LIGHT_TILE_URL;
