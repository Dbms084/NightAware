/**
 * Shared geospatial domain types for NightAware.
 * Single source of truth for all geo, POI, scoring, and routing types.
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
  originName?: string;
  destinationName?: string;
};

// ---------------------------------------------------------------------------
// Places & POIs
// ---------------------------------------------------------------------------

/**
 * Categories of points of interest relevant to nighttime safety.
 */
export type PlaceCategory =
  | 'hospital'
  | 'pharmacy'
  | 'petrol_station'
  | 'shop_food'
  | 'transport'
  | 'help_point'
  | 'police'
  | 'cctv'
  | 'streetlight';

/** Human-readable labels for each PlaceCategory. */
export const PLACE_CATEGORY_LABELS: Record<PlaceCategory, string> = {
  hospital: 'Hospital / Emergency Medical',
  pharmacy: '24/7 Pharmacy / Medical Store',
  petrol_station: 'Petrol Pump & Convenience',
  shop_food: 'Shop / Restaurant / Cafe',
  transport: 'Public Transit / Metro Station',
  help_point: 'Verified Help Point',
  police: 'Police Station / Outpost',
  cctv: 'Public CCTV Infrastructure',
  streetlight: 'Verified Street Lighting Zone',
};

/** Icon / emoji for each PlaceCategory. */
export const PLACE_CATEGORY_ICONS: Record<PlaceCategory, string> = {
  hospital: '🏥',
  pharmacy: '💊',
  petrol_station: '⛽',
  shop_food: '🍽️',
  transport: '🚌',
  help_point: '🆘',
  police: '🚔',
  cctv: '📷',
  streetlight: '💡',
};

/** Markers color mapping matching Section 5 of specification */
export const PLACE_MARKER_COLORS: Record<PlaceCategory, string> = {
  hospital: '#ef4444',       // Red
  pharmacy: '#a855f7',       // Purple
  petrol_station: '#f97316', // Orange
  shop_food: '#22c55e',      // Green (when open)
  transport: '#06b6d4',      // Cyan
  help_point: '#ec4899',     // Pink
  police: '#3b82f6',         // Blue
  cctv: '#64748b',           // Slate / Distinct
  streetlight: '#eab308',    // Amber / Yellow
};

/** Arrival status at an establishment based on user's journey progress */
export type ArrivalStatus =
  | 'open_at_arrival'
  | 'closing_soon'
  | 'closed_at_arrival'
  | 'open_24_7'
  | 'unknown';

/** A point of interest relevant to route safety. */
export type Place = {
  id: string;
  name: string;
  coordinate: Coordinate;
  category: PlaceCategory;
  address?: string;
  phone?: string;
  is24_7?: boolean;
  openTime?: string;
  closeTime?: string;
  /** Distance in metres from start of route */
  distanceFromStartMeters?: number;
  /** Perpendicular distance from route corridor */
  distanceFromRouteMeters?: number;
  /** Estimated arrival time (e.g. "22:18") */
  estimatedArrivalTime?: string;
  /** Opening status at estimated arrival */
  arrivalStatus?: ArrivalStatus;
  /** Legacy flag */
  openAtJourneyTime: boolean | null;
  /** Origin of data */
  dataSource: 'mock' | 'provider' | 'supabase';
};

// ---------------------------------------------------------------------------
// Scoring & Parameters
// ---------------------------------------------------------------------------

/**
 * Configurable weights for the 9 Night Activity Score parameters (total = 100).
 */
export interface ScoringWeights {
  openShops: number;              // 20
  openingHours: number;           // 15
  essentialServices: number;      // 10
  activityContinuity: number;     // 15
  mainRoadAccessibility: number;  // 10
  helpPoints: number;             // 10
  streetLighting: number;         // 10
  cctvCoverage: number;           // 5
  publicTransport: number;        // 5
}

export const DEFAULT_SCORING_WEIGHTS: ScoringWeights = {
  openShops: 20,
  openingHours: 15,
  essentialServices: 10,
  activityContinuity: 15,
  mainRoadAccessibility: 10,
  helpPoints: 10,
  streetLighting: 10,
  cctvCoverage: 5,
  publicTransport: 5,
};

/** Category-wise score breakdown out of 100 points */
export type ScoreBreakdown = {
  openShopsScore: number;             // out of weights.openShops (20)
  openingHoursScore: number;          // out of weights.openingHours (15)
  essentialServicesScore: number;     // out of weights.essentialServices (10)
  activityContinuityScore: number;    // out of weights.activityContinuity (15)
  mainRoadScore: number;              // out of weights.mainRoadAccessibility (10)
  helpPointsScore: number;            // out of weights.helpPoints (10)
  streetLightingScore: number;        // out of weights.streetLighting (10)
  cctvScore: number;                  // out of weights.cctvCoverage (5)
  publicTransportScore: number;       // out of weights.publicTransport (5)
  total: number;                      // 0–100
};

// ---------------------------------------------------------------------------
// Routes & Heatmap
// ---------------------------------------------------------------------------

/** Heatmap activity color */
export type HeatmapColor = '#4ADE80' | '#FACC15' | '#FF9400' | '#F87171';

/** Segment evaluated for heatmaps (100–200m) */
export type RouteHeatmapSegment = {
  startIndex: number;
  endIndex: number;
  coordinates: Coordinate[];
  activityScore: number;
  color: HeatmapColor;
  nearbyOpenCount: number;
  isIsolated: boolean;
};

/** Candidate route profiles */
export type RouteProfileType = 'safest' | 'fastest' | 'balanced';

/** Contiguous segment of a route */
export type RouteSegment = {
  coordinates: Coordinate[];
  safetyScore?: number;
};

/**
 * Full candidate route with intelligent safety characteristics.
 */
export type RouteOption = {
  id: string;
  /** Display label e.g. "Safer profile", "Balanced", "Fastest" */
  label: string;
  /** Profile classification */
  profileType: RouteProfileType;
  /** Polyline coordinates */
  coordinates: Coordinate[];
  /** Segment-by-segment activity breakdown for heatmap display */
  heatmapSegments: RouteHeatmapSegment[];
  /** Legacy segments */
  segments?: RouteSegment[];
  /** Total route distance in metres */
  distanceMeters: number;
  /** Estimated travel time in minutes */
  durationMinutes: number;
  /** Extra minutes compared to the fastest alternative */
  extraMinutes: number;
  /** Night Activity Score (0–100) */
  nightActivityScore: number;
  /** Detailed parameter-by-parameter score breakdown */
  scoreBreakdown: ScoreBreakdown;
  /** Short evidence summary e.g. "12 open places · longest quiet stretch 90 m" */
  routeEvidence: string;
  /** Longest quiet/isolated stretch in metres */
  longestQuietStretchMeters: number;
  /** Percentage of route along major roads */
  mainRoadPercentage: number;
  /** Verified lighting coverage percentage */
  lightingCoveragePercentage: number;
  /** POIs along this route */
  establishments: Place[];
  /** Counts of mapped infrastructure */
  placesOpenNearRoute: number;
  closedPlacesCount: number;
  twentyFourSevenCount: number;
  pharmaciesCount: number;
  petrolPumpsCount: number;
  policeCount: number;
  hospitalsCount: number;
  publicTransportCount: number;
  cctvCount: number;
  /** Legacy fields */
  longestStretchWithoutOpenHelpMeters?: number | null;
  longestLowActivityStretchMeters?: number | null;
  isMock: boolean;
};

// ---------------------------------------------------------------------------
// Safety Zones & Reports
// ---------------------------------------------------------------------------

export type RiskLevel = 'low' | 'medium' | 'high';

export type SafetyZone = {
  id: string;
  coordinate: Coordinate;
  radiusMeters: number;
  riskLevel: RiskLevel;
  reason: string;
  isMock: boolean;
};

export type CommunityReport = {
  id?: string;
  reportType: 'poor_lighting' | 'isolated_stretch' | 'harassment' | 'closed_early' | 'other';
  description: string;
  latitude: number;
  longitude: number;
  severity: 'low' | 'medium' | 'high';
  createdAt?: string;
};

export type TrustedContact = {
  id: string;
  name: string;
  phone: string;
  relationship: string;
  isSos: boolean;
};

// ---------------------------------------------------------------------------
// Map Defaults
// ---------------------------------------------------------------------------

export const RISK_LEVEL_COLORS: Record<RiskLevel, string> = {
  low: '#4ADE80',    // green
  medium: '#FACC15', // yellow
  high: '#F87171',   // red
};

export const DEFAULT_MAP_REGION: MapRegion = {
  latitude: 12.9716,
  longitude: 77.6412,
  latitudeDelta: 0.015,
  longitudeDelta: 0.015,
};
