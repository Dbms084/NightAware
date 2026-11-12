import type { Coordinate } from '@/types/geo';

export type TransitType = 'metro' | 'bus';
export type TransitSubType = 'metro' | 'bus_terminus' | 'bus_stop';

export type TransitStop = {
  id: string;
  name: string;
  type: TransitType;
  subType?: TransitSubType;
  coordinate: Coordinate;
  distanceMeters: number;
  walkingMinutes: number;
  openTime?: string;
  closeTime?: string;
  isOpenAtTime: boolean;
  statusText: string;
  badgeColor: string;
  lines?: string[];
  lastDepartureText?: string;
};

export type TransportAvailabilitySummary = {
  level: 'high' | 'moderate' | 'low';
  badgeLabel: string;
  badgeColor: string;
  headline: string;
  description: string;
  metroCount: number;
  busCount: number;
  openMetroCount?: number;
  openBusCount?: number;
  totalStops: number;
  nearestStop?: TransitStop;
  stops: TransitStop[];
  nightTransitAlert?: string;
};
