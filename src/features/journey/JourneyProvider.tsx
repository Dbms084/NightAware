import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type PropsWithChildren } from 'react';
import type { PlaceSelection, RouteOption } from './types';

type TravelMode = 'driving' | 'walking';
type JourneyContextValue = {
  origin: PlaceSelection | null;
  destination: PlaceSelection | null;
  mode: TravelMode;
  routes: RouteOption[];
  poiError: string | null;
  attribution: string;
  selectedRouteId: string;
  setJourney: (origin: PlaceSelection, destination: PlaceSelection, mode: TravelMode) => void;
  setRoutes: (routes: RouteOption[], poiError: string | null, attribution: string) => void;
  setSelectedRouteId: (id: string) => void;
  clearRoutes: () => void;
};

const JourneyContext = createContext<JourneyContextValue | null>(null);

export function JourneyProvider({ children }: PropsWithChildren) {
  const routesRef = useRef<RouteOption[]>([]);
  const [origin, setOrigin] = useState<PlaceSelection | null>(null);
  const [destination, setDestination] = useState<PlaceSelection | null>(null);
  const [mode, setMode] = useState<TravelMode>('walking');
  const [routes, setRouteOptions] = useState<RouteOption[]>([]);
  const [poiError, setPoiError] = useState<string | null>(null);
  const [attribution, setAttribution] = useState('© Mapbox');
  const [selectedRouteId, setSelectedRouteId] = useState('');

  const setJourney = useCallback((nextOrigin: PlaceSelection, nextDestination: PlaceSelection, nextMode: TravelMode) => {
    setOrigin(nextOrigin);
    setDestination(nextDestination);
    setMode(nextMode);
    setSelectedRouteId('');
  }, []);
  const setRoutes = useCallback((nextRoutes: RouteOption[], nextPoiError: string | null, nextAttribution: string) => {
    routesRef.current.forEach((route) => route.route.release());
    routesRef.current = nextRoutes;
    setRouteOptions(nextRoutes);
    setPoiError(nextPoiError);
    setAttribution(nextAttribution);
    setSelectedRouteId(nextRoutes[0]?.id ?? '');
  }, []);
  const clearRoutes = useCallback(() => {
    routesRef.current.forEach((route) => route.route.release());
    routesRef.current = [];
    setRouteOptions([]);
    setPoiError(null);
    setSelectedRouteId('');
  }, []);

  useEffect(() => () => {
    routesRef.current.forEach((route) => route.route.release());
  }, []);

  const value = useMemo<JourneyContextValue>(() => ({
    origin,
    destination,
    mode,
    routes,
    poiError,
    attribution,
    selectedRouteId,
    setJourney,
    setRoutes,
    setSelectedRouteId,
    clearRoutes,
  }), [attribution, clearRoutes, destination, mode, origin, poiError, routes, selectedRouteId, setJourney, setRoutes]);

  return <JourneyContext.Provider value={value}>{children}</JourneyContext.Provider>;
}

export function useJourney() {
  const context = useContext(JourneyContext);
  if (!context) throw new Error('useJourney must be used inside JourneyProvider.');
  return context;
}
