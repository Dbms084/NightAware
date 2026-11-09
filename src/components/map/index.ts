/**
 * Map components — barrel export.
 *
 * Usage:
 *   import { NightAwareMap, OriginMarker, RoutePolyline, SafetyOverlay } from '@/components/map';
 */

export { NightAwareMap, createMapRegion } from './NightAwareMap';
export type { NightAwareMapProps } from './NightAwareMap';

export {
  OriginMarker,
  DestinationMarker,
  PlaceMarker,
  SafetyMarker,
  CCTVMarker,
  IncidentMarker,
  ClusterMarker,
} from './MapMarkers';
export type { MarkerData } from './MapMarkers';

export { RoutePolyline } from './RoutePolyline';
export type { RoutePolylineProps, PolylineData } from './RoutePolyline';

export { SafetyOverlay } from './SafetyOverlay';
export type { SafetyOverlayProps } from './SafetyOverlay';

export { RouteDetailSheet } from './RouteDetailSheet';
export type { RouteDetailSheetProps } from './RouteDetailSheet';

export { darkMapStyle } from './map-styles';

