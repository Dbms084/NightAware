import React from 'react';
import { View, StyleSheet } from 'react-native';
import { useMapWeb } from './map-context.web';
import type { SafetyZone } from '@/types/geo';
import { RISK_LEVEL_COLORS } from '@/types/geo';

export type SafetyOverlayProps = {
  zones: SafetyZone[];
};

export function SafetyOverlay({ zones }: SafetyOverlayProps) {
  const mapWeb = useMapWeb();
  if (!mapWeb || !zones || !zones.length) return null;

  const { project } = mapWeb;

  return (
    <>
      {zones.map((zone) => {
        const { x, y } = project(zone.coordinate);
        const color = RISK_LEVEL_COLORS[zone.riskLevel] || '#22c55e';

        return (
          <View
            key={zone.id}
            style={[
              styles.zoneCircle,
              {
                left: `${x}%`,
                top: `${y}%`,
                borderColor: color,
                backgroundColor: color,
              },
            ]}
          />
        );
      })}
    </>
  );
}

const styles = StyleSheet.create({
  zoneCircle: {
    position: 'absolute',
    width: 60,
    height: 60,
    marginLeft: -30,
    marginTop: -30,
    borderRadius: 30,
    borderWidth: 1.5,
    opacity: 0.15,
    pointerEvents: 'none',
  },
});
