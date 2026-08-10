# GrazeLink — IoT Livestock Tracking Platform

A commercial-grade, mobile-first React + TypeScript + Tailwind + Firebase
web app for GrazeLink, built to later port into a React Native mobile app.

## 1. Requirements

- Node.js 18+ and npm
- A free [Firebase](https://console.firebase.google.com/) project

## 2. Install dependencies

```bash
cd grazelink
npm install
```

## 3. Configure Firebase

1. In the Firebase Console, create a project, then add a **Web app**.
2. In the same project, enable **Authentication → Email/Password**.
3. Enable **Firestore Database** (start in test mode for local dev).
4. Copy `.env.example` to `.env` and paste in your web app's config values:

```bash
cp .env.example .env
```

```
VITE_FIREBASE_API_KEY=...
VITE_FIREBASE_AUTH_DOMAIN=...
VITE_FIREBASE_PROJECT_ID=...
VITE_FIREBASE_STORAGE_BUCKET=...
VITE_FIREBASE_MESSAGING_SENDER_ID=...
VITE_FIREBASE_APP_ID=...
```

## 4. Run locally

```bash
npm run dev
```

Open the printed local URL (usually `http://localhost:5173`).

## 5. Build for production

```bash
npm run build
npm run preview
```

## Replace the logo

No logo file was attached to the brief, so `src/assets/images/logo.svg` is a
placeholder mark in your brand colors. Swap in your real GrazeLink logo at
that same path (keep the filename `logo.svg`, or update the import paths in
`Navbar.tsx`, `Hero.tsx`, `Footer.tsx`, `Splash.tsx`, `Login.tsx`,
`Register.tsx`, and `DeviceRegistration.tsx` if you use a different name/format).

## What's wired up vs. left as scaffolding

**Fully wired:**
- Firebase Authentication (register/login/logout)
- Firestore writes for farm profile (on registration) and livestock/collar
  records (on device registration, and delete from the Livestock page)
- All routing, protected dashboard routes, responsive layouts, animations

**Scaffolded with mock/placeholder data (by design — these need your real
backend/device data source):**
- Dashboard Overview stats (`Overview.tsx`) — replace `MOCK_STATS` with a
  live Firestore query or aggregation
- Livestock Management list (`Livestock.tsx`) — replace `MOCK_GOATS` with an
  `onSnapshot` listener on `farms/{uid}/livestock`
- GPS Tracking map (`GPSTracking.tsx`) — replace `MOCK_LOCATIONS` with
  live coordinates from your collar/gateway backend
- Reports export buttons (`Reports.tsx`) — hook up SheetJS/CSV/PDF
  generation to your actual report data
- Contact form (`Contact.tsx`) — currently resets on submit; wire to a
  Firestore `messages` collection or an email API
- "Forgot Password", "Change Password", "Delete Account" buttons in
  Settings/Login are UI-complete but not yet connected to Firebase Auth
  methods (`sendPasswordResetEmail`, `updatePassword`, `deleteUser`)

## Folder structure

```
src/
  assets/        images, icons (logo lives here)
  components/    Navbar, Hero, Footer, Features, Cards, Forms,
                 About, WhyGrazeLink, Contact, Dashboard, ProtectedRoute
  pages/         Splash, Home, Login, Register, DeviceRegistration,
                 Dashboard (Overview, Livestock, GPSTracking, Reports,
                 Settings, AccountCenter), Legal
  services/      firebase.ts, auth.ts, livestock.ts
  hooks/         useAuth.ts
  context/       AuthContext.tsx
```

## Notes

- Dark mode toggles a `.dark` class on `<html>`; base dark overrides live
  in `src/index.css` — extend per-component dark styles as needed.
- The GPS map uses OpenStreetMap tiles via Leaflet/react-leaflet, no API
  key required.
- Firestore security rules aren't included — add rules restricting each
  farm's documents to their own `uid` before going to production.
