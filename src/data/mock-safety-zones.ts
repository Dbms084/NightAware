/**
 * Mock safety/activity zones for Bengaluru · Indiranagar.
 *
 * Zones represent areas of varying nighttime activity levels:
 * - low risk  (green)  = high activity — markets, metro, busy roads
 * - medium    (yellow) = moderate activity
 * - high risk (red)    = low activity — quiet residential lanes
 *
 * All marked isMock: true.
 */

import type { SafetyZone } from '@/types/geo';

export const MOCK_SAFETY_ZONES: SafetyZone[] = [
  // -----------------------------------------------------------------------
  // High-activity zones (low risk) — 3
  // -----------------------------------------------------------------------
  {
    id: 'zone-1',
    coordinate: { latitude: 12.9779, longitude: 77.6408 },
    radiusMeters: 200,
    riskLevel: 'low',
    reason: 'Indiranagar Metro station area — high foot traffic, CCTV coverage, well-lit.',
    isMock: true,
  },
  {
    id: 'zone-2',
    coordinate: { latitude: 12.9716, longitude: 77.6412 },
    radiusMeters: 250,
    riskLevel: 'low',
    reason: '100 Feet Road commercial zone — restaurants, shops, and street lighting active late.',
    isMock: true,
  },
  {
    id: 'zone-3',
    coordinate: { latitude: 12.9750, longitude: 77.6405 },
    radiusMeters: 180,
    riskLevel: 'low',
    reason: 'CMH Road junction — busy intersection with police booth and CCTV.',
    isMock: true,
  },

  // -----------------------------------------------------------------------
  // Moderate-activity zones (medium risk) — 3
  // -----------------------------------------------------------------------
  {
    id: 'zone-4',
    coordinate: { latitude: 12.9730, longitude: 77.6395 },
    radiusMeters: 180,
    riskLevel: 'medium',
    reason: 'BDA Complex area — some shops close by 21:00, moderate foot traffic.',
    isMock: true,
  },
  {
    id: 'zone-5',
    coordinate: { latitude: 12.9680, longitude: 77.6440 },
    radiusMeters: 200,
    riskLevel: 'medium',
    reason: 'Defence Colony — residential with a few open shops, moderate CCTV.',
    isMock: true,
  },
  {
    id: 'zone-6',
    coordinate: { latitude: 12.9660, longitude: 77.6458 },
    radiusMeters: 170,
    riskLevel: 'medium',
    reason: 'HAL 2nd Stage main road — some activity from petrol pump and late shops.',
    isMock: true,
  },

  // -----------------------------------------------------------------------
  // Low-activity zones (high risk) — 2
  // -----------------------------------------------------------------------
  {
    id: 'zone-7',
    coordinate: { latitude: 12.9700, longitude: 77.6443 },
    radiusMeters: 220,
    riskLevel: 'high',
    reason: 'Residential lanes between 12th Main and HAL 2nd Stage — poor lighting, no open shops after 22:00.',
    isMock: true,
  },
  {
    id: 'zone-8',
    coordinate: { latitude: 12.9738, longitude: 77.6432 },
    radiusMeters: 160,
    riskLevel: 'high',
    reason: 'Quiet 1st Stage cross-streets — narrow lanes, no CCTV, very few pedestrians at night.',
    isMock: true,
  },
];

