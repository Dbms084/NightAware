/**
 * Shared geospatial domain types for NightAware.
 *
 * These types form the integration contract between:
 *   - Member 2 (Geospatial Mapping)
 *   - Member 3 (Incident Reporting)
 *   - Member 4 (AI Safety Prediction)
 *   - Member 5 (Route Optimization)
 *   - Member 6 (Backend & Database)
 *
 * Keep this file as the single source of truth for all geo-related types.
 * Do not duplicate these definitions in feature modules.
 */

// ---------------------------------------------------------------------------
// Primitives
// ---------------------------------------------------------------------------

/** A WGS-84 geographic coordinate. */
export type Coordinate = {
  latitude: number;
  longitude: number;
};

/** An axis-aligned bounding box in WGS-84 coordinates. */
export type BoundingBox = {
  north: number;
  south: number;
  east: number;
  west: number;
};

/** Region descriptor used by react-native-maps. */
export type MapRegion = {
  latitude: number;
  longitude: number;
  latitudeDelta: number;
  longitudeDelta: number;
};

// ---------------------------------------------------------------------------
// Travel
// ---------------------------------------------------------------------------

/** Supported travel modes. */
export type TravelMode = 'driving' | 'walking' | 'cycling';

/** Everything the app needs to plan a journey. */
export type JourneyRequest = {
  origin: Coordinate;
  destination: Coordinate;
  departureTime: Date;
  travelMode: TravelMode;
};

// ---------------------------------------------------------------------------
// Places
// ---------------------------------------------------------------------------

/**
 * Categories of points of interest relevant to nighttime safety.
 *
 * When adding a category, also update mock data and any UI category-filter
 * components that enumerate this union.
 */
export type PlaceCategory =
  | 'hospital'
  | 'pharmacy'
  | 'petrol_station'
  | 'shop_food'
  | 'transport'
  | 'help_point'
  | 'police'
  | 'cctv';

/** Human-readable labels for each PlaceCategory. */
export const PLACE_CATEGORY_LABELS: Record<PlaceCategory, string> = {
  hospital: 'Hospital',
  pharmacy: 'Pharmacy / Medical Store',
  petrol_station: 'Petrol Station',
  shop_food: 'Shop / Food',
  transport: 'Transport',
  help_point: 'Help Point',
  police: 'Police Station',
  cctv: 'CCTV Camera',
};

/** Icon name (emoji fallback) for each PlaceCategory. */
export const PLACE_CATEGORY_ICONS: Record<PlaceCategory, string> = {
  hospital: '🏥',
  pharmacy: '💊',
  petrol_station: '⛽',
  shop_food: '🍽️',
  transport: '🚌',
  help_point: '🆘',
  police: '🚔',
  cctv: '📷',
};

/** A point of interest relevant to route safety. */
export type Place = {
  id: string;
  name: string;
  coordinate: Coordinate;
  category: PlaceCategory;
  /**
   * Whether this place is expected to be open at the journey's departure time.
   * - `true`  — confirmed/likely open
   * - `false` — confirmed/likely closed
   * - `null`  — hours unknown or unavailable
   */
  openAtJourneyTime: boolean | null;
  /** Origin of the data: 'mock' for demo fixtures, 'provider' for a real API. */
  dataSource: 'mock' | 'provider';
};

// ---------------------------------------------------------------------------
// Routes
// ---------------------------------------------------------------------------

/** A contiguous segment of a route, optionally scored for safety. */
export type RouteSegment = {
  coordinates: Coordinate[];
  /** Per-segment safety/activity score (0–100), or undefined if not computed. */
  safetyScore?: number;
};

/**
 * A candidate route between origin and destination.
 *
 * Scores and place counts use `number | null` so the UI can distinguish
 * between "zero" (computed, result is 0) and "unavailable" (not computed or
 * data insufficient).
 */
export type RouteOption = {
  id: string;
  /** Display label, e.g. "More nearby activity", "Fastest route". */
  label: string;
  /** Ordered waypoints defining the route polyline. */
  coordinates: Coordinate[];
  /** Optional per-segment breakdown for detailed safety visualisation. */
  segments?: RouteSegment[];
  /** Total route distance in metres. */
  distanceMeters: number;
  /** Estimated travel time in minutes for the selected travel mode. */
  durationMinutes: number;
  /** Extra minutes compared to the fastest route (0 for the fastest). */
  extraMinutes: number;
  /**
   * Night Activity Score (0–100).
   * An activity proxy, NOT a safety guarantee.
   * `null` means data is insufficient to compute a score.
   */
  nightActivityScore: number | null;
  /** Count of POIs along the route expected to be open at journey time. */
  placesOpenNearRoute: number | null;
  /** Longest gap (metres) between consecutive open help points. */
  longestStretchWithoutOpenHelpMeters: number | null;
  /** Longest stretch (metres) through a low-activity zone. */
  longestLowActivityStretchMeters: number | null;
  /** Whether this data comes from mock fixtures. */
  isMock: boolean;
};

// ---------------------------------------------------------------------------
// Safety
// ---------------------------------------------------------------------------

/** Risk level for a geographic zone. */
export type RiskLevel = 'low' | 'medium' | 'high';

/** A circular zone with an assessed risk/activity level. */
export type SafetyZone = {
  id: string;
  coordinate: Coordinate;
  /** Radius of influence in metres. */
  radiusMeters: number;
  /** Assessed risk level — higher risk = lower nighttime activity. */
  riskLevel: RiskLevel;
  /** Human-readable reason for the assessment. */
  reason: string;
  /** Whether this data comes from mock fixtures. */
  isMock: boolean;
};

// ---------------------------------------------------------------------------
// Map presentation helpers
// ---------------------------------------------------------------------------

/** Colours associated with risk levels for map overlays. */
export const RISK_LEVEL_COLORS: Record<RiskLevel, string> = {
  low: '#4ADE80',    // green — higher activity / more facilities
  medium: '#FACC15', // yellow — moderate
  high: '#F87171',   // red — lower activity / fewer facilities
};

/** Default map region centred on Bengaluru · Indiranagar. */
export const DEFAULT_MAP_REGION: MapRegion = {
  latitude: 12.9716,
  longitude: 77.6412,
  latitudeDelta: 0.015,
  longitudeDelta: 0.015,
};

