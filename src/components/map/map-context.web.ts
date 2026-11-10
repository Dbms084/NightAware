import { createContext, useContext } from 'react';
import type { Coordinate } from '@/types/geo';

export type MapWebContextType = {
  project: (coord: Coordinate) => { x: number; y: number }; // percentage 0..100
  width: number;
  height: number;
  onMarkerPress?: (markerId: string) => void;
};

export const MapWebContext = createContext<MapWebContextType | null>(null);

export function useMapWeb() {
  return useContext(MapWebContext);
}
