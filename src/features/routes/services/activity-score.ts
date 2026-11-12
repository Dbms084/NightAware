/**
 * NightAware — Intelligent Night Activity Scoring Engine.
 *
 * Implements the 9-parameter weighted scoring model (0–100) defined in specification:
 * 1. Open shops & establishments (20 pts)
 * 2. Opening hours & time-based availability (15 pts)
 * 3. Pharmacy & 24/7 essential services (10 pts)
 * 4. Activity continuity & isolation gaps (15 pts)
 * 5. Main-road accessibility (10 pts)
 * 6. Police stations, hospitals & help points (10 pts)
 * 7. Street lighting (10 pts)
 * 8. CCTV coverage (5 pts)
 * 9. Public transport accessibility (5 pts)
 *
 * TOTAL: 100 points
 */

import type {
  Coordinate,
  Place,
  PlaceCategory,
  ScoreBreakdown,
  ScoringWeights,
  RouteHeatmapSegment,
  HeatmapColor,
  ArrivalStatus,
  TravelMode,
} from '@/types/geo';
import { DEFAULT_SCORING_WEIGHTS } from '@/types/geo';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Haversine distance in metres between two coordinates */
export function distanceMeters(a: Coordinate, b: Coordinate): number {
  const R = 6_371_000;
  const dLat = ((b.latitude - a.latitude) * Math.PI) / 180;
  const dLon = ((b.longitude - a.longitude) * Math.PI) / 180;
  const sinLat = Math.sin(dLat / 2);
  const sinLon = Math.sin(dLon / 2);
  const h =
    sinLat * sinLat +
    Math.cos((a.latitude * Math.PI) / 180) *
      Math.cos((b.latitude * Math.PI) / 180) *
      sinLon * sinLon;
  return R * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
}

/** Total polyline distance */
export function computeTotalDistanceMeters(coords: Coordinate[]): number {
  let dist = 0;
  for (let i = 0; i < coords.length - 1; i++) {
    dist += distanceMeters(coords[i], coords[i + 1]);
  }
  return dist;
}

/** Travel speed in metres per second */
function getSpeedMps(mode: TravelMode): number {
  switch (mode) {
    case 'cycling':
      return 4.2; // ~15 km/h
    case 'driving':
      return 8.3; // ~30 km/h (city night)
    case 'walking':
    default:
      return 1.3; // ~4.7 km/h
  }
}

/** Parse "HH:MM" into minutes from midnight */
function parseTimeToMinutes(timeStr: string): number | null {
  const parts = timeStr.split(':');
  if (parts.length < 2) return null;
  const h = parseInt(parts[0], 10);
  const m = parseInt(parts[1], 10);
  if (isNaN(h) || isNaN(m)) return null;
  return h * 60 + m;
}

/** Format Date as "HH:MM" */
function formatTime(d: Date): string {
  const h = d.getHours().toString().padStart(2, '0');
  const m = d.getMinutes().toString().padStart(2, '0');
  return `${h}:${m}`;
}

// ---------------------------------------------------------------------------
// Arrival Time & Status Calculator
// ---------------------------------------------------------------------------

/**
 * Calculates user's estimated arrival time at an establishment and evaluates
 * whether it will be open, closing soon, or closed when the user arrives.
 */
export function evaluateEstablishmentArrival(
  place: Place,
  routeCoords: Coordinate[],
  departureTime: Date,
  travelMode: TravelMode = 'walking',
): {
  distanceFromStart: number;
  distanceFromRoute: number;
  estimatedArrivalTime: string;
  arrivalStatus: ArrivalStatus;
  isOpenAtArrival: boolean;
} {
  // Find closest point on route to place
  let minDistance = Infinity;
  let accumulatedDistAtMin = 0;
  let runningDist = 0;

  for (let i = 0; i < routeCoords.length; i++) {
    if (i > 0) {
      runningDist += distanceMeters(routeCoords[i - 1], routeCoords[i]);
    }
    const d = distanceMeters(place.coordinate, routeCoords[i]);
    if (d < minDistance) {
      minDistance = d;
      accumulatedDistAtMin = runningDist;
    }
  }

  // Arrival time calculation
  const speed = getSpeedMps(travelMode);
  const travelSeconds = accumulatedDistAtMin / speed;
  const arrivalDate = new Date(departureTime.getTime() + travelSeconds * 1000);
  const arrivalTimeStr = formatTime(arrivalDate);
  const arrivalMinutes = arrivalDate.getHours() * 60 + arrivalDate.getMinutes();

  // Operating status
  let arrivalStatus: ArrivalStatus = 'unknown';
  let isOpenAtArrival = false;

  if (place.is24_7) {
    arrivalStatus = 'open_24_7';
    isOpenAtArrival = true;
  } else if (place.openTime && place.closeTime) {
    const openM = parseTimeToMinutes(place.openTime);
    const closeM = parseTimeToMinutes(place.closeTime);

    if (openM !== null && closeM !== null) {
      // Handle midnight crossing (e.g. 18:00 to 02:00)
      const spansMidnight = closeM < openM;
      const isOpen = spansMidnight
        ? arrivalMinutes >= openM || arrivalMinutes < closeM
        : arrivalMinutes >= openM && arrivalMinutes < closeM;

      if (!isOpen) {
        arrivalStatus = 'closed_at_arrival';
        isOpenAtArrival = false;
      } else {
        // Check closing soon (within 30 minutes of close)
        const minToClose = spansMidnight
          ? (arrivalMinutes >= openM ? (1440 - arrivalMinutes + closeM) : (closeM - arrivalMinutes))
          : (closeM - arrivalMinutes);

        if (minToClose > 0 && minToClose <= 30) {
          arrivalStatus = 'closing_soon';
          isOpenAtArrival = true;
        } else {
          arrivalStatus = 'open_at_arrival';
          isOpenAtArrival = true;
        }
      }
    }
  } else {
    // Fallback to openAtJourneyTime if specific hours unknown
    if (place.openAtJourneyTime === true) {
      arrivalStatus = 'open_at_arrival';
      isOpenAtArrival = true;
    } else if (place.openAtJourneyTime === false) {
      arrivalStatus = 'closed_at_arrival';
      isOpenAtArrival = false;
    } else {
      arrivalStatus = 'unknown';
      isOpenAtArrival = false;
    }
  }

  return {
    distanceFromStart: Math.round(accumulatedDistAtMin),
    distanceFromRoute: Math.round(minDistance),
    estimatedArrivalTime: arrivalTimeStr,
    arrivalStatus,
    isOpenAtArrival,
  };
}

// ---------------------------------------------------------------------------
// 9-Parameter Scoring Engine
// ---------------------------------------------------------------------------

export type CalculationResult = {
  score: number;
  breakdown: ScoreBreakdown;
  heatmapSegments: RouteHeatmapSegment[];
  longestQuietStretchMeters: number;
  mainRoadPercentage: number;
  lightingCoveragePercentage: number;
  routeEvidence: string;
  enrichedPlaces: Place[];
  counts: {
    openPlaces: number;
    closedPlaces: number;
    twentyFourSeven: number;
    pharmacies: number;
    petrolPumps: number;
    police: number;
    hospitals: number;
    publicTransport: number;
    cctv: number;
  };
};

/**
 * Computes the 100-point Night Activity Score and segment heatmaps.
 */
export function calculateNightActivityScore(
  routeCoords: Coordinate[],
  rawPlaces: Place[],
  departureTime: Date = new Date(),
  travelMode: TravelMode = 'walking',
  weights: ScoringWeights = DEFAULT_SCORING_WEIGHTS,
): CalculationResult {
  // 1. Enrich places with arrival time and open-at-arrival status
  const enrichedPlaces: Place[] = rawPlaces.map((p) => {
    const evalResult = evaluateEstablishmentArrival(p, routeCoords, departureTime, travelMode);
    return {
      ...p,
      distanceFromStartMeters: evalResult.distanceFromStart,
      distanceFromRouteMeters: evalResult.distanceFromRoute,
      estimatedArrivalTime: evalResult.estimatedArrivalTime,
      arrivalStatus: evalResult.arrivalStatus,
      openAtJourneyTime: evalResult.isOpenAtArrival,
    };
  });

  // Filter accessible establishments within 250m corridor of the route
  const corridorPlaces = enrichedPlaces.filter(
    (p) => (p.distanceFromRouteMeters ?? 0) <= 280,
  );

  const openCorridorPlaces = corridorPlaces.filter(
    (p) => p.openAtJourneyTime === true,
  );

  // 2. Divide route into 120–150m segments
  const totalDist = computeTotalDistanceMeters(routeCoords);
  const targetSegmentLen = 140; // metres
  const numSegments = Math.max(3, Math.ceil(totalDist / targetSegmentLen));
  const segmentLen = totalDist / numSegments;

  // Build heatmap segments
  const heatmapSegments: RouteHeatmapSegment[] = [];
  let currentSegStartCoordIdx = 0;
  let runningDist = 0;
  let currentSegDist = 0;

  for (let s = 0; s < numSegments; s++) {
    const segTargetEndDist = (s + 1) * segmentLen;
    let endCoordIdx = currentSegStartCoordIdx;

    while (endCoordIdx < routeCoords.length - 1 && runningDist < segTargetEndDist) {
      runningDist += distanceMeters(routeCoords[endCoordIdx], routeCoords[endCoordIdx + 1]);
      endCoordIdx++;
    }

    const segCoords = routeCoords.slice(currentSegStartCoordIdx, endCoordIdx + 1);
    if (segCoords.length === 0 && endCoordIdx < routeCoords.length) {
      segCoords.push(routeCoords[endCoordIdx]);
    }

    // Midpoint of segment
    const midCoord = segCoords[Math.floor(segCoords.length / 2)] || routeCoords[0];

    // Find open places near this segment (within 180m)
    const nearbyOpen = openCorridorPlaces.filter(
      (p) => distanceMeters(p.coordinate, midCoord) <= 180,
    );

    // Nearby help points
    const nearbyHelp = nearbyOpen.filter((p) =>
      ['police', 'hospital', 'pharmacy', 'help_point'].includes(p.category),
    );

    // Nearby verified street lighting and CCTV for this segment
    const nearbyLighting = corridorPlaces.filter(
      (p) =>
        p.category === 'streetlight' &&
        p.openAtJourneyTime !== false && // exclude known-dim zones
        distanceMeters(p.coordinate, midCoord) <= 160,
    );
    const nearbyCctv = corridorPlaces.filter(
      (p) => p.category === 'cctv' && distanceMeters(p.coordinate, midCoord) <= 160,
    );

    // Segment score (0–100) — evidence-based, not a blanket baseline
    let segScore = 0;
    segScore += Math.min(45, nearbyOpen.length * 15); // open establishments nearby
    segScore += Math.min(25, nearbyHelp.length * 15); // open help points nearby
    segScore += nearbyLighting.length > 0 ? 15 : 0; // verified lit zone
    segScore += nearbyCctv.length > 0 ? 10 : 0; // CCTV coverage
    segScore += nearbyOpen.length > 0 ? 5 : 0; // any activity at all

    segScore = Math.min(100, Math.max(10, Math.round(segScore)));

    // Color assignment
    let color: HeatmapColor = '#F87171';
    let isIsolated = false;

    if (segScore >= 75) {
      color = '#4ADE80'; // Green
    } else if (segScore >= 50) {
      color = '#FACC15'; // Yellow
    } else if (segScore >= 30) {
      color = '#FF9400'; // Orange
    } else {
      color = '#F87171'; // Red
      isIsolated = true;
    }

    heatmapSegments.push({
      startIndex: currentSegStartCoordIdx,
      endIndex: endCoordIdx,
      coordinates: segCoords.length > 1 ? segCoords : [segCoords[0], segCoords[0]],
      activityScore: segScore,
      color,
      nearbyOpenCount: nearbyOpen.length,
      isIsolated,
    });

    currentSegStartCoordIdx = Math.max(0, endCoordIdx - 1);
  }

  // 3. Compute Longest Quiet / Isolated Stretch
  let maxConsecutiveQuietSegments = 0;
  let currentQuietStreak = 0;

  for (const seg of heatmapSegments) {
    if (seg.nearbyOpenCount === 0 || seg.isIsolated) {
      currentQuietStreak++;
      if (currentQuietStreak > maxConsecutiveQuietSegments) {
        maxConsecutiveQuietSegments = currentQuietStreak;
      }
    } else {
      currentQuietStreak = 0;
    }
  }

  const longestQuietStretchMeters = Math.round(maxConsecutiveQuietSegments * segmentLen);

  // 4. Parameter 1: Open Shops & Establishments (Max 20)
  // Rewards useful distribution over concentrated clusters
  const commercialCategories: PlaceCategory[] = ['shop_food', 'petrol_station'];
  const openCommercial = openCorridorPlaces.filter((p) =>
    commercialCategories.includes(p.category),
  );

  // Distribution factor: percentage of segments that have at least 1 open establishment
  const activeSegments = heatmapSegments.filter((s) => s.nearbyOpenCount > 0).length;
  const distributionRatio = activeSegments / Math.max(1, heatmapSegments.length);
  const distributionScore = distributionRatio * (weights.openShops * 0.6); // 12 pts
  const volumeScore = Math.min(
    weights.openShops * 0.4,
    (openCommercial.length / 8) * (weights.openShops * 0.4),
  ); // 8 pts
  const openShopsScore = Math.round(
    Math.min(weights.openShops, distributionScore + volumeScore),
  );

  // 5. Parameter 2: Opening Hours & Time-Based Availability (Max 15)
  // Evaluates ratio of establishments open at arrival vs total mapped
  const totalMapped = corridorPlaces.length;
  const openCount = openCorridorPlaces.length;
  const availableRatio = totalMapped > 0 ? openCount / totalMapped : 0.65;
  const openingHoursScore = Math.round(
    Math.min(weights.openingHours, availableRatio * weights.openingHours),
  );

  // 6. Parameter 3: Pharmacy & 24/7 Essential Services (Max 10)
  const pharmacies = openCorridorPlaces.filter((p) => p.category === 'pharmacy');
  const twentyFourSeven = openCorridorPlaces.filter((p) => p.is24_7 === true);
  const petrolStations = openCorridorPlaces.filter((p) => p.category === 'petrol_station');

  let essentialRaw = 0;
  if (twentyFourSeven.length > 0) essentialRaw += 4;
  if (pharmacies.length > 0) essentialRaw += 3;
  if (petrolStations.length > 0) essentialRaw += 2;
  if (twentyFourSeven.length > 1 || pharmacies.length > 1) essentialRaw += 1;
  const essentialServicesScore = Math.round(
    Math.min(weights.essentialServices, essentialRaw),
  );

  // 7. Parameter 4: Activity Continuity & Isolation Gaps (Max 15)
  // Heavily penalizes long quiet stretches
  let continuityScore = weights.activityContinuity;
  if (longestQuietStretchMeters > 1200) {
    continuityScore = 0;
  } else if (longestQuietStretchMeters > 700) {
    continuityScore = Math.round(weights.activityContinuity * 0.25);
  } else if (longestQuietStretchMeters > 400) {
    continuityScore = Math.round(weights.activityContinuity * 0.5);
  } else if (longestQuietStretchMeters > 200) {
    continuityScore = Math.round(weights.activityContinuity * 0.75);
  } else if (longestQuietStretchMeters > 100) {
    continuityScore = Math.round(weights.activityContinuity * 0.9);
  }
  const activityContinuityScore = continuityScore;

  // 8. Parameter 5: Main-Road Accessibility (Max 10)
  // Prefer well-established roads over interior alley shortcuts.
  // Evidence proxy: verified lit zones + CCTV along the route are concentrated
  // on established thoroughfares, so their segment coverage estimates the
  // percentage of the route on lit, monitored main roads.
  const litSegments = heatmapSegments.filter(
    (s) =>
      corridorPlaces.some(
        (p) =>
          p.category === 'streetlight' &&
          p.openAtJourneyTime !== false &&
          distanceMeters(p.coordinate, s.coordinates[Math.floor(s.coordinates.length / 2)]) <= 160,
      ),
  );
  const cctvSegments = heatmapSegments.filter(
    (s) =>
      corridorPlaces.some(
        (p) =>
          p.category === 'cctv' &&
          distanceMeters(p.coordinate, s.coordinates[Math.floor(s.coordinates.length / 2)]) <= 160,
      ),
  );
  const monitoredSegmentRatio = Math.max(
    litSegments.length / Math.max(1, heatmapSegments.length),
    cctvSegments.length / Math.max(1, heatmapSegments.length),
  );
  const mainRoadPercentage = Math.round(
    Math.min(95, Math.max(25, monitoredSegmentRatio * 100)),
  );
  const mainRoadScore = Math.round(
    Math.min(
      weights.mainRoadAccessibility,
      (mainRoadPercentage / 100) * weights.mainRoadAccessibility,
    ),
  );

  // 9. Parameter 6: Nearby Help Points (Max 10)
  const policePlaces = openCorridorPlaces.filter((p) => p.category === 'police');
  const hospitalPlaces = openCorridorPlaces.filter((p) => p.category === 'hospital');
  let helpPointsRaw = 0;
  if (policePlaces.length > 0) helpPointsRaw += 5;
  if (hospitalPlaces.length > 0) helpPointsRaw += 5;
  if (policePlaces.length === 0 && hospitalPlaces.length === 0 && pharmacies.length > 0) {
    helpPointsRaw += 3;
  }
  const helpPointsScore = Math.round(
    Math.min(weights.helpPoints, helpPointsRaw),
  );

  // 10. Parameter 7: Street Lighting (Max 10)
  // Percentage of route segments with a verified lit zone within 160 m.
  // Only zones confirmed lit at journey time count; known-dim zones do not.
  const streetlightZones = corridorPlaces.filter(
    (p) => p.category === 'streetlight' && p.openAtJourneyTime !== false,
  );
  const litSegmentCount = heatmapSegments.filter((s) =>
    streetlightZones.some(
      (p) =>
        distanceMeters(
          p.coordinate,
          s.coordinates[Math.floor(s.coordinates.length / 2)],
        ) <= 160,
    ),
  ).length;
  const lightingCoveragePercentage = Math.round(
    Math.min(
      95,
      Math.max(
        0,
        (litSegmentCount / Math.max(1, heatmapSegments.length)) * 100,
      ),
    ),
  );
  const streetLightingScore = Math.round(
    Math.min(
      weights.streetLighting,
      (lightingCoveragePercentage / 100) * weights.streetLighting,
    ),
  );

  // 11. Parameter 8: CCTV Coverage (Max 5)
  // Percentage of route segments with CCTV within 160 m.
  const cctvNodes = corridorPlaces.filter((p) => p.category === 'cctv');
  const cctvSegmentCount = heatmapSegments.filter((s) =>
    cctvNodes.some(
      (p) =>
        distanceMeters(
          p.coordinate,
          s.coordinates[Math.floor(s.coordinates.length / 2)],
        ) <= 160,
    ),
  ).length;
  const cctvCoveragePercentage = Math.round(
    (cctvSegmentCount / Math.max(1, heatmapSegments.length)) * 100,
  );
  const cctvScore = Math.round(
    Math.min(weights.cctvCoverage, (cctvCoveragePercentage / 100) * weights.cctvCoverage),
  );

  // 12. Parameter 9: Public Transport (Max 5)
  // Percentage of route segments with transit access within 200 m.
  const transitPlaces = openCorridorPlaces.filter((p) => p.category === 'transport');
  const transitSegmentCount = heatmapSegments.filter((s) =>
    transitPlaces.some(
      (p) =>
        distanceMeters(
          p.coordinate,
          s.coordinates[Math.floor(s.coordinates.length / 2)],
        ) <= 200,
    ),
  ).length;
  const transitCoveragePercentage = Math.round(
    (transitSegmentCount / Math.max(1, heatmapSegments.length)) * 100,
  );
  const publicTransportScore = Math.round(
    Math.min(
      weights.publicTransport,
      (transitCoveragePercentage / 100) * weights.publicTransport,
    ),
  );

  // Total Score
  const total = Math.round(
    Math.min(
      100,
      Math.max(
        15,
        openShopsScore +
          openingHoursScore +
          essentialServicesScore +
          activityContinuityScore +
          mainRoadScore +
          helpPointsScore +
          streetLightingScore +
          cctvScore +
          publicTransportScore,
      ),
    ),
  );

  const breakdown: ScoreBreakdown = {
    openShopsScore,
    openingHoursScore,
    essentialServicesScore,
    activityContinuityScore,
    mainRoadScore,
    helpPointsScore,
    streetLightingScore,
    cctvScore,
    publicTransportScore,
    total,
  };

  // Route evidence phrase
  const quietText =
    longestQuietStretchMeters < 120
      ? `longest quiet stretch ${longestQuietStretchMeters} m`
      : `${longestQuietStretchMeters} m isolated stretch`;
  const routeEvidence = `${openCorridorPlaces.length} open places · ${quietText}`;

  return {
    score: total,
    breakdown,
    heatmapSegments,
    longestQuietStretchMeters,
    mainRoadPercentage,
    lightingCoveragePercentage: Math.round(lightingCoveragePercentage),
    routeEvidence,
    enrichedPlaces,
    counts: {
      openPlaces: openCorridorPlaces.length,
      closedPlaces: corridorPlaces.length - openCorridorPlaces.length,
      twentyFourSeven: twentyFourSeven.length,
      pharmacies: pharmacies.length,
      petrolPumps: petrolStations.length,
      police: policePlaces.length,
      hospitals: hospitalPlaces.length,
      publicTransport: transitPlaces.length,
      cctv: cctvNodes.length,
    },
  };
}
