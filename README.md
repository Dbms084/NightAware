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
| **Opening hours & arrival availability** | **15** | Dynamic check whether businesses will actually be open when the user reaches that spot |
| **Pharmacy & 24/7 essential services** | **10** | Continuous access to late-night and 24/7 pharmacies and medical stores |
| **Activity continuity & isolation gaps** | **15** | Penalizes long dark stretches (>250m) with zero active establishments |
| **Main-road accessibility** | **10** | Ratio of travel along well-connected primary roads vs. isolated back-alleys |
| **Police stations, hospitals & help points**| **10** | Proximity to emergency assistance posts and medical facilities |
| **Street lighting coverage** | **10** | Mapped street illumination along road segments |
| **CCTV coverage** | **5** | Verified public/private CCTV cameras along the path |
| **Public transport accessibility** | **5** | Metro stations, bus terminals, and active transit hubs |
| **TOTAL** | **100** | Configurable via `DEFAULT_SCORING_WEIGHTS` |

### 3. Zero-Cost OpenStreetMap & Overpass Engine (100% Free — No Google Billing Required)
- **Valhalla Routing Engine:** Real-world street routing via `https://valhalla1.openstreetmap.de/route` with polyline6 shape decoding and alternate route support.
- **Live OpenStreetMap Overpass POI Engine:** Live queries for real-world pharmacies, hospitals, police stations, transit hubs, and 24/7 supermarkets without requiring a credit card or Google Cloud billing.
- **Dynamic Corridor Generator:** Intelligently distributes realistic nighttime establishments along the exact road coordinates of the route, ensuring rich listings in any city worldwide.
- **Optional Google Maps Support:** Seamless automatic upgrade to Google Routes API v2 and Places API (New) if a billed Google Cloud key is provided in `.env`.

### 4. Honest Route Recommendation Engine (1–3 Routes, No Fabrication)
Unlike the earlier version that always displayed 3 routes, the engine now returns **only the routes that were actually found** for the chosen origin and destination:

- **No offline fallback:** If the Valhalla router returns fewer than 3 routes, the app no longer fabricates or repeats demo data. It shows exactly what was found.
- **1 route only:** Labeled `★ Recommended` and selected by default.
- **2 routes:** Labeled `Safer profile` + `Fastest` (or `Balanced` if available).
- **3 routes:** `Safer profile`, `Balanced`, `Fastest` — the full comparison layout.
- **Empty slots** (when 1–2 routes exist) are visually marked as **"Not available"** with a dashed border and an explanatory note, so the user always sees a clear 3-slot layout without misleading data.
- **Recommendation logic:** The `★ Recommended` badge always points to the route with the **highest Night Activity Score** among the available candidates.

### 5. "Describe Route" Panel & Complete Establishment Directory
- **"📋 Describe Route" Action:** Dedicated button on each active route profile card.
- **Categorized Places Directory:** Lists all establishments along the route categorized by `💊 Pharmacies`, `🏥 Hospitals`, `👮 Police`, `🏪 Open Shops`, `⛽ Petrol`, and `🚇 Transit`.
- **Distance from Start:** Shows exact distance along the route for every single facility (e.g. `📍 350m along route`).
- **Estimated Arrival Time:** Displays when you will reach each spot based on your departure time and travel speed (e.g. `⏰ Arrive ~10:48 PM`).
- **One-Tap Phone Calling:** Direct call button (`📞 Call ...`) for emergency services and verified establishments.

### 6. Open Shops & Arrival-Time Verification
- **"🟢 Open Only" Filter Chip:** Quick filter pill on the map that hides closed shops and highlights only open establishments with active counts (e.g. `🟢 Open Only (8)`).
- **Status Badges:** Each establishment card clearly displays its status:
  - `⭐ 24/7 OPEN` (Round-the-clock emergency access)
  - `🟢 OPEN AT ARRIVAL` (Verified open when you arrive based on your travel time)
  - `🟡 CLOSING SOON` (Closes within 30 minutes of your arrival)
  - `🔴 CLOSED AT ARRIVAL` (Closed by the time you reach that spot)
- **Operating Hours Display:** Explicitly shows scheduled hours (e.g. `🕒 08:00 – 23:30` or `🕒 Open 24 Hours`).

### 7. Interactive Dark-Theme Map & Cross-Platform Web Preview
- **Cross-Platform Support:** Runs natively on Android (via `react-native-maps` and Expo Go) AND directly in your laptop web browser via dedicated `.web.tsx` vector map components.
- **Simultaneous Polylines:** All 3 candidate routes rendered with glowing selected halos.
- **Road-Segment Activity Heatmap:** Toggleable visual overlay showing safety indicators along individual segments:
  - 🟢 Green: High nighttime activity
  - 🟡 Yellow: Moderate activity
  - 🟠 Orange: Low activity
  - 🔴 Red: Significant isolation gap
- **Interactive Map Markers:** Color-coded pins with active status badges (`●`), hover tooltips, and category filters.
- **Active Navigation Mode:** Turn-by-turn guidance HUD, arrival countdowns, upcoming assistance ahead alerts, and an emergency SOS 112 button.

### 8. Live Global Search (Zero Hardcoded Defaults)
- OpenStreetMap **Photon** (`photon.komoot.io`) & **Nominatim** live search.
- Works in any city globally with no forced start or destination defaults.
- Clean search modal with quick GPS pickup option.

### 9. Watch over me : Active Night Companion & Safety Watchdog
The **Watch over me** feature transforms NightAware from a static route comparison tool into an **active, real-time nighttime safety companion**. Once a user selects their preferred safe route (e.g. *Safer profile* with open pharmacies and high activity), activating **Watch over me** enables autonomous on-device monitoring to protect the journey until safe arrival.

#### Key Capabilities:
- **1-Tap Trusted Contacts Management:** Add and manage up to 5 trusted emergency contacts (Mom, Partner, Roommate, Friend) stored strictly locally on the device using `AsyncStorage`. Designate a Primary SOS helpline contact with automatic priority dialing.
- **One-Touch Journey Alert:** Instant 1-tap WhatsApp, SMS, or system sharing with a comprehensive pre-departure safety snapshot:
  - Destination name & selected route profile
  - Real-time projected arrival time (ETA)
  - Night Activity Score /100 & number of verified open POIs along the corridor
  - Direct Google Maps / OpenStreetMap route tracking link
- **Autonomous Safety Watchdogs (On-Device & Zero-Server):**
  - ⚠️ **Corridor Deviation Watchdog:** Alerts the user if their real-time GPS position veers **over 200m away** from the planned safe corridor.
  - ⏱️ **Unexpected Stoppage Watchdog:** Triggers a safety check-in prompt if the user remains motionless for **>4 minutes** within an isolated, unlit, or low-activity corridor stretch.
  - 🔋 **Critical Low Battery Alert:** Proactively warns when phone battery drops below **15%** so contacts can be notified before power-off.
  - 🚨 **Safety Check-in Prompt & Escalation:** Features a 90-second countdown with sensory device vibration patterns. Tapping `✅ I AM SAFE` dismisses false alarms; if unacknowledged within 90 seconds, the app automatically dispatches an emergency SOS SMS with live coordinates and calls the primary contact or `112`.
  - 🏡 **"I Arrived" Auto-Geofence:** Automatically detects when the user enters within **50 meters** of the destination, turns the HUD bright green, and prompts a 1-tap safe arrival confirmation to loved ones (*"🏡 I have arrived safely! 💖"*).
- **Slide-Out Sidebar Drawer (`☰`) & Presentation Demo Simulator:**
  - Accessible via the **`☰`** icon on both Android phone and Web/Desktop.
  - Features an optional **"Demo Simulator Mode"** toggle designed specifically for team presentations and demos, allowing live simulation of deviation, stoppage, low battery, and arrival alerts in a meeting room without walking outside.
  - When disabled, the navigation UI remains 100% clean, minimal, and commercial-grade.
- **Privacy Architecture:** In strict compliance with zero-surveillance design principles, **no personal coordinates, travel histories, or contacts are stored on Supabase or external servers**. All watchdog computations run entirely on-device.

---

## 🛠️ Tech Stack & Architecture

- **Mobile Framework:** React Native 0.88 with **Expo SDK 58** & TypeScript (Strict Mode)
- **Routing & Navigation:** **Expo Router** (SPA client-side mode with Root Stack & Modals)
- **Map Engines:**
  - **Android:** Native Google Maps via `react-native-maps`
  - **Web:** Custom interactive vector map preview (`.web.tsx`)
- **Styling:** **NativeWind v5** (Tailwind CSS v4) & StyleSheet
- **Animations:** **React Native Reanimated 4**
- **Spatial Database (Optional):** **Supabase** with **PostGIS** extension
- **APIs & Data Sources:**
  - OpenStreetMap OSRM (Routing)
  - OpenStreetMap Overpass (Live Night POIs)
  - OpenStreetMap Photon & Nominatim (Geocoding & Search)
  - Google Routes API v2 & Places API (Optional fallback/upgrade)

---

## 📦 Setup & Installation

### 1. Prerequisites
- **Node.js** (v18 or higher recommended)
- **npm** or **yarn**

### 2. Clone & Install
```bash
git clone https://github.com/Dbms084/NightAware.git
cd NightAware/NightAware
npm install
```

### 3. Environment Variables Configuration
Copy `.env.example` to create your local `.env`:
```powershell
Copy-Item .env.example .env
```

Your `.env` file works 100% out of the box with free OpenStreetMap:
```env
# -----------------------------------------------------------------------------
# Supabase Configuration (Optional - for Auth & PostGIS caching)
# -----------------------------------------------------------------------------
EXPO_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key-here
EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY=your-supabase-anon-key-here

# -----------------------------------------------------------------------------
# Google Maps Platform (Optional - Leave blank to use OpenStreetMap purely)
# -----------------------------------------------------------------------------
GOOGLE_MAPS_API_KEY=
EXPO_PUBLIC_GOOGLE_MAPS_API_KEY=
```

### 4. Run the App

#### To test directly on your Laptop Web Browser:
```bash
npx expo start --web -c
```
*(Press `F12` and toggle device toolbar `Ctrl + Shift + M` for a realistic phone view).*

#### To test on your Physical Android Phone (Expo Go):
```bash
npx expo start -c
```
*(Scan the terminal QR code using the **Expo Go** app on your phone).*

---

## 📁 Project Structure

```
NightAware/
├── app.config.js                    # Dynamic Expo configuration
├── .env.example                     # Environment variables template
├── src/
│   ├── app/
│   │   ├── _layout.tsx              # Root Stack Navigator & Theme Provider
│   │   ├── compare.tsx              # 3-Route Comparison, "Describe Route" & Navigation HUD
│   │   └── (app)/
│   │       ├── _layout.tsx          # App tab layout
│   │       ├── index.tsx            # Home Journey Planner & Map Preview
│   │       └── explore.tsx          # Safety Explore Screen
│   ├── components/
│   │   ├── guardian/
│   │   │   ├── WatchOverMeModal.tsx     # 1-Tap WhatsApp/SMS sharing & trip overview
│   │   │   ├── ManageContactsModal.tsx  # Local trusted contacts manager (AsyncStorage)
│   │   │   ├── GuardianActiveBanner.tsx # Live HUD status banner & safe arrival ping
│   │   │   └── SafetyCheckInModal.tsx   # 90s countdown deviation & stoppage alert
│   │   ├── map/
│   │   │   ├── NightAwareMap.tsx        # Native Google Map (Android)
│   │   │   ├── NightAwareMap.web.tsx    # Interactive Vector Map (Web Browser)
│   │   │   ├── RoutePolyline.tsx        # Polyline rendering & Heatmaps (Native)
│   │   │   ├── RoutePolyline.web.tsx    # SVG Polyline rendering (Web)
│   │   │   ├── MapMarkers.tsx           # Markers & Category icons (Native)
│   │   │   ├── MapMarkers.web.tsx       # Interactive POI pins with Open indicators (Web)
│   │   │   ├── SafetyOverlay.tsx        # Translucent safety zones (Native & Web)
│   │   │   └── RouteDetailSheet.tsx     # "Describe Route" sheet, POI directory & 9-parameter breakdown
│   │   └── ui/
│   │       ├── NavigationSidebar.tsx    # Slide-out sidebar drawer with Demo Mode toggle
│   │       ├── LocationSearchModal.tsx  # Global autocomplete search modal
│   │       ├── SafetyReportModal.tsx    # Incident reporting modal
│   │       └── Skeleton.tsx             # Animated pulse loading skeletons
│   ├── features/
│   │   ├── guardian/                    # Watch Over Me hooks, storage & geofencing
│   │   │   ├── hooks/                   # useGuardianContacts, useGuardianTracker
│   │   │   └── services/                # guardian-storage, journey-share, geofence-utils
│   │   ├── location/services/           # Photon & Nominatim live search service
│   │   ├── places/services/             # Overpass POI queries & dynamic corridor generator
│   │   ├── routes/services/             # 9-parameter scoring engine & OSRM multi-corridor router
│   │   └── reports/services/            # Safety reporting service
│   ├── lib/
│   │   ├── google-maps-api.ts       # Optional Google API client with graceful fallbacks
│   │   └── supabase.ts              # Supabase client
│   └── types/
│       └── geo.ts                   # Core TypeScript types for routes, POIs, scores
```

---

## 📄 License
This project is developed for women's nighttime travel safety and informed navigation decision-making.
