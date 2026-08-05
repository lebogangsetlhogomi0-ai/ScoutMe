# ScoutMe — Complete Project Handoff Summary
_Generated 2026-07-30 · For use in Claude chat (claude.ai)_

---

## CRITICAL SECURITY RULE (PERMANENT)
Never include in any summary, message, or file:
- API keys (Firebase, Gemini, or any service)
- Firebase config values (apiKey, authDomain, storageBucket, etc.)
- GitHub Personal Access Tokens (PAT)
- Passwords or secrets of any kind
- .env file contents

Safe placeholders to use:
- Gemini API key → `[STORED IN .env as VITE_GEMINI_API_KEY]`
- Firebase config → `[STORED IN src/firebase.ts — project: scoutme-10]`
- GitHub PAT → `[USER WILL PROVIDE WHEN NEEDED]`

---

## 1. PROJECT STATUS

| Field | Value |
|---|---|
| **Live URL** | https://scoutme-mu.vercel.app |
| **Landing page** | https://scoutme-mu.vercel.app/landing |
| **GitHub repo** | https://github.com/lebogangsetlhogomi0-ai/ScoutMe |
| **Local path** | `C:\Users\Admin\Downloads\SCOUTME WORKPLACE\scoutme` |
| **Build status** | ✅ Passing — TypeScript clean, Vite build succeeds |
| **Deploy status** | ✅ Live on Vercel (auto-deploy from GitHub `main`) |
| **Firebase project** | scoutme-10 (replaced old inaccessible scoutme-3e4b6) |

---

## 2. TECH STACK

| Layer | Technology | Version |
|---|---|---|
| Framework | React | 19.0.1 |
| Language | TypeScript | 5.8.3 |
| Build tool | Vite | 6.4.x |
| Styling | Tailwind CSS | 4.1.14 |
| Animations | Framer Motion (`motion`) | 12.x |
| Icons | Lucide React | 0.546.0 |
| Auth | Firebase Auth (Email/Password) | 12.14.0 |
| Database | Firebase Firestore | 12.14.0 |
| File storage | Firebase Storage | 12.14.0 |
| AI | Google Gemini (`@google/genai`) | 2.4.0 |
| Server | Express + tsx (dev server) | 4.21.2 |
| Deployment | Vercel | CLI 58.1.0 |
| PWA | Custom service worker (`public/sw.js`) | cache: scoutme-cache-v2 |

---

## 3. ALL SCREENS BUILT

| Screen | File | Description | Status |
|---|---|---|---|
| Onboarding | `src/screens/OnboardingFlow.tsx` | Multi-step signup: role select → profile details → Firebase Auth create account | ✅ Complete |
| Pitch Feed | `src/screens/DigitalPitchFeed.tsx` | Main social feed of player highlight clips with reactions, comments, sharing | ✅ Complete |
| Discover | `src/screens/Discover.tsx` | Search and filter players by position, province, age, rating | ✅ Complete |
| Upload Flow | `src/screens/UploadFlow.tsx` | 5-step video upload with validation, gallery picker, Firebase Storage upload | ✅ Complete |
| Player Profile | `src/screens/PlayerProfile.tsx` | Full player card: stats, highlights, scout reports, career moments, AI analysis | ✅ Complete |
| Neural Scout AI | `src/screens/NeuralScoutAI.tsx` | Gemini AI-powered scouting tool — analyse player and generate structured report | ✅ Complete |
| Club Strategic Intel | `src/screens/ClubStrategicIntel.tsx` | Scout/club-only analytics dashboard: squad gaps, market intel, player recommendations | ✅ Complete |
| News Feed | `src/screens/NewsFeed.tsx` | Football news feed (African football focus) | ✅ Complete |
| Profile Screen | `src/screens/ProfileScreen.tsx` | Logged-in user's own profile: edit details, view own posts | ✅ Complete |

---

## 4. ALL FEATURES BUILT

### ✅ Working Now

**Authentication**
- Real Firebase Email/Password sign-up and sign-in
- Specific error messages: wrong password, no account found, network error, unauthorized domain
- Session persisted in localStorage; survives page refresh
- No demo-mode fallback on auth errors — real errors always surface

**Demo Mode**
- `isDemoMode` is `true` ONLY if the Firebase API key is a placeholder string
- In production (scoutme-10 config in place), `isDemoMode` is always `false`
- Demo mode badge shown in header when active

**Navigation**
- Tab-based (no React Router) — `activeTab` state in `App.tsx`
- **Bottom nav layout (2-1-2):**
  - Scout/Club: PITCH · DISCOVER · ⊕ UPLOAD · SCOUT AI · NEWS
  - Player/Fan: PITCH · DISCOVER · ⊕ UPLOAD · NEWS · PROFILE
- Active tab has role-coloured indicator bar and coloured icon

**Header**
- ScoutMe logo
- Role badge (colour-coded: green=player, gold=scout, blue=club)
- Demo Mode badge (animated pulse, only when demo)
- Profile dropdown menu — **scout and club roles only** — contains: user info, View Profile, Club Intel (green highlighted), Settings, Sign Out
- Notification bell with unread badge and dropdown panel

**Onboarding Flow**
- Role selection (Player, Scout, Club, Fan)
- Profile fields: name, age (no min/max restriction), position, province
- Firebase `createUserWithEmailAndPassword` → writes profile to Firestore `users` collection
- Firestore write is non-blocking (doesn't fail onboarding if Firestore is slow)

**Upload Flow (5 steps)**
- Step 1: Choose content type (Highlight Reel, Match Clip, Training Drill, Full Match) — each shows limits
- Step 2: Gallery picker (opens phone gallery immediately) with full validation:
  - File type: MP4, MOV, AVI, MKV only — error if unsupported
  - Size: max 500MB video / 8MB image — error with tip if exceeded
  - Duration: via HTML5 `video.onloadedmetadata` — error if <5s; warning modal if over type limit
  - Orientation: tip card if horizontal video detected (dismissible, never blocks)
- Step 3: Metadata — caption (200 char), position, league context, province, hashtags, visibility
- Step 4: Thumbnail cover selector + file name/size reminder
- Step 5: Real Firebase Storage upload with animated progress bar, MB counter, ETA, error state with retry, success state
- Collapsible "📱 Get the best quality" tips card visible on all steps

**Video Limits by Type**
- Highlight Reel: 90 sec max
- Match Clip: 5 min max
- Training Drill: 3 min max
- Full Match: 10 min max
- All types: 500MB max, min 5 sec

**Player Profile**
- Stats grid (pace, vision, finishing, etc.)
- Highlight reel embedded
- Scout reports section
- Career moments timeline
- Community rating component
- Talent badges display
- AI scouting button

**Neural Scout AI**
- Gemini API called with player data → structured scouting report
- Report card shareable (Canvas-rendered image via `shareReport.ts`)
- Position benchmarks from `benchmark.ts`

**Club Strategic Intel**
- Only accessible to scout and club roles (via header dropdown)
- Squad gap analysis, market intelligence, player pool recommendations

**PWA**
- Installable as app on Android and iOS (Add to Home Screen)
- Service worker: `public/sw.js`, cache name `scoutme-cache-v2`
- Web app manifest: `public/manifest.json`
- Icons: `public/icon-192.png`, `public/icon-512.png`

**Landing Page** (`/landing`)
- Separate static HTML at `public/landing.html`
- Soccer background video (Pexels free license)
- Animated canvas soccer ball
- Dark gradient overlay
- Sections: Hero, Problem stats, Role cards (Player/Scout/Club/Fan), How It Works, Chelsea validation quote, CTA, Footer
- Tagline: **"TALENT IS EVERYWHERE. OPPORTUNITY ISN'T."**
- No Kasi Silicon branding anywhere

**Branding**
- All "Kasi Silicon" / "KASI SILICON" / "Kasi Silicon NPC" removed from entire app
- Old tagline "From the streets of eKasi to the screens of the world" removed
- Current tagline: "TALENT IS EVERYWHERE. OPPORTUNITY ISN'T."

### 🔶 Partially Built

| Feature | Status |
|---|---|
| Sign Out | Shows toast "Signed out" but does not call `auth.signOut()` — session stays alive |
| Settings screen | Placeholder toast only |
| Payments modal | UI exists (`PaymentsModal.tsx`) but no real payment processor connected |
| Story creator/viewer | Components exist (`StoryCreator.tsx`, `StoryViewer.tsx`) — not clear if wired to nav |
| Digital Agreement modal | Component exists — usage context unclear |
| Community rating | Component exists — unclear if writes to Firestore |
| Verification applications | Type exists in `types.ts` — UI not confirmed complete |

### ❌ Not Yet Built / Needs Work

- Real sign-out (call `auth.signOut()` and clear localStorage session)
- Firestore security rules (currently in test mode — 30-day window, expires)
- Firebase Storage security rules (also test mode)
- Real payment integration
- Push notifications
- Video trimming (UI exists in old version; removed in current rewrite)
- Profile photo upload (image picker/upload not wired)

---

## 5. RECENT CHANGES (Last Session)

| Change | File(s) Modified |
|---|---|
| Moved gallery file picker to Step 2 of upload (was buried in Step 4) | `src/screens/UploadFlow.tsx` |
| Added file type validation (MP4/MOV/AVI/MKV only) | `src/screens/UploadFlow.tsx` |
| Added file size validation (500MB video / 8MB image) | `src/screens/UploadFlow.tsx` |
| Added duration check via HTML5 metadata | `src/screens/UploadFlow.tsx` |
| Added orientation tip card for horizontal videos | `src/screens/UploadFlow.tsx` |
| Added duration warning modal with "Upload Anyway" option | `src/screens/UploadFlow.tsx` |
| Upload progress now shows MB counter + ETA | `src/screens/UploadFlow.tsx` |
| Added error state with retry button | `src/screens/UploadFlow.tsx` |
| Added collapsible tips card on all steps | `src/screens/UploadFlow.tsx` |
| Added content type limit info to Step 1 grid | `src/screens/UploadFlow.tsx` |
| Fixed profile dropdown to only show for scout/club (not player/fan) | `src/components/Header.tsx` |
| Added PROFILE tab back to player/fan bottom nav (2-1-2 restored) | `src/components/BottomNav.tsx` |

---

## 6. OUTSTANDING ISSUES

### Bugs

| Bug | Notes |
|---|---|
| Sign out doesn't actually sign out | `auth.signOut()` not called; localStorage session not cleared |
| App may show demo mode briefly on first load | Cached localStorage from old demo sessions; clear site data fixes it |
| Firestore security rules expire | Currently in test mode (allow all reads/writes for 30 days from project creation) |
| Firebase Storage rules expire | Same — test mode only |

### Not Yet Built

- Real sign-out flow
- Profile photo upload
- Video trimming inside the app
- Real payment gateway (Stripe / PayFast / Yoco)
- Push notifications (FCM)
- Admin/moderation panel
- Player verification badge flow (types exist, UI unclear)
- Email verification after sign-up

---

## 7. ARCHITECTURE

### State Management
- **Single context**: `src/context/AppContext.tsx` — all global state in `AppProvider`
- Consumed everywhere via `useApp()` hook
- Key state: `currentUser`, `users`, `posts`, `scoutReports`, `news`, `shortlist`, `notifications`, `ratings`
- Session persisted in `localStorage` (with in-memory fallback for iframe/sandbox environments)

### Routing
- **No React Router** — custom tab-based navigation
- `activeTab` string state in `App.tsx` controls which screen renders
- Tab values: `"pitch"`, `"discover"`, `"upload"`, `"scout-ai"`, `"club-intel"`, `"news"`, `"profile"`
- Deep navigation (e.g. opening a player profile) uses local state: `focusedPlayerId`
- Landing page (`/landing`) is a separate static HTML file — not part of the React app

### Firebase Connection (`src/firebase.ts`)
- Firebase project: **scoutme-10**
- Config: [STORED IN src/firebase.ts]
- `isDemoMode` = `true` only if `apiKey` is missing or contains "Mock"/"placeholder"
- Exports: `auth`, `db`, `storage`, `isDemoMode`
- Auth: Email/Password enabled in Firebase Console
- Firestore: Standard mode, europe-west1, test rules (30-day window)
- Storage: test rules (30-day window)
- Authorized domains: `scoutme-mu.vercel.app` (must be in Firebase Console → Auth → Settings)

### Gemini AI (`src/screens/NeuralScoutAI.tsx`)
- Uses `@google/genai` SDK
- API key: [STORED IN .env as VITE_GEMINI_API_KEY]
- Called client-side with player data to generate structured scouting reports
- Helper utilities: `src/utils/benchmark.ts` (position benchmarks), `src/utils/shareReport.ts` (Canvas report card)

### Deploy Command (safe to run)
```
npx vercel deploy --prod --yes
```
Run from: `C:\Users\Admin\Downloads\SCOUTME WORKPLACE\scoutme`

Auto-deploy also triggers on every `git push origin main`.

### Vercel Config (`vercel.json`)
```json
{
  "buildCommand": "vite build",
  "outputDirectory": "dist",
  "framework": "vite",
  "rewrites": [
    { "source": "/landing", "destination": "/landing.html" },
    { "source": "/((?!api/).*)", "destination": "/index.html" }
  ]
}
```

---

## 8. NEXT PRIORITIES (in order)

1. **Fix sign-out** — call `auth.signOut()`, clear localStorage `scoutme_user` key, redirect to onboarding
2. **Write Firestore security rules** — before the 30-day test window expires; rules should allow users to read/write only their own data
3. **Write Firebase Storage security rules** — allow authenticated users to upload to `videos/{userId}/` only
4. **Profile photo upload** — image picker on profile screen → upload to Storage → update Firestore profile
5. **Email verification** — send verification email after sign-up; optionally gate some features behind verified status
6. **Real payment integration** — connect Yoco or PayFast (South African focus) to the existing `PaymentsModal.tsx`
7. **Video trimming** — in-app trim tool (was partially built, removed in upload rewrite)
8. **Push notifications** — Firebase Cloud Messaging (FCM) for scout views, new followers, etc.
9. **Firestore real-time feed** — wire `DigitalPitchFeed.tsx` to live Firestore `posts` collection (currently uses mock data)
10. **Admin panel** — content moderation, verification approvals, user management

---

## 9. KEY FILES

| File | Purpose |
|---|---|
| `src/App.tsx` | Root component; tab routing; PaymentsModal; deep nav state |
| `src/context/AppContext.tsx` | ALL global state; Firebase Auth sign-in/sign-up; Firestore reads/writes |
| `src/firebase.ts` | Firebase init; exports `auth`, `db`, `storage`, `isDemoMode` |
| `src/types.ts` | All TypeScript interfaces: UserProfile, PostHighlight, ScoutReport, etc. |
| `src/screens/OnboardingFlow.tsx` | Multi-step registration; creates Firebase Auth user + Firestore profile |
| `src/screens/UploadFlow.tsx` | 5-step upload with validation, Storage upload, progress tracking |
| `src/screens/NeuralScoutAI.tsx` | Gemini AI scouting report generator |
| `src/screens/ClubStrategicIntel.tsx` | Scout/club analytics dashboard |
| `src/screens/PlayerProfile.tsx` | Full player profile card |
| `src/screens/DigitalPitchFeed.tsx` | Main social feed |
| `src/components/Header.tsx` | App header; profile dropdown (scout/club only); notifications |
| `src/components/BottomNav.tsx` | 2-1-2 tab bar; role-aware (scout/club vs player/fan) |
| `src/components/Toast.tsx` | Global toast notification system (`useToast()` hook) |
| `src/utils/benchmark.ts` | Position benchmark data for AI scouting reports |
| `src/utils/shareReport.ts` | Canvas-renders a shareable scout report card image |
| `public/landing.html` | Standalone soccer-themed marketing landing page |
| `public/sw.js` | PWA service worker (cache: scoutme-cache-v2) |
| `public/manifest.json` | PWA web app manifest |
| `vercel.json` | Vercel build config + URL rewrites |

---

## COLOUR SYSTEM (Role-coded UI)

| Role | Primary Colour | Used For |
|---|---|---|
| Player | `#00e56b` (green) | Active tabs, badges, accents |
| Scout | `#f5c518` (gold) | Active tabs, badges, accents |
| Club | `#4da6ff` (blue) | Active tabs, badges, accents |
| Background | `#050e08` (near-black green) | App shell |
| Surface | `#0a1a0f` | Cards, panels |
| Border | `#1a3825` | Dividers |
| Muted text | `#5a8a6a` | Labels, hints |
| Body text | `#e8f5ee` | Main readable text |

---

## FONT SYSTEM

- **`font-bebas`** — Bebas Neue — headings, screen titles, score displays
- **`font-sans`** — system sans-serif — body text, labels
- **`font-mono`** — monospace — metadata, timestamps, codes

---

_End of handoff summary. No sensitive values included._
