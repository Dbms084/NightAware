/**
 * Mock points of interest for Bengaluru · Indiranagar.
 *
 * Coordinates approximate real locations along Indiranagar streets
 * (100 Feet Road, CMH Road, 12th Main, HAL 2nd Stage).
 *
 * All entries use dataSource: 'mock'. openAtJourneyTime is a mix of
 * true / false / null to exercise all UI states.
 */

import type { Place } from '@/types/geo';

// ---------------------------------------------------------------------------
// Hospitals (3)
// ---------------------------------------------------------------------------

const hospitals: Place[] = [
  {
    id: 'hosp-1',
    name: 'Manipal Hospital – HAL Airport Road',
    coordinate: { latitude: 12.9592, longitude: 77.6480 },
    category: 'hospital',
    openAtJourneyTime: true,
    is24_7: true,
    dataSource: 'mock',
  },
  {
    id: 'hosp-2',
    name: 'Columbia Asia Hospital Domlur',
    coordinate: { latitude: 12.9631, longitude: 77.6375 },
    category: 'hospital',
    openAtJourneyTime: true,
    is24_7: true,
    dataSource: 'mock',
  },
  {
    id: 'hosp-3',
    name: 'Sakra World Hospital',
    coordinate: { latitude: 12.9560, longitude: 77.6490 },
    category: 'hospital',
    openAtJourneyTime: true,
    is24_7: true,
    dataSource: 'mock',
  },
];

// ---------------------------------------------------------------------------
// Pharmacies (6)
// ---------------------------------------------------------------------------

const pharmacies: Place[] = [
  {
    id: 'pharm-1',
    name: 'Apollo Pharmacy – CMH Road',
    coordinate: { latitude: 12.9748, longitude: 77.6400 },
    category: 'pharmacy',
    openAtJourneyTime: true,
    is24_7: true,
    openTime: '00:00',
    closeTime: '23:59',
    dataSource: 'mock',
  },
  {
    id: 'pharm-2',
    name: 'MedPlus – 100 Feet Road',
    coordinate: { latitude: 12.9714, longitude: 77.6408 },
    category: 'pharmacy',
    openAtJourneyTime: true,
    openTime: '08:00',
    closeTime: '23:00',
    dataSource: 'mock',
  },
  {
    id: 'pharm-3',
    name: 'Netmeds Store – 12th Main',
    coordinate: { latitude: 12.9700, longitude: 77.6385 },
    category: 'pharmacy',
    openAtJourneyTime: false,
    openTime: '09:00',
    closeTime: '21:00',
    dataSource: 'mock',
  },
  {
    id: 'pharm-4',
    name: 'Wellness Forever – Defence Colony',
    coordinate: { latitude: 12.9685, longitude: 77.6435 },
    category: 'pharmacy',
    openAtJourneyTime: null,
    openTime: '09:00',
    closeTime: '22:00',
    dataSource: 'mock',
  },
  {
    id: 'pharm-5',
    name: 'Sri Sai Medical – HAL 2nd Stage',
    coordinate: { latitude: 12.9660, longitude: 77.6460 },
    category: 'pharmacy',
    openAtJourneyTime: false,
    openTime: '09:00',
    closeTime: '21:00',
    dataSource: 'mock',
  },
  {
    id: 'pharm-6',
    name: 'HealthKart Pharmacy – Domlur',
    coordinate: { latitude: 12.9625, longitude: 77.6390 },
    category: 'pharmacy',
    openAtJourneyTime: true,
    openTime: '08:00',
    closeTime: '23:00',
    dataSource: 'mock',
  },
];

// ---------------------------------------------------------------------------
// Petrol stations (4)
// ---------------------------------------------------------------------------

const petrolStations: Place[] = [
  {
    id: 'petrol-1',
    name: 'HP Petrol Pump – 100 Feet Road',
    coordinate: { latitude: 12.9720, longitude: 77.6425 },
    category: 'petrol_station',
    openAtJourneyTime: true,
    is24_7: true,
    openTime: '00:00',
    closeTime: '23:59',
    dataSource: 'mock',
  },
  {
    id: 'petrol-2',
    name: 'Indian Oil – CMH Road Junction',
    coordinate: { latitude: 12.9755, longitude: 77.6410 },
    category: 'petrol_station',
    openAtJourneyTime: true,
    openTime: '06:00',
    closeTime: '22:00',
    dataSource: 'mock',
  },
  {
    id: 'petrol-3',
    name: 'Bharat Petroleum – Old Airport Road',
    coordinate: { latitude: 12.9640, longitude: 77.6475 },
    category: 'petrol_station',
    openAtJourneyTime: false,
    openTime: '06:00',
    closeTime: '22:00',
    dataSource: 'mock',
  },
  {
    id: 'petrol-4',
    name: 'Shell Fuel Station – Domlur Flyover',
    coordinate: { latitude: 12.9615, longitude: 77.6365 },
    category: 'petrol_station',
    openAtJourneyTime: null,
    openTime: '06:00',
    closeTime: '22:00',
    dataSource: 'mock',
  },
];

// ---------------------------------------------------------------------------
// Shops & food (10)
// ---------------------------------------------------------------------------

const shopFood: Place[] = [
  {
    id: 'shop-1',
    name: 'Toit Brewpub',
    coordinate: { latitude: 12.9784, longitude: 77.6408 },
    category: 'shop_food',
    openAtJourneyTime: true,
    openTime: '12:00',
    closeTime: '00:00',
    dataSource: 'mock',
  },
  {
    id: 'shop-2',
    name: 'Truffles – 100 Feet Road',
    coordinate: { latitude: 12.9718, longitude: 77.6413 },
    category: 'shop_food',
    openAtJourneyTime: true,
    openTime: '11:00',
    closeTime: '23:00',
    dataSource: 'mock',
  },
  {
    id: 'shop-3',
    name: 'Empire Restaurant – 12th Main',
    coordinate: { latitude: 12.9695, longitude: 77.6380 },
    category: 'shop_food',
    openAtJourneyTime: true,
    openTime: '11:00',
    closeTime: '22:30',
    dataSource: 'mock',
  },
  {
    id: 'shop-4',
    name: 'Big Bazaar – BDA Complex',
    coordinate: { latitude: 12.9730, longitude: 77.6395 },
    category: 'shop_food',
    openAtJourneyTime: false,
    openTime: '09:00',
    closeTime: '22:00',
    dataSource: 'mock',
  },
  {
    id: 'shop-5',
    name: 'Chai Point – Indiranagar Metro',
    coordinate: { latitude: 12.9780, longitude: 77.6400 },
    category: 'shop_food',
    openAtJourneyTime: true,
    openTime: '07:00',
    closeTime: '23:00',
    dataSource: 'mock',
  },
  {
    id: 'shop-6',
    name: 'Glen\'s Bakehouse',
    coordinate: { latitude: 12.9710, longitude: 77.6420 },
    category: 'shop_food',
    openAtJourneyTime: false,
    openTime: '08:00',
    closeTime: '21:00',
    dataSource: 'mock',
  },
  {
    id: 'shop-7',
    name: 'Spar Supermarket – Defence Colony',
    coordinate: { latitude: 12.9680, longitude: 77.6440 },
    category: 'shop_food',
    openAtJourneyTime: false,
    openTime: '08:00',
    closeTime: '22:30',
    dataSource: 'mock',
  },
  {
    id: 'shop-8',
    name: 'Corner House Ice Cream',
    coordinate: { latitude: 12.9745, longitude: 77.6392 },
    category: 'shop_food',
    openAtJourneyTime: true,
    openTime: '12:00',
    closeTime: '23:30',
    dataSource: 'mock',
  },
  {
    id: 'shop-9',
    name: 'Nagarjuna Restaurant',
    coordinate: { latitude: 12.9703, longitude: 77.6405 },
    category: 'shop_food',
    openAtJourneyTime: true,
    openTime: '11:00',
    closeTime: '23:00',
    dataSource: 'mock',
  },
  {
    id: 'shop-10',
    name: 'Reliance Fresh – HAL 2nd Stage',
    coordinate: { latitude: 12.9655, longitude: 77.6450 },
    category: 'shop_food',
    openAtJourneyTime: null,
    openTime: '08:00',
    closeTime: '22:00',
    dataSource: 'mock',
  },
];

// ---------------------------------------------------------------------------
// Transport stops (4)
// ---------------------------------------------------------------------------

const transport: Place[] = [
  {
    id: 'trans-1',
    name: 'Indiranagar Metro Station',
    coordinate: { latitude: 12.9779, longitude: 77.6408 },
    category: 'transport',
    openAtJourneyTime: true,
    openTime: '05:30',
    closeTime: '23:30',
    dataSource: 'mock',
  },
  {
    id: 'trans-2',
    name: 'BMTC Bus Stop – 100 Feet Road',
    coordinate: { latitude: 12.9725, longitude: 77.6415 },
    category: 'transport',
    openAtJourneyTime: true,
    openTime: '05:30',
    closeTime: '23:30',
    dataSource: 'mock',
  },
  {
    id: 'trans-3',
    name: 'Auto Stand – CMH Road',
    coordinate: { latitude: 12.9750, longitude: 77.6405 },
    category: 'transport',
    openAtJourneyTime: null,
    openTime: '05:30',
    closeTime: '23:30',
    dataSource: 'mock',
  },
  {
    id: 'trans-4',
    name: 'BMTC Bus Stop – Domlur',
    coordinate: { latitude: 12.9620, longitude: 77.6380 },
    category: 'transport',
    openAtJourneyTime: true,
    openTime: '05:30',
    closeTime: '23:30',
    dataSource: 'mock',
  },
];

// ---------------------------------------------------------------------------
// Help points / Police (5)
// ---------------------------------------------------------------------------

const helpPoints: Place[] = [
  {
    id: 'help-1',
    name: 'Indiranagar Police Station',
    coordinate: { latitude: 12.9735, longitude: 77.6388 },
    category: 'police',
    openAtJourneyTime: true,
    is24_7: true,
    openTime: '00:00',
    closeTime: '23:59',
    dataSource: 'mock',
  },
  {
    id: 'help-2',
    name: 'HAL Police Station',
    coordinate: { latitude: 12.9610, longitude: 77.6485 },
    category: 'police',
    openAtJourneyTime: true,
    is24_7: true,
    openTime: '00:00',
    closeTime: '23:59',
    dataSource: 'mock',
  },
  {
    id: 'help-3',
    name: 'Hoysala Patrol Point – 12th Main',
    coordinate: { latitude: 12.9690, longitude: 77.6395 },
    category: 'help_point',
    openAtJourneyTime: true,
    openTime: '20:00',
    closeTime: '06:00',
    dataSource: 'mock',
  },
  {
    id: 'help-4',
    name: 'Women\'s Help Desk – BDA Complex',
    coordinate: { latitude: 12.9728, longitude: 77.6400 },
    category: 'help_point',
    openAtJourneyTime: false,
    openTime: '09:00',
    closeTime: '18:00',
    dataSource: 'mock',
  },
  {
    id: 'help-5',
    name: 'Traffic Police Booth – CMH Road',
    coordinate: { latitude: 12.9760, longitude: 77.6415 },
    category: 'help_point',
    openAtJourneyTime: null,
    openTime: '20:00',
    closeTime: '06:00',
    dataSource: 'mock',
  },
];

// ---------------------------------------------------------------------------
// CCTV cameras (12)
// ---------------------------------------------------------------------------

const cctvCameras: Place[] = [
  {
    id: 'cctv-1',
    name: 'CCTV – Indiranagar Metro Exit A',
    coordinate: { latitude: 12.9778, longitude: 77.6406 },
    category: 'cctv',
    openAtJourneyTime: true,
    dataSource: 'mock',
  },
  {
    id: 'cctv-2',
    name: 'CCTV – 100 Feet Road / 12th Main Junction',
    coordinate: { latitude: 12.9716, longitude: 77.6412 },
    category: 'cctv',
    openAtJourneyTime: true,
    dataSource: 'mock',
  },
  {
    id: 'cctv-3',
    name: 'CCTV – CMH Road Signal',
    coordinate: { latitude: 12.9752, longitude: 77.6402 },
    category: 'cctv',
    openAtJourneyTime: true,
    dataSource: 'mock',
  },
  {
    id: 'cctv-4',
    name: 'CCTV – BDA Complex Gate',
    coordinate: { latitude: 12.9732, longitude: 77.6398 },
    category: 'cctv',
    openAtJourneyTime: true,
    dataSource: 'mock',
  },
  {
    id: 'cctv-5',
    name: 'CCTV – Defence Colony Circle',
    coordinate: { latitude: 12.9678, longitude: 77.6438 },
    category: 'cctv',
    openAtJourneyTime: null,
    dataSource: 'mock',
  },
  {
    id: 'cctv-6',
    name: 'CCTV – 12th Main / 6th Cross',
    coordinate: { latitude: 12.9698, longitude: 77.6388 },
    category: 'cctv',
    openAtJourneyTime: true,
    dataSource: 'mock',
  },
  {
    id: 'cctv-7',
    name: 'CCTV – HAL 2nd Stage Main Road',
    coordinate: { latitude: 12.9650, longitude: 77.6458 },
    category: 'cctv',
    openAtJourneyTime: true,
    dataSource: 'mock',
  },
  {
    id: 'cctv-8',
    name: 'CCTV – Domlur Flyover Entry',
    coordinate: { latitude: 12.9618, longitude: 77.6370 },
    category: 'cctv',
    openAtJourneyTime: null,
    dataSource: 'mock',
  },
  {
    id: 'cctv-9',
    name: 'CCTV – Indiranagar Police Station',
    coordinate: { latitude: 12.9736, longitude: 77.6390 },
    category: 'cctv',
    openAtJourneyTime: true,
    dataSource: 'mock',
  },
  {
    id: 'cctv-10',
    name: 'CCTV – Old Airport Road Junction',
    coordinate: { latitude: 12.9638, longitude: 77.6472 },
    category: 'cctv',
    openAtJourneyTime: true,
    dataSource: 'mock',
  },
  {
    id: 'cctv-11',
    name: 'CCTV – 80 Feet Road / ESI Hospital Road',
    coordinate: { latitude: 12.9770, longitude: 77.6430 },
    category: 'cctv',
    openAtJourneyTime: true,
    dataSource: 'mock',
  },
  {
    id: 'cctv-12',
    name: 'CCTV – Binnamangala 1st Stage',
    coordinate: { latitude: 12.9740, longitude: 77.6422 },
    category: 'cctv',
    openAtJourneyTime: null,
    dataSource: 'mock',
  },
];

// ---------------------------------------------------------------------------
// Street lights (15) - Verified lit zones along Indiranagar corridors
// ---------------------------------------------------------------------------

const streetLights: Place[] = [
  {
    id: 'light-1',
    name: 'Verified Lit Zone – 100 Feet Road (Metro to CMH Road)',
    coordinate: { latitude: 12.9770, longitude: 77.6410 },
    category: 'streetlight',
    openAtJourneyTime: true,
    is24_7: true,
    openTime: '00:00',
    closeTime: '23:59',
    dataSource: 'mock',
  },
  {
    id: 'light-2',
    name: 'Verified Lit Zone – 100 Feet Road (CMH Road to 12th Main)',
    coordinate: { latitude: 12.9720, longitude: 77.6415 },
    category: 'streetlight',
    openAtJourneyTime: true,
    is24_7: true,
    openTime: '00:00',
    closeTime: '23:59',
    dataSource: 'mock',
  },
  {
    id: 'light-3',
    name: 'Verified Lit Zone – CMH Road (100 Feet Road to BDA Complex)',
    coordinate: { latitude: 12.9750, longitude: 77.6400 },
    category: 'streetlight',
    openAtJourneyTime: true,
    is24_7: true,
    openTime: '00:00',
    closeTime: '23:59',
    dataSource: 'mock',
  },
  {
    id: 'light-4',
    name: 'Verified Lit Zone – BDA Complex Main Road',
    coordinate: { latitude: 12.9730, longitude: 77.6395 },
    category: 'streetlight',
    openAtJourneyTime: true,
    is24_7: true,
    openTime: '00:00',
    closeTime: '23:59',
    dataSource: 'mock',
  },
  {
    id: 'light-5',
    name: 'Verified Lit Zone – Defence Colony Circle',
    coordinate: { latitude: 12.9680, longitude: 77.6435 },
    category: 'streetlight',
    openAtJourneyTime: true,
    openTime: '18:00',
    closeTime: '06:00',
    dataSource: 'mock',
  },
  {
    id: 'light-6',
    name: 'Verified Lit Zone – 12th Main (100 Feet Road to 6th Cross)',
    coordinate: { latitude: 12.9700, longitude: 77.6390 },
    category: 'streetlight',
    openAtJourneyTime: true,
    openTime: '18:00',
    closeTime: '06:00',
    dataSource: 'mock',
  },
  {
    id: 'light-7',
    name: 'Verified Lit Zone – HAL 2nd Stage Main Road',
    coordinate: { latitude: 12.9655, longitude: 77.6455 },
    category: 'streetlight',
    openAtJourneyTime: true,
    openTime: '18:00',
    closeTime: '06:00',
    dataSource: 'mock',
  },
  {
    id: 'light-8',
    name: 'Verified Lit Zone – Domlur Flyover Approach',
    coordinate: { latitude: 12.9620, longitude: 77.6370 },
    category: 'streetlight',
    openAtJourneyTime: true,
    openTime: '18:00',
    closeTime: '06:00',
    dataSource: 'mock',
  },
  {
    id: 'light-9',
    name: 'Verified Lit Zone – Indiranagar Metro Station Exit Area',
    coordinate: { latitude: 12.9778, longitude: 77.6406 },
    category: 'streetlight',
    openAtJourneyTime: true,
    is24_7: true,
    openTime: '00:00',
    closeTime: '23:59',
    dataSource: 'mock',
  },
  {
    id: 'light-10',
    name: 'Verified Lit Zone – 80 Feet Road Junction',
    coordinate: { latitude: 12.9770, longitude: 77.6430 },
    category: 'streetlight',
    openAtJourneyTime: true,
    is24_7: true,
    openTime: '00:00',
    closeTime: '23:59',
    dataSource: 'mock',
  },
  {
    id: 'light-11',
    name: 'Verified Lit Zone – Old Airport Road (Binnamangala)',
    coordinate: { latitude: 12.9640, longitude: 77.6470 },
    category: 'streetlight',
    openAtJourneyTime: true,
    openTime: '18:00',
    closeTime: '06:00',
    dataSource: 'mock',
  },
  {
    id: 'light-12',
    name: 'Verified Lit Zone – ESI Hospital Road',
    coordinate: { latitude: 12.9772, longitude: 77.6428 },
    category: 'streetlight',
    openAtJourneyTime: true,
    is24_7: true,
    openTime: '00:00',
    closeTime: '23:59',
    dataSource: 'mock',
  },
  {
    id: 'light-13',
    name: 'Verified Lit Zone – 12th Main / 8th Cross',
    coordinate: { latitude: 12.9690, longitude: 77.6385 },
    category: 'streetlight',
    openAtJourneyTime: false,
    openTime: '18:00',
    closeTime: '06:00',
    dataSource: 'mock',
  },
  {
    id: 'light-14',
    name: 'Verified Lit Zone – CMH Road (BDA to Defence Colony)',
    coordinate: { latitude: 12.9740, longitude: 77.6405 },
    category: 'streetlight',
    openAtJourneyTime: true,
    is24_7: true,
    openTime: '00:00',
    closeTime: '23:59',
    dataSource: 'mock',
  },
  {
    id: 'light-15',
    name: 'Verified Lit Zone – HAL 2nd Stage 1st Main',
    coordinate: { latitude: 12.9665, longitude: 77.6445 },
    category: 'streetlight',
    openAtJourneyTime: null,
    openTime: '18:00',
    closeTime: '06:00',
    dataSource: 'mock',
  },
];

// ---------------------------------------------------------------------------
// Aggregated export
// ---------------------------------------------------------------------------

/** All mock places, grouped by category. */
export const MOCK_PLACES_BY_CATEGORY = {
  hospital: hospitals,
  pharmacy: pharmacies,
  petrol_station: petrolStations,
  shop_food: shopFood,
  transport,
  help_point: helpPoints.filter((p) => p.category === 'help_point'),
  police: helpPoints.filter((p) => p.category === 'police'),
  cctv: cctvCameras,
  streetlight: streetLights,
} as const;

/** All mock places as a flat array. */
export const MOCK_PLACES: Place[] = [
  ...hospitals,
  ...pharmacies,
  ...petrolStations,
  ...shopFood,
  ...transport,
  ...helpPoints,
  ...cctvCameras,
  ...streetLights,
];

/** Demo origin — Indiranagar Metro Station Exit A. */
export const DEMO_ORIGIN = { latitude: 12.9779, longitude: 77.6408 };

/** Demo destination — 12th Main Road residential area. */
export const DEMO_DESTINATION = { latitude: 12.9650, longitude: 77.6450 };

