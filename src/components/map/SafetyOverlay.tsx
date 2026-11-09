/**
 * SafetyOverlay — renders translucent coloured circles on the map
 * to indicate safety/activity zones.
 *
 * Green  = higher activity / more facilities (low risk)
 * Yellow = moderate activity
 * Red    = lower activity / fewer facilities (high risk)
 *
 * Opacity is kept low so the underlying map remains visible.
 */

import { Circle } from 'react-native-maps';

import type { SafetyZone } from '@/types/geo';
import { RISK_LEVEL_COLORS } from '@/types/geo';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Fill opacity — low enough to see roads and labels underneath. */
const FILL_OPACITY = 0.12;

/** Stroke opacity — slightly more visible ring around the zone. */
const STROKE_OPACITY = 0.30;

/** Stroke width for the zone border. */
const STROKE_WIDTH = 1.5;

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export type SafetyOverlayProps = {
  /** Safety zones to render on the map. */
  zones: SafetyZone[];
};

export function SafetyOverlay({ zones }: SafetyOverlayProps) {
  if (!zones.length) return null;

  return (
    <>
      {zones.map((zone) => {
        const color = RISK_LEVEL_COLORS[zone.riskLevel];
        return (
          <Circle
            key={zone.id}
            center={zone.coordinate}
            radius={zone.radiusMeters}
            fillColor={applyOpacity(color, FILL_OPACITY)}
            strokeColor={applyOpacity(color, STROKE_OPACITY)}
            strokeWidth={STROKE_WIDTH}
            zIndex={0}
          />
        );
      })}
    </>
  );
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function applyOpacity(hex: string, opacity: number): string {
  const clean = hex.replace('#', '');
  const r = parseInt(clean.substring(0, 2), 16);
  const g = parseInt(clean.substring(2, 4), 16);
  const b = parseInt(clean.substring(4, 6), 16);
  return `rgba(${r},${g},${b},${opacity})`;
}

