import L from 'leaflet';
import joviatPinSrc from '../assets/images/joviat_pin.png';

export const joviatMapIcon = L.icon({
  iconUrl: joviatPinSrc,
  className: 'joviat-map-marker',
  iconSize: L.point(34, 44, true),
  iconAnchor: L.point(17, 42, true),
  popupAnchor: L.point(0, -38, true),
});
