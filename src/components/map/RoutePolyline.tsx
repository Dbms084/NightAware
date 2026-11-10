/**
 * RoutePolyline — Renders route paths on the map.
 *
 * Supports:
 * - Selected / unselected states with glowing halos
 * - Segment-by-segment activity heatmap visualization (Green, Yellow, Orange, Red)
 * - Tappable interaction for switching routes
 */

import { Polyline } from 'react-native-maps';
import type { Coordinate, RouteHeatmapSegment } from '@/types/geo';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function applyOpacity(hex: string, opacity: number): string {
  const cleanHex = hex.replace('#', '');
  if (cleanHex.length !== 6) return hex;
  const r = parseInt(cleanHex.substring(0, 2), 16);
  const g = parseInt(cleanHex.substring(2, 4), 16);
  const b = parseInt(cleanHex.substring(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${opacity})`;
}

// ---------------------------------------------------------------------------
// Props & Types
// ---------------------------------------------------------------------------

export type PolylineData = {
  id: string;
  coordinates: Coordinate[];
  color: string;
  selected?: boolean;
  strokeWidth?: number;
  dashed?: boolean;
};

export type RoutePolylineProps = {
  /** Route ID */
  id?: string;
  /** Ordered waypoints */
  coordinates: Coordinate[];
  /** Primary profile color (e.g. #ff8a00, #38bdf8, #f87171) */
  color: string;
  /** Whether selected */
  selected?: boolean;
  /** Stroke width */
  strokeWidth?: number;
  /** Dashed pattern */
  dashed?: boolean;
  /** Optional segment heatmap data (green/yellow/orange/red) */
  heatmapSegments?: RouteHeatmapSegment[];
  /** Whether heatmap mode is active */
  showHeatmap?: boolean;
  /** Polyline tap callback */
  onPress?: () => void;
  /** Z-index */
  zIndex?: number;
};

export function RoutePolyline({
  coordinates,
  color,
  selected = false,
  strokeWidth,
  dashed = false,
  heatmapSegments,
  showHeatmap = false,
  onPress,
  zIndex = 1,
}: RoutePolylineProps) {
  if (coordinates.length < 2) return null;

  const width = strokeWidth ?? (selected ? 6 : 3.5);

  // If heatmap mode is active and heatmap segments are available for selected route
  if (selected && showHeatmap && heatmapSegments && heatmapSegments.length > 0) {
    return (
      <>
        {/* Subtle dark backdrop halo */}
        <Polyline
          coordinates={coordinates}
          strokeColor="rgba(8, 10, 12, 0.85)"
          strokeWidth={width + 4}
          zIndex={zIndex}
        />
        {/* Colored activity segments */}
        {heatmapSegments.map((segment, idx) => (
          <Polyline
            key={`heat-${idx}-${segment.coordinates.length}`}
            coordinates={segment.coordinates}
            strokeColor={segment.color}
            strokeWidth={width}
            zIndex={zIndex + 1}
          />
        ))}
        {/* Tap target */}
        {onPress && (
          <Polyline
            coordinates={coordinates}
            strokeColor="transparent"
            strokeWidth={width + 24}
            tappable
            onPress={onPress}
            zIndex={zIndex + 2}
          />
        )}
      </>
    );
  }

  // Standard route rendering with halo when selected
  return (
    <>
      {/* Outer glow/halo for selected route */}
      {selected && (
        <Polyline
          coordinates={coordinates}
          strokeColor={applyOpacity(color, 0.28)}
          strokeWidth={width + 7}
          zIndex={zIndex}
        />
      )}

      {/* Tappable interaction surface */}
      {onPress && (
        <Polyline
          coordinates={coordinates}
          strokeColor="transparent"
          strokeWidth={width + 24}
          tappable
          onPress={onPress}
          zIndex={zIndex + 2}
        />
      )}

      {/* Main route polyline */}
      <Polyline
        coordinates={coordinates}
        strokeColor={selected ? color : applyOpacity(color, 0.45)}
        strokeWidth={width}
        lineDashPattern={dashed ? [8, 6] : undefined}
        zIndex={zIndex + 1}
      />
    </>
  );
}
