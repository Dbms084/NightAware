import type { Route } from '@rnmapbox/navigation';

export type Coordinate = [longitude: number, latitude: number];

export type PlaceSelection = {
  id: string;
  label: string;
  coordinate: Coordinate;
};

export type RouteOption = {
  id: string;
  label: string;
  route: Route;
  shopCount: number | null;
  shopsBySegment: number[] | null;
  nightActivityScore: number | null;
  shopDataCapped: boolean;
};
