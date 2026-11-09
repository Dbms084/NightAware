/**
 * Dark map style for Google Maps matching NightAware's dark theme.
 *
 * Background ≈ #0b1014, roads ≈ #20282e, labels muted.
 * Generated with https://mapstyle.withgoogle.com and tuned to match the app.
 */

import type { MapStyleElement } from 'react-native-maps';

export const darkMapStyle: MapStyleElement[] = [
  // -- Base geometry --
  {
    elementType: 'geometry',
    stylers: [{ color: '#0b1014' }],
  },
  {
    elementType: 'labels.text.fill',
    stylers: [{ color: '#6b7280' }],
  },
  {
    elementType: 'labels.text.stroke',
    stylers: [{ color: '#0b1014' }, { weight: 2.5 }],
  },
  // -- Administrative --
  {
    featureType: 'administrative',
    elementType: 'geometry',
    stylers: [{ visibility: 'off' }],
  },
  {
    featureType: 'administrative.locality',
    elementType: 'labels.text.fill',
    stylers: [{ color: '#85909b' }],
  },
  // -- POI (hide by default) --
  {
    featureType: 'poi',
    stylers: [{ visibility: 'off' }],
  },
  // -- Roads --
  {
    featureType: 'road',
    elementType: 'geometry',
    stylers: [{ color: '#1a1f24' }],
  },
  {
    featureType: 'road',
    elementType: 'geometry.stroke',
    stylers: [{ color: '#20282e' }],
  },
  {
    featureType: 'road',
    elementType: 'labels.text.fill',
    stylers: [{ color: '#5a636e' }],
  },
  {
    featureType: 'road.highway',
    elementType: 'geometry',
    stylers: [{ color: '#242a30' }],
  },
  {
    featureType: 'road.highway',
    elementType: 'geometry.stroke',
    stylers: [{ color: '#2c343a' }],
  },
  {
    featureType: 'road.highway',
    elementType: 'labels.text.fill',
    stylers: [{ color: '#6b7280' }],
  },
  {
    featureType: 'road.arterial',
    elementType: 'geometry',
    stylers: [{ color: '#1e252b' }],
  },
  // -- Transit --
  {
    featureType: 'transit',
    elementType: 'geometry',
    stylers: [{ color: '#161b20' }],
  },
  {
    featureType: 'transit.station',
    elementType: 'labels.text.fill',
    stylers: [{ color: '#6b7280' }],
  },
  // -- Water --
  {
    featureType: 'water',
    elementType: 'geometry',
    stylers: [{ color: '#080c10' }],
  },
  {
    featureType: 'water',
    elementType: 'labels.text.fill',
    stylers: [{ color: '#3d4854' }],
  },
  // -- Landscape --
  {
    featureType: 'landscape',
    elementType: 'geometry',
    stylers: [{ color: '#0e1318' }],
  },
  {
    featureType: 'landscape.man_made',
    elementType: 'geometry',
    stylers: [{ color: '#10161a' }],
  },
  {
    featureType: 'landscape.natural',
    elementType: 'geometry',
    stylers: [{ color: '#0c1015' }],
  },
];

