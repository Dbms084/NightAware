# NightAware — Women's Night Route Companion

An Android-first React Native & Expo application designed to help users compare evening and nighttime routes. Displays journey times, nearby accessible/open nighttime places (pharmacies, medical stores, petrol pumps, transport hubs, police stations), and computes a **Night Activity Score** to help you make informed route choices.

> **Important Note:** Night Activity Scores reflect surrounding open amenities and help points as an activity proxy, not a guaranteed measure of personal safety.

---

## Features

- 📍 **High-Precision GPS Location**: Detects your precise live location and reverse-geocodes your address.
- 🔍 **Uber / Google Maps Style Route Search**: Instant autocomplete suggestions for both **Start** and **Destination** with "Your current location (GPS)" as the top suggestion.
- 🗺️ **Interactive Dark-Themed Map**: Powered by `react-native-maps` with Google Maps custom night styling, dynamic camera auto-centering, and route framing.
- ⚡ **Real Google Routes & Alternatives**: Multi-route calculation displaying recommended and fastest alternatives.
- 🌟 **Night Activity Score /100**: Evaluates nearby open amenities, help point density, and route coverage.
- 📲 **Smooth Animated Map Expansion**: One-tap full-screen map expansion with Reanimated and floating detail controls.
- 🔐 **Supabase Authentication**: Secure email/password sign-up, sign-in, session restoration, and logout.

---

## Setup & Running the Project

### 1. Prerequisites
- **Node.js** (v18 or higher recommended)
- **npm** or **yarn**
- **Android Studio** (with an Android Emulator or connected physical device) OR **Expo Go** on your phone

### 2. Clone and Install Dependencies
```bash
git clone https://github.com/Dbms084/NightAware.git
cd NightAware
npm install
```

### 3. Configure Environment Variables
Copy `.env.example` to create your local `.env` file:
```bash
cp .env.example .env
```
*(On Windows PowerShell: `Copy-Item .env.example .env`)*

In `.env`:
- **Google Maps API Key**: Get a key from [Google Cloud Console](https://console.cloud.google.com/apis/credentials) with Maps SDK for Android, Places API (New), Routes API, and Geocoding API enabled, and set:
  ```env
  GOOGLE_MAPS_API_KEY=your-google-maps-api-key-here
  EXPO_PUBLIC_GOOGLE_MAPS_API_KEY=your-google-maps-api-key-here
  ```
- **Supabase Auth**: Create a free project at [supabase.com](https://supabase.com) and add your project credentials:
  ```env
  EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
  EXPO_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
  ```

### 4. Run the App

#### Option A: Quick Launcher (Windows PowerShell)
Right-click `start-dev.ps1` and select **Run with PowerShell**, or in terminal:
```powershell
.\start-dev.ps1
```

#### Option B: Standard Expo CLI
```bash
# If using an Android emulator or USB device:
npm run android

# Or start the Metro bundler:
npx expo start
```

---

## Tech Stack

- **Framework**: React Native 0.88 with **Expo SDK 58** & TypeScript (strict mode)
- **Routing**: **Expo Router** file-based navigation
- **Styling**: **NativeWind v5**
- **Animations**: **React Native Reanimated 4**
- **Maps**: `react-native-maps` with Google Maps custom dark JSON styling
- **APIs**:
  - Google Places API (New) Autocomplete & Nearby Search
  - Google Routes API v2
  - Google Geocoding API
- **Auth**: `@supabase/supabase-js` (Auth only)
