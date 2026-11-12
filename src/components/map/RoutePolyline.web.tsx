import React from 'react';
import { useMapWeb } from './map-context.web';
import type { Coordinate, RouteHeatmapSegment } from '@/types/geo';

export type PolylineData = {
  id: string;
  coordinates: Coordinate[];
  color: string;
  selected?: boolean;
  strokeWidth?: number;
  dashed?: boolean;
};

export type RoutePolylineProps = {
  id?: string;
  coordinates: Coordinate[];
  color: string;
  selected?: boolean;
  strokeWidth?: number;
  dashed?: boolean;
  heatmapSegments?: RouteHeatmapSegment[];
  showHeatmap?: boolean;
  onPress?: () => void;
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
  const mapWeb = useMapWeb();

  if (!mapWeb || coordinates.length < 2) return null;

  const { project, width, height } = mapWeb;
  const stroke = strokeWidth ?? (selected ? 5 : 3);

  const toSvgPoints = (coords: Coordinate[]) => {
    return coords
      .map((c) => {
        const p = project(c);
        const px = (p.x * width) / 100;
        const py = (p.y * height) / 100;
        return `${px.toFixed(1)},${py.toFixed(1)}`;
      })
      .join(' ');
  };

  const mainPoints = toSvgPoints(coordinates);

  return (
    <svg
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        pointerEvents: onPress ? 'auto' : 'none',
        zIndex,
        overflow: 'visible',
      }}
      onClick={onPress}
    >
      {/* Background shadow halo for selected route */}
      {selected && (
        <polyline
          points={mainPoints}
          fill="none"
          stroke="rgba(8, 10, 14, 0.9)"
          strokeWidth={stroke + 6}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      )}

      {/* Heatmap mode if active */}
      {selected && showHeatmap && heatmapSegments && heatmapSegments.length > 0 ? (
        heatmapSegments.map((segment, idx) => (
          <polyline
            key={`seg-${idx}`}
            points={toSvgPoints(segment.coordinates)}
            fill="none"
            stroke={segment.color}
            strokeWidth={stroke}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        ))
      ) : (
        /* Regular colored route polyline */
        <polyline
          points={mainPoints}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeDasharray={dashed ? '6,6' : undefined}
          strokeLinecap="round"
          strokeLinejoin="round"
          opacity={selected ? 1 : 0.65}
          style={{
            cursor: onPress ? 'pointer' : 'default',
            transition: 'stroke-width 0.2s ease, opacity 0.2s ease',
          }}
        />
      )}
    </svg>
  );
}
