# AGENTS.md — Women's Night Route Companion

## 1. Purpose
You are a coding agent working on an Android-first React Native app inspired by the supplied demo video: “Mapping UNSAFE streets for women.” The app helps users **compare routes at night** by displaying journey times, accessible/open places, help points, and measures of surrounding nighttime activity. The purpose is informed route comparison, **not a guarantee that any route is safe**.

**Primary stack**
- React Native with **Expo** and **TypeScript** (strict mode).
- **Expo Router** for file-based navigation.
- **NativeWind v5** for styling (use v5 documentation and setup; do not copy v4 Babel/Metro/Tailwind configurations).
- **Supabase Auth only**, for email/password registration, login, session restoration, and logout.
- `expo-location` for foreground position permissions and current position.
- A React Native-compatible map library, preferably `react-native-maps`, with Expo support verified for the installed SDK. Verify Expo Go versus development-build requirements before choosing native integrations.
- Optional `expo-secure-store` for appropriate session storage, consistent with current Supabase/Expo guidance.

**Non-negotiable backend boundary:** Supabase is **only** for authentication. Do **not** create Supabase tables, database models, PostGIS, edge functions, storage buckets, realtime subscriptions, incident APIs, or admin services. Do not connect routing, places, or scoring to Supabase. For the first version, use typed local mock fixtures and modular client-side services. External routing/places providers may be proposed separately but MUST NOT be integrated until explicitly requested.

## 2. Product interpretation from the video
The video shows a nighttime journey comparison workflow with:
1. A dark route planner: **From**, **To**, travel mode, and journey/departure time.
2. A map with a start marker, destination marker, and multiple color-coded polylines.
3. Route comparison cards (e.g. **Safest route** versus **Fastest route**), each with travel duration, distance, extra travel time, and a **Night Activity Score /100**.
4. A route detail sheet showing nearby pharmacies/medical stores, hospitals, petrol pumps, shops/food, transport, and open help points.
5. Explanation of low-activity or poorly supported route segments, such as distance to the next open help point.
6. A scoring explanation that considers points of interest, operating hours, open businesses, and time of travel.
7. An illustrative, dark, high-contrast interface with compact cards, score rings, outlined selections, and route colors.

**Important:** The video is a product reference, not proof that these scores predict personal safety. Do not claim to detect crime, danger, street lighting, surveillance, or actual human foot traffic unless a real and appropriately validated data source is introduced.

## 3. First-version scope and implementation order
Only implement features explicitly requested in the current user instruction. Do not build the whole app proactively.

Recommended order:
1. Project foundation: Expo Router, NativeWind v5, typed theme tokens, layout, and shared UI.
2. **Authentication first:** email/password sign-up, sign-in, session persistence, logout, protected routes.
3. Location permission + current-location lookup.
4. Map shell with dark presentation, location and destination pins, sample route polylines.
5. Journey planner: origin, destination, departure time, mode (driving first).
6. Compare routes: route selection, duration, distance, activity score, comparison reasons.
7. Route details: POI categories, open-at-time indications, activity factor breakdown, stretches with fewer places.
8. Later, only if requested: geocoding, actual road network routing, live business opening hours, data-driven score calculations, incident reporting, area-level scores, SOS, or admin.

**Do not treat the video's features as a request to integrate paid external APIs.** Mock unsupported features clearly, and keep their interfaces replaceable.

## 4. Architecture
Use a **feature-based** structure, not a single massive screen:

```text
app/
  _layout.tsx                 # root providers, auth restore, navigation guard
  (auth)/
    _layout.tsx
    sign-in.tsx
    sign-up.tsx
  (app)/
    _layout.tsx
    index.tsx                 # route planner + map
    compare.tsx               # route comparisons
    route/[id].tsx            # route details
    settings.tsx              # logout and app info
src/
  components/
    ui/                       # Button, TextField, Screen, Card, BottomSheet, ScoreRing
    map/                      # MapView wrapper, map markers, RoutePolyline
  features/
    auth/
      components/
      hooks/
      services/auth-service.ts
      types.ts
    location/
      hooks/
      services/location-service.ts
      types.ts
    journey/
      components/
      hooks/
      services/journey-service.ts
      types.ts
    routes/
      components/
      services/route-provider.ts
      services/activity-score.ts
      types.ts
    places/
      services/place-provider.ts
      types.ts
  lib/
    supabase.ts               # auth client only
    config.ts
  data/
    mock-journeys.ts
    mock-routes.ts
    mock-places.ts
  constants/
    colors.ts
    spacing.ts
  utils/
    format-time.ts
    distance.ts
assets/
  images/
.env.example
AGENTS.md
```

Create only folders/files needed for the feature currently being built. Keep view components separate from location, auth, route, and score logic. Define domain types once and reuse them.

## 5. Visual direction
Use the video as inspiration, not a pixel-perfect mandate:
- **Dark-first**, minimal and Android-friendly.
- Background: deep navy/near-black (`#090D17`), surface: charcoal (`#171A22`), elevated cards: `#222630`.
- Primary text: warm white (`#F7F7F5`), secondary: cool gray (`#A7ADBB`), divider: `#343945`.
- Highlight: muted warm gold (`#D7B66A`) for activity metrics; use cyan/blue for start points and coral/red for an alternate route or attention areas.
- Rounded rectangles, subtle thin borders, deliberate spacing, and large, readable numbers.
- High-priority actions should have clear text labels and strong contrast; do not rely on color alone.
- Respect Android status bar, safe areas, keyboard, varying screen sizes, and system font scaling.
- Do not add unnecessary bottom tabs, illustrations, or ornamental UI. Prefer one focused primary screen with bottom sheets for supplementary details.
- All styling should use **NativeWind v5** utility `className` where supported. Use `style` only where required by map libraries, dynamically computed geometry, or animated values.

## 6. Authentication (Supabase Auth ONLY)
- Use `@supabase/supabase-js` with a single client in `src/lib/supabase.ts`.
- Read `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_ANON_KEY` (or the SDK's current publishable-key equivalent) from environment. Put placeholders in `.env.example`; never commit real secrets.
- Public/publishable client keys are okay in the app; **never** embed a service-role/secret key.
- Implement email/password **sign-up**, **sign-in**, **sign-out**, and session restoration.
- Handle expected auth failures, network failures, loading, double-submit prevention, and password visibility controls.
- If Supabase email confirmation is enabled, show a clear confirmation state and do not falsely claim the user is signed in.
- Use a provider/hook exposing `session`, `user`, `isLoading`, `signIn`, `signUp`, `signOut`.
- Subscribe to auth state changes and unsubscribe on cleanup. Redirect signed-out users to auth screens; redirect signed-in users into the app; prevent protected screen flashes while session restoration runs.
- Validate email format and basic password requirements on client; rely on Supabase for final validation.
- Persist sessions using a current Expo-supported approach; test full app restart.
- **Never** store user profiles, places, route histories, reports, or journey data in Supabase.

## 7. Location & privacy
- Request **foreground** location permission only when needed, with a plain-language reason.
- Use `expo-location` with sensible accuracy settings, loading states, and timeouts/fallbacks; never promise exact GPS accuracy.
- If permission is denied or location unavailable, show a graceful state and allow a manual/demo origin.
- Do not request background location or continuous tracking unless explicitly instructed.
- Never persist, upload, log, or share precise location automatically. Do not silently send location to third-party endpoints.
- Avoid exposing personal routes/history or sensitive coordinates in logs and screenshots.

## 8. Maps, routes, and places
Define typed interfaces so mocks can be replaced later:

```ts
type Coordinate = { latitude: number; longitude: number };
type TravelMode = 'driving' | 'walking';

type PlaceCategory =
  | 'hospital' | 'pharmacy' | 'petrol_station'
  | 'shop_food' | 'transport' | 'help_point';

type Place = {
  id: string;
  name: string;
  coordinate: Coordinate;
  category: PlaceCategory;
  openAtJourneyTime: boolean | null; // null = unknown
  dataSource: 'mock' | 'provider';
};

type RouteOption = {
  id: string;
  label: string;
  coordinates: Coordinate[];
  distanceMeters: number;
  durationMinutes: number;
  extraMinutes: number;
  nightActivityScore: number | null;
  placesOpenNearRoute: number | null;
  longestStretchWithoutOpenHelpMeters: number | null;
  longestLowActivityStretchMeters: number | null;
  isMock: boolean;
};
```

- `route-provider.ts` exposes `getRouteOptions(journey)`; initially return realistic-looking **but explicitly labeled demo data**.
- Never pretend a straight line or hand-drawn polyline is a validated walking/driving route. Fixture routes must be clearly presented as previews/demos.
- `place-provider.ts` returns mock points of interest by route, with distinct unknown/open/closed states.
- Do not present a point as currently open based solely on a stored static flag or on the phone's current time; route-time-based data needs a valid schedule and timezone.
- Ensure screen components do not know whether data came from mocks or a provider.
- Display attribution/licensing for map tiles or POI data when a real provider is later integrated.

## 9. Night Activity Score: explainability & limits
The video's score is conceptually based on surrounding nighttime activity. It must be treated as an **activity proxy, not a safety rating**.

Rules:
- Display the full label **Night Activity Score** and explanatory helper text: **“Activity indicators, not a safety guarantee.”**
- Use `null`/“Not available” when actual evidence is insufficient; do not fabricate a 0–100 score from GPS coordinates alone.
- In demo mode, provide fixture scores labeled **“Sample score”** or **“Demo data”**.
- The detail screen should explain each input, its availability, and how it affects the score.
- Future scoring may consider density of validated open POIs, nearby help points, route coverage, and long stretches without verified activity. These are not direct measures of crime or personal safety.
- Never infer the real presence of people from store listings or automatically declare routes “safe,” “unsafe,” “crime-free,” or “recommended by authorities.”
- For route comparison, prefer **“More nearby activity”** / **“Fastest”** as labels; if using **“Safest”** as in the video, qualify it clearly as a relative activity-based suggestion rather than a proven safer route.
- Do not invent confidence percentages, real-time crowds, CCTV coverage, crime rates, or street lighting information.

## 10. Primary screens & interactions
### Sign in
Email input, password input with show/hide, sign-in button, link to sign-up, validation errors, loading state. Use dark styling and accessible touch targets.

### Sign up
Email, password, confirm password, register action, back-to-login link. Handle confirmation email state if required.

### Home: journey planner and map
Top-level dark map; origin (default to user's permitted current location), destination input/demo picker, departure time, travel mode (driving first), **Compare night routes** button. Show permission/loading/error states and map attribution.

### Compare routes
Show 2–3 selectable route options on the map and as cards. Each card shows label, **Night Activity Score** (if available), ETA, distance, extra minutes, nearby open-place count, and a **View activity details** action. Emphasize the selected route without implying absolute safety.

### Route detail
Bottom sheet or dedicated screen with breakdown: hospitals, medical stores, shops/food, petrol pumps, transport, nearby help points, longest stretch without an open help point, longest low-activity stretch, and source/time caveats. Do not report categories for which there is no data as “0 found”; use “Unknown.”

### Settings
Minimal profile indicator (email only), sign-out, privacy note, and demo-data disclosure. No account profile table.

## 11. Component & code conventions
- Prefer small single-purpose React function components and named exports.
- Use strict TypeScript. Avoid `any`, unsafe assertions, and duplicated domain interfaces.
- Use `StyleSheet`/inline styles only for unsupported native styling, performance-sensitive map drawing, or computed values. Prefer `className` for ordinary UI.
- Use controlled form inputs, explicit empty/loading/error/success states, and local state for transient UI.
- Keep route/POI mock data outside components, and scoring in pure testable functions.
- No large global state library by default; React Context for auth and hooks for feature state are sufficient.
- Use `expo-router` APIs and built-in React Native accessibility props; do not add React Navigation independently unless demanded by an Expo Router requirement.
- Avoid extra dependencies until needed. Check compatibility with the installed Expo SDK and NativeWind **v5** before installation.
- Never replace existing user-authored screens or assets without being asked.

## 12. Error handling and important edge cases
Handle: denied location, disabled GPS, unavailable GPS fix, bad geocoding result (when enabled), no sample route available, missing/unknown opening hours, travel time crossing midnight, disconnected network, Supabase auth errors, expired sessions, and route selection after app backgrounding.

Do not show misleading values when data is unavailable. Keep mock/live origin evident in UI. Avoid a crash when `user`, `session`, or position is null.

## 13. Verification and quality bar
For every implemented feature:
1. Follow the user's exact requested scope; do not jump ahead to subsequent screens.
2. Run TypeScript checking, linting if configured, and any relevant tests.
3. Verify on Android (emulator or device when available), including back navigation, keyboard avoidance, safe areas, and denied location permission.
4. For auth, verify registration, invalid credentials, confirmation handling, logout, and restored sessions.
5. For maps, verify that markers and polylines correspond to fixture coordinates and that demo results are visibly labeled.
6. Report files added/changed, manual testing required, and any blocked integration.

## 14. Agent behavior / response contract
- Start by inspecting the existing project structure, installed dependencies, Expo SDK, current NativeWind version, and assets.
- **Always use NativeWind v5-specific configuration**; consult up-to-date official documentation before editing config, since older tutorials often target v4.
- When told to build a screen, build **only that screen** plus its essential dependencies. Do not generate unrelated screens, admin tools, or backend services.
- Reuse the app's existing design tokens and components. Keep examples runnable and free from undefined imports.
- Explain when a screen is powered by local mock data rather than a real map/places/routing API.
- If an external API is essential for production behavior, state the requirement, costs/key-handling implications, and seek approval before integrating it.
- Avoid unnecessary overengineering. The first goal is a polished, navigable, honest demo.

## 15. Out of scope unless separately requested
- Supabase database/Storage/Edge Functions, incident-report persistence, admin dashboard/backoffice, real-time user tracking, emergency contact notifications, SMS/calls, crowd-sourced safety reporting, geospatial analytics, ML scoring, background location, surveillance detection, live crime data, and claims of certified or guaranteed safety.
- Incident reporting, SOS, and administration may be future features, but **must not** be implemented merely because the broader theme is women's safety.

## 16. Definition of done for the initial auth milestone
- Expo Android app starts successfully.
- NativeWind **v5** styles visibly work.
- Sign-in and sign-up screens are implemented in the dark design system.
- Supabase email/password auth works with a user-created project.
- Email verification state is handled if enabled.
- Session is restored on launch; protected app route redirects correctly.
- Logout works; secrets are not committed.
- No database tables or non-auth Supabase products are used.
- Route/map implementation is deferred until requested.


## 17. Additional engineering and safety guardrails
- Read this file and inspect relevant existing files **before every coding task**. Preserve working code, user-created screens, assets, and decisions. Do not refactor or upgrade unrelated packages.
- Prefer small, focused files (roughly 200 lines per UI component when practical), shared design tokens, and simple hooks over speculative abstractions. Use named exports for reusable components; Expo Router route files may use required default exports.
- Use `npx expo install` for Expo-supported dependencies and verify installed SDK compatibility first. Do not eject from managed Expo without explicit approval.
- Use touch targets around 44–48 dp, accessible labels, clear disabled/pressed/focus states, sufficient text contrast, and never make color the sole meaning of a score or warning.
- Keep authentication tokens, passwords, precise coordinates, incident descriptions, and travel history out of logs and analytics. Handle cleanup of subscriptions/watchers and avoid state updates after unmount.
- When integrating a third-party map/places/routing service in a future task, review key restrictions, privacy, data retention, pricing, provider terms, and required attribution. Do not expose server-only secrets through `EXPO_PUBLIC_*`.
- Never show a verified opening time, crowd level, crime rate, street-light condition, or safety claim without an appropriate actual data source. Demo values must be clearly labeled.
- If SOS is requested later, specify exactly what the button does and test real delivery/call behavior. Never state that police, emergency services, or a trusted contact were notified without confirmation from the actual service/device.
- If incident reporting is requested later, choose and get approval for a **separate data/storage approach**, since Supabase must remain authentication-only. Plan moderation, privacy, and abuse prevention before public sharing.
- If an admin interface is requested later, enforce authorization in the eventual trusted backend, not by hiding buttons or using an editable client role. Do not silently extend Supabase beyond Auth.
- If data is insufficient to compare route activity, show “Data unavailable” rather than producing a fabricated score or safety recommendation.

## 18. Required response at the end of each coding task
Give a concise report with: **Implemented**, **Files changed**, **Verification performed**, **Setup required**, and **Limitations**. Clearly distinguish automated checks from actual Android device testing. Do not claim “production-ready”, “safe route”, or “fully tested” without supporting evidence.

## 19. Current instruction to the next coding agent
**Implement the authentication milestone only** unless the user gives a different explicit task: Expo Router sign-in and sign-up, Supabase email/password Auth, session persistence and restoration, guarded navigation, and a minimal authenticated placeholder with sign-out. Use dark UI and **NativeWind v5**. Do not implement maps, routes, place lookups, activity scoring, incident reporting, SOS, admin, or a database yet.