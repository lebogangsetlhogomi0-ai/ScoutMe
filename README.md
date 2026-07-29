# ScoutMe — AI-Powered Football Scouting Platform
### Kasi Silicon NPC · Founder: Lebo
### "From the streets of eKasi — to the screens of the world." 🇿🇦⚽

---

## QUICK START (3 steps)

```bash
# 1. Install dependencies
npm install

# 2. Start the app
npm run dev

# 3. Open in browser
# http://localhost:3000
```

**Login with any email and password** — Demo Mode is active.

---

## FULL SETUP

### Step 1 — Install Node.js (if not installed)
Download from: https://nodejs.org (choose LTS version)

### Step 2 — Install dependencies
```bash
npm install
```

### Step 3 — Set up environment
```bash
cp .env.example .env
```
Edit `.env` and add your Gemini API key (get from https://aistudio.google.com/app/apikey)

### Step 4 — Connect Firebase (optional for live auth)
Follow the instructions in `src/firebase.ts` to replace placeholder config values.
Without Firebase, the app runs in Demo Mode — any email/password works.

### Step 5 — Start development server
```bash
npm run dev
```

---

## PLAYWRIGHT TESTING

### Install Playwright (first time only)
```bash
npm install --save-dev @playwright/test
npx playwright install
```

### Run all tests
```bash
npx playwright test
```

### Run with browser visible
```bash
npx playwright test --headed
```

### Run interactive UI mode
```bash
npx playwright test --ui
```

### Run mobile tests only
```bash
npx playwright test --project="Mobile Chrome (Pixel 7)"
```

### View test report
```bash
npx playwright show-report
```

---

## TEST COVERAGE

| Test File | What It Tests |
|-----------|--------------|
| 01-splash-auth | Splash screen, login, role selection, Demo Mode |
| 02-digital-pitch-feed | Feed loading, seed players, votes, profile opening |
| 03-discover | Search, filters, player grid, trending |
| 04-player-profile | Profile sections, ratings, badges, navigation |
| 05-neural-scout-ai | Report generation, benchmarks, Scout AI tab |
| 06-navigation | Tab switching, sign out, news, upload |
| 07-mobile-responsive | 390px/360px layouts, touch targets, font sizes |
| 08-digital-agreement | Agreement display, legal terms |
| 09-club-intel | Dashboard, stats, shortlist, positions demand |
| 10-performance | Load time, console errors, stability |

---

## ARCHITECTURE

```
scoutme/
├── src/
│   ├── App.tsx                  # Main app router
│   ├── firebase.ts              # Firebase + Demo Mode
│   ├── types.ts                 # TypeScript interfaces
│   ├── index.css                # Global styles + Tailwind
│   ├── context/
│   │   └── AppContext.tsx       # Global state management
│   ├── components/
│   │   ├── BottomNav.tsx        # Role-based navigation
│   │   ├── Header.tsx           # Top bar + notifications
│   │   ├── CommunityRating.tsx  # Star rating system
│   │   ├── TalentBadges.tsx     # 12 talent badges
│   │   ├── DigitalAgreementModal.tsx
│   │   └── PaymentsModal.tsx
│   ├── screens/
│   │   ├── OnboardingFlow.tsx   # Splash → Role → Register
│   │   ├── DigitalPitchFeed.tsx # Main feed
│   │   ├── Discover.tsx         # Search + filters
│   │   ├── PlayerProfile.tsx    # Full player view
│   │   ├── NeuralScoutAI.tsx    # AI report generation
│   │   ├── ClubStrategicIntel.tsx
│   │   ├── NewsFeed.tsx
│   │   ├── UploadFlow.tsx
│   │   └── ProfileScreen.tsx
│   └── utils/
│       ├── benchmark.ts         # Position benchmark system
│       └── shareReport.ts       # Canvas report card generator
├── public/
│   ├── manifest.json            # PWA config
│   └── sw.js                    # Service Worker
├── tests/                       # Playwright test suite (10 files)
├── playwright.config.ts
└── server.ts                    # Express + Gemini API proxy
```

---

## BRAND

| Element | Value |
|---------|-------|
| Background | #050e08 |
| Card | #0a1a0f |
| Green (Players) | #00e56b |
| Gold (Scouts) | #f5c518 |
| Blue (Fans) | #4da6ff |
| Headline Font | Bebas Neue |
| Body Font | Inter |

---

## COMPETITION
**Fabrizio Romano x Emergent — $100,000 Prize Pool**
Deadline: July 5th
Drive upvotes: share your Emergent link everywhere

---

*ScoutMe · Kasi Silicon NPC · Built in South Africa 🇿🇦*
*From the streets of eKasi — to the screens of the world.*
