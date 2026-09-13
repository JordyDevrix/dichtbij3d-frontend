# Dichtbij3D — frontend

React Native + Expo app for the Dichtbij3D marketplace. One codebase runs as a
**website** and as a **native Android app**.

* Expo SDK 57 + expo-router (file-based routing, real URLs on web)
* Font Awesome icons only — no emoji anywhere in the UI
* Dutch-orange design system (`src/theme/theme.ts`)
* Localisation for **nl / en / de / fr** (`src/i18n`), auto-detected, switchable in the header
* Typed API client with automatic access-token refresh (`src/api`)

## Requirements

* Node 20+ (tested on 22)
* The [Dichtbij3D backend](../dichtbij3d-backend) running on <http://localhost:8080>
* For a native Android build: Android SDK + JDK 17/21 (see below)

## Run as a website

```bash
npm install
npm run web           # http://localhost:8081
```

Sign in with one of the seeded demo accounts (they are shown on the login screen):

| Account | Password |
|---|---|
| `admin@dichtbij3d.nl` | `Admin123!` |
| `sanne@dichtbij3d.nl` | `Demo12345!` |

## Run on Android

```bash
npm start             # then press "a", or scan the QR code with Expo Go
```

To build an installable app:

```bash
npm run prebuild:android   # generates ./android (already done for you)
npm run android            # debug build onto a device/emulator
npm run build:apk          # release variant
```

`npm run android` needs a local **Android SDK** (`ANDROID_HOME`) and JDK 17 or 21 —
the Android Gradle Plugin does not support JDK 25. If you do not want to install the
SDK locally, use a cloud build instead — see below.

The `android/` folder is generated output and is git-ignored; regenerate it any time
with `npm run prebuild:android`.

## Install it on a phone

### Option A — APK via EAS Build (no local Android SDK needed)

`eas.json` defines the build profiles. The `preview` profile produces a plain **APK**
you can side-load, and bakes in the deployed API URL (a native app cannot use the
same-origin trick the web build relies on).

```bash
npx --yes eas-cli@latest login     # free Expo account
npm run build:cloud:apk            # = eas build --platform android --profile preview
```

> The npm package is called **eas-cli** while its binary is `eas`, so plain
> `npx eas ...` fails with *"could not determine executable to run"*. Use
> `npx --yes eas-cli@latest ...`, the `npm run eas -- <args>` shortcut, or install it
> globally with `npm i -g eas-cli` and then call `eas` directly.

The build runs on Expo's servers and ends with a QR code plus a download link — open
it on the phone, allow "install unknown apps" and you have the real app. Use
`npm run build:cloud:aab` for an `.aab` to upload to Google Play.

Change the URL a build points at in `eas.json` → `build.<profile>.env.EXPO_PUBLIC_API_URL`.

### Option B — install the website as an app (PWA)

The web build ships a `manifest.json`, maskable icons and a theme colour, so the
deployed site is installable straight from the browser, no store or APK required:

* **Android / Chrome** — open the site, menu (⋮) → *Add to Home screen* / *Install app*.
* **iOS / Safari** — Share → *Add to Home Screen*.

It then launches full-screen with its own icon and no browser chrome. This requires
the site to be served over **HTTPS**.

## Pointing at another backend

Resolution order for the API base URL:

1. `EXPO_PUBLIC_API_URL` environment variable
2. `extra.apiUrl` in `app.json` (default `http://localhost:8080`)
3. `http://localhost:8080`

On a physical device `localhost` is rewritten automatically to the Metro LAN host, and
to `10.0.2.2` on the Android emulator.

```bash
EXPO_PUBLIC_API_URL=http://192.168.1.20:8080 npm start
```

## Screens

| Route | What it does |
|---|---|
| `/` | Marketplace: search, type chips, filter sheet (tags, price, city, dates, biddable), sort, infinite list. Browsable without an account. |
| `/advert/[id]` | Advert detail, gallery, reactions, bids, accept job, owner/admin actions, dwell-based view ping |
| `/create` | Post a print request, model request, model for sale or print for sale |
| `/models`, `/model/[id]` | Browse / upload / buy 3D models, authenticated file download |
| `/calculator` | Print-cost calculator: pick your printer, enter duration, filament, waste, energy, failure rate, labour and margin |
| `/notifications` | Notification centre (incl. "your advert was removed because…") |
| `/profile`, `/user/[id]` | Own profile editor + public profiles |
| `/settings/security` | Password change, TOTP, passkeys, sign out everywhere |
| `/admin`, `/admin/{users,adverts,reports}` | Admin-only metrics, charts, user management, advert restore, report queue, audit log |
| `/auth/{login,register,mfa}` | Email + password, TOTP step, passkey sign-in |

### Moderation without the admin panel

Admins can **right-click** (or long-press on touch devices) any advert card to delete it
with a reason. The author immediately receives a notification explaining why.

## Scripts

| Script | Purpose |
|---|---|
| `npm run web` | Dev server for the browser |
| `npm start` | Dev server for Expo Go / devices |
| `npm run build:web` | Static production export to `dist/` |
| `npm run prebuild:android` | Generate the native Android project |
| `npm run android` / `build:apk` | Debug / release Android build |
| `npm run typecheck` | Strict TypeScript check |

## Project layout

```
app/                 routes (expo-router)
src/api/             typed client + endpoints, token storage
src/components/      design system, Icon registry, AdvertCard, header, bottom bar
src/context/         auth, toasts
src/i18n/            nl (master) + en / de / fr
src/theme/           colours, spacing, typography
src/utils/           formatting, uploads, WebAuthn helpers
```

Adding a translation key means adding it to **all four** files in `src/i18n` —
`nl.ts` defines the `Translations` type, so `npm run typecheck` fails otherwise.

## Container image

`.github/workflows/release.yml` publishes a multi-arch nginx image to GHCR on every push
to `main` and every `v*.*.*` tag:

```
ghcr.io/jordydevrix/dichtbij3d-frontend:latest
ghcr.io/jordydevrix/dichtbij3d-frontend:1.2.3
ghcr.io/jordydevrix/dichtbij3d-frontend:sha-<commit>
```

The API URL is **not** baked into the bundle. At container start `docker/env.sh` writes
`/env.js`, which `index.html` loads before the app:

| Variable | Default | Meaning |
|---|---|---|
| `API_URL` | *(empty)* | Empty means same origin — nginx proxies `/api` to `BACKEND_URL`, so there is no CORS. Set it only when the API lives on another origin. |
| `BACKEND_URL` | `http://backend:8080` | Upstream the proxy forwards `/api` and `/actuator` to. |
| `PORT` | `80` | Port nginx listens on inside the container. |

```bash
docker run -p 8088:80 -e BACKEND_URL=http://my-api:8080 ghcr.io/jordydevrix/dichtbij3d-frontend
```

For a full stack use the deployment repository: <https://github.com/JordyDevrix/dichtbij3d>.
