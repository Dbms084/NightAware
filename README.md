# NightAware — Night Activity Score & Intelligent Safe Route Recommendation Engine

**NightAware** is an intelligent, safety-aware navigation system designed to help women make informed travel decisions, particularly after dark. Unlike conventional navigation apps that optimize solely for the shortest distance or fastest travel time, NightAware evaluates multiple real-world street corridors, calculates a **9-parameter Night Activity Score (0–100)**, and recommends routes with the strongest continuous human activity, open establishments, and emergency assistance access.

> **Important Safety Note:** Night Activity Scores reflect mapped safety-supporting indicators (open commercial stores, 24/7 pharmacies, street lighting, emergency facilities, and continuous road activity) as an activity proxy, not a statistical guarantee of personal safety.

---

## 🌟 Key Features & What Has Been Implemented

### 1. Three Route Profiles Rendered Simultaneously
Whenever you enter a start and destination, NightAware calculates and displays three distinct candidate routes:
- **Safest-Profile Route (`#FF8A00` Orange):** Prioritizes higher Night Activity Scores, continuous open establishments, verified 24/7 services, police stations, and major thoroughfares. Accepts sensible minor detours (+minutes) for significantly higher safety indicators.
- **Balanced Route (`#38BDF8` Cyan):** Balances travel time with activity continuity, avoiding long dark alleys while keeping travel times practical.
- **Fastest Route (`#F87171` Coral / Red):** Minimum travel duration; explicitly flags long isolated or quiet stretches with warning badges.

### 2. 9-Parameter Night Activity Scoring Engine (100 Points)
Fully configurable weighted evaluation model:
| Parameter | Weight | Description |
|---|---:|---|
| **Open shops & commercial establishments** | **20** | Density and proximity of active shops, restaurants, cafes, and supermarkets |
| **Opening hours & arrival availability** | **15** | Estimated operating status when the user actually reaches the point |
| **Pharmacy & 24/7 essential services** | **10** | Continuous access to late-night and 24/7 pharmacies and medical stores |
| **Activity continuity & isolation gaps** | **15** | Penalizes long dark stretches (>250m) with zero active establishments |
| **Main-road accessibility** | **10** | Ratio of travel along well-connected primary roads vs. isolated back-alleys |
| **Police stations, hospitals & help points**| **10** | Proximity to emergency assistance posts and medical facilities |
| **Street lighting coverage** | **10** | Mapped street illumination along road segments |
| **CCTV coverage** | **5** | Verified public/private CCTV cameras along the path |
| **Public transport accessibility** | **5** | Metro stations, bus terminals, and active transit hubs |
| **TOTAL** | **100** | Configurable via `DEFAULT_SCORING_WEIGHTS` |

### 3. Real-Street Routing Engine (No Arbitrary Lines)
- **Google Routes API (New) v2:** High-quality multi-alternative routing on real city streets using `v2:computeRoutes`.
- **OpenStreetMap OSRM Fallback:** Public OSRM routing (`router.project-osrm.org`) for zero-cost routing.
- **Real-Street Via Snapping (`/nearest`):** When generating alternative corridors, waypoints are snapped directly to real navigable roads via OSRM `/nearest`, ensuring zero floating lines through buildings.

### 4. Supabase PostGIS Spatial Backend & Persistent Cache
- **Corridor Buffering (`get_pois_in_corridor`):** PostgreSQL function utilizing PostGIS `ST_DWithin` and `ST_Buffer` to query establishments within a **350-meter safety corridor** around route geometries in milliseconds.
- **Real-Time Auto-Save (`upsert_pois`):** Real-time write-through cache that automatically stores newly discovered nighttime POIs (pharmacies, hospitals, police, petrol pumps, stores) into Supabase with spatial deduplication (35m radius). Future searches in that city retrieve them instantly.
- **Community Safety Reporting:** Direct submission of crowdsourced safety concerns (poor lighting, harassment hotspots, broken streetlights) into `community_reports`.

### 5. Interactive Dark-Theme Map & Comparison UI
- **Simultaneous Polylines:** All 3 routes rendered simultaneously with distinct Figma-compliant colors.
- **Road-Segment Activity Heatmap:** Toggleable overlay showing safety indicators along individual segments:
  - 🟢 Green: High mapped nighttime activity
  - 🟡 Yellow: Moderate activity
  - 🟠 Orange: Low activity
  - 🔴 Red: Significant isolation gap
- **POI Markers & Category Filters:** Interactive markers with filter pills (`All POIs`, `💊 Pharmacies`, `🏥 Hospitals`, `👮 Police`, `🏪 Open Shops`, `⛽ Petrol`, `🚇 Transit`).
- **Skeleton Loading States:** Animated pulse skeletons (`RouteComparisonSkeletonGroup`, `RouteCardSkeleton`, `PoiRowSkeleton`) during route computation.
- **"Why this score?" Inspection Sheet:** Opens a 9-parameter breakdown card and complete establishment directory with verified one-tap phone calling.
- **Active Navigation Mode:** Turn-by-turn guidance, arrival countdowns, upcoming assistance ahead alerts, and an emergency SOS 112 button.

### 6. Live Global Search (Zero Hardcoded Defaults)
- OpenStreetMap **Photon** (`photon.komoot.io`) & **Nominatim** live search.
- Google Places API (New) autocomplete.
- Works in any city globally with no forced start or destination defaults.
- Clean search modal with quick GPS pickup option.

---

## 🛠️ Tech Stack & Architecture

- **Mobile Framework:** React Native 0.88 with **Expo SDK 58** & TypeScript (Strict Mode)
- **Routing & Navigation:** **Expo Router v54** (Root Stack + Modal + Tab navigation)
- **Maps:** `react-native-maps` with Google Maps custom night styling JSON
- **Styling:** **NativeWind v5** (Tailwind CSS) & StyleSheet
- **Animations:** **React Native Reanimated 4**
- **Spatial Database:** **Supabase** with **PostGIS** extension
- **APIs:**
  - Google Routes API v2 (`computeRoutes`)
  - Google Places API (New) (`searchText` & `searchNearby`)
  - OpenStreetMap Photon & Nominatim Geocoding
  - Project OSRM Routing & Snapping

---

## 📦 Setup & Installation

### 1. Prerequisites
- **Node.js** (v18 or higher recommended)
- **npm** or **yarn**
- **Android Studio** (with Emulator or connected physical device) OR **Expo Go** on Android/iOS

### 2. Clone & Install
```bash
git clone https://github.com/Dbms084/NightAware.git
cd NightAware/NightAware
npm install
```

### 3. Environment Variables Configuration
Copy `.env.example` to create your local `.env`:
```bash
cp .env.example .env
```
*(On Windows PowerShell: `Copy-Item .env.example .env`)*

Configure your `.env` values:
```env
# -----------------------------------------------------------------------------
# Google Maps Platform (Routes API v2 & Places API New)
# -----------------------------------------------------------------------------
GOOGLE_MAPS_API_KEY=your-google-maps-api-key-here
EXPO_PUBLIC_GOOGLE_MAPS_API_KEY=your-google-maps-api-key-here

# -----------------------------------------------------------------------------
# Supabase PostGIS Spatial Database
# -----------------------------------------------------------------------------
EXPO_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key-here
EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY=your-supabase-anon-key-here
```

> **Required Google Cloud Console APIs:**
> - Routes API (`directions/v2:computeRoutes`)
> - Places API (New) (`v1/places:searchText` & `searchNearby`)
> - Maps SDK for Android
> - Geocoding API

> **Required Supabase PostGIS Setup:**
> - Enable PostGIS extension: `CREATE EXTENSION IF NOT EXISTS postgis;`
> - Tables: `pois`, `community_reports`, `trusted_contacts`
> - Stored Procedures: `get_pois_in_corridor(route_coords, buffer_meters)`, `upsert_pois(pois_data)`

### 4. Run the App
```bash
# Start with Expo CLI:
npx expo start

# Run directly on Android emulator / connected device:
npx expo run:android
```

---

## 📁 Project Structure

```
NightAware/
├── app.config.js                    # Expo configuration & Google Maps API key binding
├── .env.example                     # Environment variables template
├── src/
│   ├── app/
│   │   ├── _layout.tsx              # Root Stack Navigator & Theme Provider
│   │   ├── compare.tsx              # Full Comparison Results Page (Map, Cards, POIs)
│   │   └── (app)/
│   │       ├── _layout.tsx          # App tab layout
│   │       ├── index.tsx            # Home Route Planner Screen
│   │       └── explore.tsx          # Safety Explore Screen
│   ├── components/
│   │   ├── map/
│   │   │   ├── NightAwareMap.tsx    # Native Google Map with dark styling
│   │   │   ├── RoutePolyline.tsx    # Multi-color polylines & Heatmap segments
│   │   │   ├── MapMarkers.tsx       # POI markers & category icons
│   │   │   └── RouteDetailSheet.tsx # 9-parameter score breakdown & call actions
│   │   └── ui/
│   │       ├── LocationSearchModal.tsx # Global autocomplete search modal
│   │       ├── SafetyReportModal.tsx   # Incident reporting modal
│   │       └── Skeleton.tsx            # Animated pulse loading skeletons
│   ├── features/
│   │   ├── location/services/       # Photon, Nominatim & Places geocoding
│   │   ├── places/services/         # Place provider, PostGIS queries & auto-cache
│   │   ├── routes/services/         # Scoring engine & multi-alternative router
│   │   └── reports/services/        # Supabase community reporting service
│   ├── lib/
│   │   ├── google-maps-api.ts       # Routes API v2 & Places API (New) client
│   │   └── supabase.ts              # Supabase PostGIS client
│   └── types/
│       └── geo.ts                   # Core TypeScript types for routes, POIs, scores
```

---

## 📄 License
This project is developed for women's nighttime travel safety and informed navigation decision-making.
