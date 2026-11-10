import { useEffect, useRef, useState, useCallback } from 'react';
import * as Location from 'expo-location';
import type { Coordinate, RouteOption } from '@/types/geo';
import type { TrustedContact } from '../types';
import {
  computeHaversineDistanceMeters,
  isUserAtDestination,
  isUserOffRoute,
} from '../services/geofence-utils';
import { isBatteryCritical } from '../services/battery-service';
import type { AlertType } from '@/components/guardian/SafetyCheckInModal';

interface UseGuardianTrackerProps {
  isGuardianActive: boolean;
  route: RouteOption | null;
  destinationCoord: Coordinate;
  destinationName: string;
  primaryContact?: TrustedContact;
}

export function useGuardianTracker({
  isGuardianActive,
  route,
  destinationCoord,
  destinationName,
  primaryContact,
}: UseGuardianTrackerProps) {
  const [currentCoord, setCurrentCoord] = useState<Coordinate | null>(null);
  const [deviationMeters, setDeviationMeters] = useState(0);
  const [isOffCorridor, setIsOffCorridor] = useState(false);
  const [isArrived, setIsArrived] = useState(false);
  const [activeAlert, setActiveAlert] = useState<AlertType | null>(null);
  const [stoppedDurationMinutes, setStoppedDurationMinutes] = useState(0);

  // References to track movement over time
  const lastCoordRef = useRef<Coordinate | null>(null);
  const lastMoveTimeRef = useRef<number>(Date.now());
  const batteryCheckedRef = useRef<boolean>(false);
  const dismissedAlertsRef = useRef<{ [key: string]: number }>({});
  const activeAlertRef = useRef<AlertType | null>(activeAlert);

  useEffect(() => {
    activeAlertRef.current = activeAlert;
  }, [activeAlert]);

  // Reset state when guardian session starts or ends
  useEffect(() => {
    if (!isGuardianActive) {
      setCurrentCoord(null);
      setDeviationMeters(0);
      setIsOffCorridor(false);
      setIsArrived(false);
      setActiveAlert(null);
      lastCoordRef.current = null;
      lastMoveTimeRef.current = Date.now();
      batteryCheckedRef.current = false;
      dismissedAlertsRef.current = {};
    }
  }, [isGuardianActive]);

  // Periodic battery check
  useEffect(() => {
    if (!isGuardianActive) return;

    const checkBattery = async () => {
      if (batteryCheckedRef.current) return;
      const critical = await isBatteryCritical(0.15);
      if (critical) {
        batteryCheckedRef.current = true;
        setActiveAlert('battery');
      }
    };

    void checkBattery();
    const interval = setInterval(checkBattery, 60000);
    return () => clearInterval(interval);
  }, [isGuardianActive]);

  // Stoppage watchdog timer
  useEffect(() => {
    if (!isGuardianActive || !route) return;

    const stoppageChecker = setInterval(() => {
      // Only monitor stoppage if route contains quiet stretches (>300m)
      const hasQuietStretch = (route.longestQuietStretchMeters || 0) > 300;
      if (!hasQuietStretch) return;

      const elapsedMs = Date.now() - lastMoveTimeRef.current;
      const elapsedMins = Math.floor(elapsedMs / 60000);
      setStoppedDurationMinutes(elapsedMins);

      // Trigger stoppage check-in if motionless for >= 4 minutes
      if (elapsedMins >= 4) {
        const lastDismissed = dismissedAlertsRef.current['stoppage'] || 0;
        if (Date.now() - lastDismissed > 300000) {
          // Alert every 5 mins if still stopped
          setActiveAlert('stoppage');
        }
      }
    }, 15000);

    return () => clearInterval(stoppageChecker);
  }, [isGuardianActive, route]);

  // Foreground GPS Watcher
  useEffect(() => {
    if (!isGuardianActive || !route || !route.coordinates || route.coordinates.length === 0) {
      return;
    }

    let isMounted = true;
    let subscription: Location.LocationSubscription | null = null;

    const startWatching = async () => {
      try {
        const { status } = await Location.getForegroundPermissionsAsync();
        if (status !== 'granted') {
          const req = await Location.requestForegroundPermissionsAsync();
          if (req.status !== 'granted') return;
        }

        subscription = await Location.watchPositionAsync(
          {
            accuracy: Location.Accuracy.High,
            timeInterval: 4000,
            distanceInterval: 10,
          },
          (loc) => {
            if (!isMounted) return;
            const newCoord: Coordinate = {
              latitude: loc.coords.latitude,
              longitude: loc.coords.longitude,
            };
            setCurrentCoord(newCoord);

            // 1. Check Arrival Geofence (<= 50 meters)
            const reached = isUserAtDestination(newCoord, destinationCoord, 50);
            if (reached) {
              setIsArrived(true);
            }

            // 2. Check Corridor Deviation (> 200 meters)
            const offCheck = isUserOffRoute(newCoord, route.coordinates, 200);
            setDeviationMeters(offCheck.distanceMeters);
            setIsOffCorridor(offCheck.isOff);

            if (offCheck.isOff) {
              const lastDismissed = dismissedAlertsRef.current['deviation'] || 0;
              // Re-alert if deviated for > 2 mins after last dismiss
              if (Date.now() - lastDismissed > 120000) {
                setActiveAlert('deviation');
              }
            }

            // 3. Check Movement vs Stationary
            if (lastCoordRef.current) {
              const movedMeters = computeHaversineDistanceMeters(lastCoordRef.current, newCoord);
              if (movedMeters >= 15) {
                // User moved: reset stationary clock
                lastMoveTimeRef.current = Date.now();
                lastCoordRef.current = newCoord;
                if (activeAlertRef.current === 'stoppage') {
                  setActiveAlert(null);
                }
              }
            } else {
              lastCoordRef.current = newCoord;
              lastMoveTimeRef.current = Date.now();
            }
          },
        );
      } catch (err) {
        console.warn('[useGuardianTracker] Watcher error:', err);
      }
    };

    void startWatching();

    return () => {
      isMounted = false;
      if (subscription) {
        subscription.remove();
      }
    };
  }, [isGuardianActive, route, destinationCoord]);

  const acknowledgeAlert = useCallback(() => {
    const currentAlert = activeAlertRef.current;
    if (currentAlert) {
      dismissedAlertsRef.current[currentAlert] = Date.now();
    }
    setActiveAlert(null);
    lastMoveTimeRef.current = Date.now();
  }, []);

  // Demo & Presentation Simulation Helpers
  const simulateDeviation = useCallback((meters: number = 240) => {
    setDeviationMeters(meters);
    setIsOffCorridor(true);
    setActiveAlert('deviation');
  }, []);

  const simulateStoppage = useCallback((mins: number = 5) => {
    setStoppedDurationMinutes(mins);
    setActiveAlert('stoppage');
  }, []);

  const simulateArrival = useCallback(() => {
    setIsArrived(true);
    setIsOffCorridor(false);
    setActiveAlert(null);
  }, []);

  const simulateBatteryLow = useCallback(() => {
    setActiveAlert('battery');
  }, []);

  return {
    currentCoord,
    deviationMeters,
    isOffCorridor,
    isArrived,
    activeAlert,
    stoppedDurationMinutes,
    acknowledgeAlert,
    setActiveAlert,
    simulateDeviation,
    simulateStoppage,
    simulateArrival,
    simulateBatteryLow,
  };
}
