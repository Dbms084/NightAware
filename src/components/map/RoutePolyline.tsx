/**
 * RoutePolyline — renders a route path on the map.
 *
 * Supports selected/unselected states, dashed lines for alternate routes,
 * and tappable interaction for route comparison.
 */

import { Polyline } from 'react-native-maps';

import type { Coordinate } from '@/types/geo';

// ---------------------------------------------------------------------------
// Data type for passing polylines to the map
// ---------------------------------------------------------------------------

export type PolylineData = {
  id: string;
  coordinates: Coordinate[];
  color: string;
  selected?: boolean;
  strokeWidth?: number;
  dashed?: boolean;
};

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Default stroke widths. */
const STROKE_SELECTED = 5;
const STROKE_UNSELECTED = 3;

/** Opacity for unselected routes. */
const UNSELECTED_OPACITY = 0.45;

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export type RoutePolylineProps = {
  /** Ordered waypoints defining the route path. */
  coordinates: Coordinate[];
  /** Line colour (hex string). */
  color: string;
  /** Whether this route is currently selected / highlighted. */
  selected?: boolean;
  /** Override stroke width. */
  strokeWidth?: number;
  /** Draw a dashed line instead of solid. */
  dashed?: boolean;
  /** Called when the user taps this polyline. */
  onPress?: () => void;
  /** Unique key for React reconciliation (also used for z-index). */
  zIndex?: number;
};

export function RoutePolyline({
  coordinates,
  color,
  selected = false,
  strokeWidth,
  dashed = false,
  onPress,
  zIndex,
}: RoutePolylineProps) {
  if (coordinates.length < 2) return null;

  const width = strokeWidth ?? (selected ? STROKE_SELECTED : STROKE_UNSELECTED);

  // Apply transparency to unselected routes via rgba.
  const strokeColor = selected ? color : applyOpacity(color, UNSELECTED_OPACITY);

  return (
    <>
      {/* Wider invisible tap target behind the visible line */}
      {onPress && (
        <Polyline
          coordinates={coordinates}
          strokeColor="transparent"
          strokeWidth={width + 20}
          tappable
          onPress={onPress}
          zIndex={(zIndex ?? 0) + 1}
        />
      )}
      {/* Visible route line */}
      <Polyline
        coordinates={coordinates}
        strokeColor={strokeColor}
        strokeWidth={width}
        lineCap="round"
        lineJoin="round"
        lineDashPattern={dashed ? [12, 8] : undefined}
        tappable={!!onPress}
        onPress={onPress}
        zIndex={zIndex ?? (selected ? 10 : 1)}
      />
    </>
  );
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Apply alpha to a hex colour string.
 * E.g. applyOpacity('#ff9400', 0.5) → 'rgba(255,148,0,0.5)'
 */
function applyOpacity(hex: string, opacity: number): string {
  const clean = hex.replace('#', '');
  const r = parseInt(clean.substring(0, 2), 16);
  const g = parseInt(clean.substring(2, 4), 16);
  const b = parseInt(clean.substring(4, 6), 16);
  return `rgba(${r},${g},${b},${opacity})`;
}

