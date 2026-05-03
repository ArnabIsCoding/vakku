# VoteIQ (Vakku) — Election Process Education

> **Know before you vote.** Data-driven election education for Indian voters, powered by Gemini AI and Google Cloud.

---

## Table of Contents

1. [Project Overview](#project-overview)
2. [Features](#features)
3. [Tech Stack and Google Services](#tech-stack-and-google-services)
4. [Architecture](#architecture)
5. [Getting Started](#getting-started)
6. [Environment Setup](#environment-setup)
7. [Firebase Functions (Python)](#firebase-functions-python)
8. [Deployment](#deployment)
9. [Security & Rate Limiting](#security--rate-limiting)
10. [Accessibility](#accessibility)
11. [Project Structure](#project-structure)

---

## Project Overview

VAKKU is an interactive, AI-powered election education platform that helps Indian voters understand:

- **What actually happens** when the ruling party stays vs. when power changes hands — based on real historical development data.
- **When to go vote** to avoid queues — using historical hourly turnout patterns.
- **How the voter roll has changed** since the last election of the same type.

The UI follows a bold, high-contrast "Neon Pop Art" design system inspired by SICK Agency — fiery orange backgrounds, electric yellow headlines, shocking blue CTAs — conveying urgency and civic energy.

---

## Features

### Feature 1 — Party Consequence Analysis
Select your state and election type (Lok Sabha / Vidhan Sabha). Gemini AI analyses historical ECI records to show three scenarios:

| Scenario | What it means |
|---|---|
| **Ruling Party Stays** | Historic avg. GDP delta, infra score, social index if the incumbent wins |
| **Party Flip** | Same metrics when the opposition takes power |
| **Abstain / Don't Vote** | Effect of low-turnout elections on development outcomes |

Results are visualised with radar charts and bar charts (Recharts). Responses are cached in Firestore (24-hour TTL) to minimise Gemini API calls and reduce latency for repeat queries.

### Feature 2 — Best Time to Vote
Enter your state (and optionally your constituency). Gemini AI generates an hourly crowd forecast (7 AM to 6 PM) based on historical turnout patterns, highlighting the optimal slot with a large display time and a contextual pro-tip. An area chart and bar grid visualise crowd levels across the day.

### Feature 3 — Voter Population Trends
Track how the registered voter roll has changed across every election of the chosen type in a state. Shows total registered voters, new additions, deleted entries, net change, and actual turnout %. Three line charts cover all trends over time. 30-day Firestore cache since historical data rarely changes.

### Feature 4 — Firebase Authentication
Google Sign-In via `signInWithPopup` on all platforms (mobile-safe; avoids Safari ITP / iOS storage partitioning issues with redirect flows)[cite: 3]. User preferences are persisted to Firestore and restored on the next login. Unauthenticated access is restricted via React Router guard components[cite: 5, 6].

---

## Tech Stack and Google Services

| Layer | Technology |
|---|---|
| Frontend | React 18 + TypeScript (Vite) |
| Routing | React Router v6 |
| Charts | Recharts |
| Auth | Firebase Authentication (Google Sign-In) |
| Database | Cloud Firestore (caching + rate limits) |
| Functions | Firebase Cloud Functions (Gen 2, Python 3.14) |
| AI | Vertex AI — Gemini 2.5 Flash (via `google-genai` SDK) |
| Hosting | Firebase Hosting |
| Region | `asia-south1` (Mumbai) — low latency for Indian users |

**Why these Google services:**

- **Gemini 2.5 Flash via Vertex AI** — Extremely fast inference for structured JSON responses[cite: 2], ideal for parsing complex Indian electoral data.
- **Firebase Functions (Python)** — Keeps Vertex AI calls server-side, handles caching logic, and enforces daily usage quotas[cite: 2].
- **Cloud Firestore** — TTL-based caching dramatically reduces API costs and latency for repeated queries. Also serves as the authoritative ledger for user rate-limiting[cite: 2, 3].
- **Firebase Hosting** — Global CDN, automatic SSL, single-command deploy, SPA rewrite rules.
- **Firebase Auth** — Zero-friction Google Sign-In with an automatic fallback mechanism for aggressive popup blockers[cite: 3].

---

## Architecture

```text
Firebase Hosting (CDN)
  React SPA — Static Assets
        |
Firebase Authentication (Google)
  signInWithPopup -> AuthContext State
        |
Firebase Cloud Functions (asia-south1, Python)
  analyse_party_consequences  ->  Firestore rate limit check
  get_best_voting_time        ->  Firestore cache check
  get_voter_trends            ->  if miss -> Vertex AI Gemini
        |                           parse JSON -> cache -> return
      /   \
Firestore   Vertex AI Gemini 2.5 Flash
(Cache/DB)  (Structured JSON, historical ECI data)
```

---

## Getting Started

### Prerequisites

- Node.js 20+ (for frontend)
- Python 3.10+ (for backend)
- Firebase CLI: `npm install -g firebase-tools`
- A Google Cloud / Firebase project with:
  - Authentication (Google provider enabled)
  - Firestore (Native mode, deployed in `asia-south1`)
  - Cloud Functions API enabled
  - Vertex AI API enabled in Google Cloud Console

### Installation

```bash
# 1. Clone the repository
git clone https://github.com/your-username/election-edu.git
cd election-edu

# 2. Install frontend dependencies
npm install

# 3. Set up Python backend environment
cd functions
python -m venv venv
source venv/bin/activate  # (or venv\Scripts\activate on Windows)
pip install -r requirements.txt
cd ..

# 4. Set up environment variables
cp .env.example .env.local
# Edit .env.local with your Firebase project values
```

---

## Environment Setup

Edit `.env.local` with your Firebase project config. Never commit this file to version control.

```env
REACT_APP_FIREBASE_API_KEY=your_api_key_here
REACT_APP_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
REACT_APP_FIREBASE_PROJECT_ID=your_project_id
REACT_APP_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
REACT_APP_FIREBASE_MESSAGING_SENDER_ID=123456789
REACT_APP_FIREBASE_APP_ID=1:123456789:web:abcdef
REACT_APP_FIREBASE_MEASUREMENT_ID=G-XXXXXXXXXX
```

---

## Firebase Functions (Python)

Three callable functions, all written in Python and deployed to `asia-south1`[cite: 2]:

### `analyse_party_consequences`
**Input:** `{ state, electionType, clientId? }`
**Output:** `{ ruling, opposition, abstain, dataNote }`
**Cache:** 24 hours per state+type combination.

### `get_best_voting_time`
**Input:** `{ state, constituency?, clientId? }`
**Output:** `{ recommendedSlot, hourlyData[11], tip, basedOn }`
**Cache:** 7 days.

### `get_voter_trends`
**Input:** `{ state, electionType, clientId? }`
**Output:** `{ snapshots[], latestYear, previousYear, summary, source }`
**Cache:** 30 days.

---

## Deployment

```bash
# Build the Vite frontend
npm run build

# Deploy everything
firebase deploy --project vakku-2980f

# Partial deploys
firebase deploy --only hosting
firebase deploy --only functions
firebase deploy --only firestore:rules
```

---

## Security & Rate Limiting

To prevent API abuse and control Vertex AI costs, VoteIQ implements a strict, dual-layer rate-limiting system[cite: 2, 3]:

| User State | Daily Limit | Tracking Method |
|---|---|---|
| **Anonymous** | 1 AI Call / Day | Frontend `clientId` UUID passed to Firestore |
| **Authenticated** | 5 AI Calls / Day | Firebase Auth UID verified by Cloud Functions |

**Additional Security:**
- **Server-Side AI:** Vertex AI credentials (`google-genai`) are executed entirely within the Python Cloud Functions[cite: 2]. Keys are never exposed to the client.
- **Route Guards:** Frontend routes are protected by a `ProtectedRoute` wrapper component[cite: 5, 6].

---

## Accessibility

- Semantic HTML throughout (nav, main, header, footer, section, article).
- All interactive elements carry `aria-label`, `aria-pressed`, `aria-expanded`, `aria-busy`, `aria-selected`.
- Chart regions use `role="region"` with `aria-label`; bar indicators use `role="meter"`.
- Colour contrast: white on fiery orange meets WCAG AA (4.5:1+); yellow on black exceeds AAA (8:1+).

---

## Project Structure

```text
## Project Structure

vakku/
├── public/
│   ├── favicon.ico
│   └── index.html
├── src/
│   ├── components/
│   │   ├── ElectionControls.tsx + .css
│   │   ├── Navbar.tsx + .css
│   │   ├── ProtectedRoute.tsx
│   │   └── ScrollToTop.tsx
│   ├── constants/
│   │   └── india.ts
│   ├── context/
│   │   └── AuthContext.tsx
│   ├── hooks/
│   │   ├── useFunction.ts
│   │   └── useUserPreferences.ts
│   ├── models/
│   │   └── UserModel.ts
│   ├── pages/
│   │   ├── BestTimePage.tsx + .css
│   │   ├── ConsequencesPage.tsx + .css
│   │   ├── HomePage.tsx + .css
│   │   ├── SignInPage.tsx + .css
│   │   └── VoterTrendsPage.tsx + .css
│   ├── styles/
│   │   └── globals.css
│   ├── App.tsx
│   ├── firebase.ts
│   ├── index.tsx
│   └── react-app-env.d.ts
├── functions/
│   ├── .gitignore
│   ├── firebase.json
│   ├── main.py
│   └── requirements.txt
├── .env
├── .gitignore
├── firebase.json
├── firestore.indexes.json
├── firestore.rules
├── package-lock.json
├── package.json
├── tsconfig.json
└── README.md
```

---

*Made with love for informed democracy.*
