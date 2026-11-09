# Women's Night Route Companion

An Android-first Expo app for comparing night journeys by travel time and the distribution of nearby shop listings. The project is intended to help people make an informed comparison; activity indicators are **not a safety guarantee**.

## Current features

- Email/password registration and sign-in using Supabase Auth, including session restoration and sign-out.
- Journey planner with place search, optional foreground current-location lookup, and walking/driving modes.
- Route comparison and turn-by-turn navigation powered by Mapbox.
- Shop listings summarized by route segment, with an activity proxy score when there is enough listing data.

Live search, route, navigation, and shop data require a Mapbox token and network access. Shop listings and a score derived from them do not measure people present, crime, lighting, or personal safety. The app must not describe a route as safe or unsafe.

## Tech stack

- Expo SDK 58, React Native 0.88, TypeScript 6, and Expo Router.
- NativeWind 5 release candidate with Tailwind CSS 4.
- Supabase Auth only, with AsyncStorage-backed native session persistence.
- `@rnmapbox/maps` and `@rnmapbox/navigation` for maps and navigation; `expo-location` for foreground location.

## Get started

### Requirements

- Node.js and npm.
- An Expo-compatible Android development environment. Mapbox native maps/navigation may require a development build; Expo Go may not include these native modules.
- A Supabase project with Email auth enabled and a public/publishable client key.
- A Mapbox public access token with access to the APIs used by this app.

### Configure environment

Copy `.env.example` to `.env` and set:

```dotenv
EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY=your-public-key
EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN=pk.your-mapbox-token
```

The app also accepts `EXPO_PUBLIC_SUPABASE_ANON_KEY` as a compatibility fallback. Only public client keys belong in the mobile app; never put a Supabase service-role key here. Do not commit `.env`.

### Install and run

```bash
npm install
npx expo start
```

For native Android modules, create/run the project's development build using the configured Android toolchain:

```bash
npx expo run:android
```

Other useful scripts: `npm run web`, `npm run ios`, and `npm run lint`.

## Project layout

```text
src/
  app/                       Expo Router routes and auth/app layouts
    (auth)/                  Sign-in and sign-up
    (app)/                   Journey planner, route comparison, navigation
  components/                Shared presentation components
  constants/                 Theme tokens
  features/
    auth/                    Auth form, provider, and Supabase auth service
    journey/                 Journey state, location search, map, Mapbox service
  lib/supabase.ts            Single Supabase client (auth only)
assets/                      App icons and images
```

The top-level `app.json` configures Expo Router, Mapbox, and foreground location permissions. `src/global.css` and the app's NativeWind setup provide utility styling.

## Adding a feature

1. Read `AGENTS.md` before making changes. It defines product scope, privacy requirements, UI conventions, and the backend boundary.
2. Keep feature code grouped under `src/features/<feature>/`; keep route files in `src/app/` focused on screen composition and navigation.
3. Define shared domain types once and keep data access/score calculations out of UI components.
4. Reuse the dark theme and NativeWind `className` styling. Keep controls accessible and handle loading, empty, permission-denied, and error states.
5. Treat location and journey coordinates as sensitive. Request foreground location only when needed; do not log or persist them automatically.
6. Supabase is for authentication only. Do not add route, place, profile, incident, or journey data to Supabase. Do not add external routing/places providers without explicit product approval.
7. Clearly label sample data and explain its limits. A shop-listing-derived score is only an activity proxy, not evidence of safety or actual foot traffic.

Before submitting, run `npx tsc --noEmit` and `npm run lint` when available, then check the affected flow on an Android development build. Automated checks do not replace device verification.

## Data and privacy notes

- Supabase stores/authenticates accounts only; no application database is part of this project.
- Place queries and route endpoints/coordinates are sent to Mapbox to provide search, routing, and shop results. Review Mapbox terms, data handling, attribution, and billing for your deployment.
- Current location is requested only after the user taps the location action. Navigation may request foreground location while in use.
- Shop availability/coverage can be incomplete. A missing listing is not evidence that a place or people are absent.

## Product limits

This app does not validate route safety, detect crime, measure street lighting or surveillance, or guarantee that help is available. Do not add SOS, incident reporting, background tracking, crowd-sourced safety claims, or administrative features without a separately defined and approved design.
