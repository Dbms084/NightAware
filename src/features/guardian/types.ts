import type { Coordinate } from '@/types/geo';

export interface TrustedContact {
  id: string;
  name: string;
  phone: string;
  relationship: string;
  notifyOnStart: boolean;
  notifyOnArrival: boolean;
  isPrimarySos: boolean;
}

export interface WatchOverMeJourneyDetails {
  routeId: string;
  routeLabel: string;
  profileType: 'safest' | 'balanced' | 'fastest';
  durationMinutes: number;
  distanceMeters: number;
  nightActivityScore: number;
  openPlacesCount: number;
  originName: string;
  destinationName: string;
  originCoord: Coordinate;
  destinationCoord: Coordinate;
  departureTime: Date;
  estimatedArrivalTime: Date;
  longestQuietStretchMeters?: number;
}

export interface GuardianSessionState {
  isActive: boolean;
  startTime: number | null;
  selectedRouteId: string | null;
  destinationName: string;
  contactsAlertedCount: number;
  lastKnownCoord: Coordinate | null;
  status: 'monitoring' | 'deviated' | 'stopped' | 'arrived' | 'sos';
}
