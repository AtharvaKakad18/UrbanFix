# UrbanFix — Citizen Collaboration Platform for Urban Mobility Problems

> A modern civic-tech platform empowering citizens and municipal authorities to collaboratively report, verify, prioritize, and resolve urban road defects, waterlogging hazards, and pedestrian obstructions. Powered by multi-modal AI cross-validation and geospatial duplicate clustering.

---

## 🌟 Key Features

- **Multi-Modal AI Pipeline**:
  - Image preprocessing with **Sharp** (auto-rotates, strips private EXIF GPS metadata, converts to JPEG, max 1280px, computes 64-bit perceptual hash).
  - Multi-stage **xAI Grok Vision & Text Analysis** (strict JSON extraction, zero-store policy on imagery, automated fallback model).
  - Backend cross-validation matching citizen wording with detected imagery features.
  - Automatic status assignment: `AI Verified`, `Verification Required` (for category/text discrepancies or low confidence), or `Manual Verification Required`.
- **Intelligent Duplicate Clustering Engine**:
  - Native MongoDB **2dsphere geospatial index** (`$near` within 40 meters).
  - Multi-factor similarity scoring: `0.4 * proximity + 0.3 * text Jaccard + 0.3 * pHash Hamming distance`.
  - Automatic cluster aggregation with combined photo galleries and supporter upvote counts.
  - Double submission prevention (blocks duplicate photos submitted by same user within 10 minutes).
- **Dynamic Priority Engine (0 to 100)**:
  - Computed from safety hazard risk, severity, duplicate group count, citizen confirmations/upvotes, aging days, and proximity to schools, hospitals, or major transit junctions.
  - Mapped into semantic priority bands: `Low`, `Medium`, `High`, `Critical`.
  - Admin-calibrated weights and nightly cron recalculation.
- **Strict Status State Machine (One-File Transition Validator)**:
  - Enforces valid municipal workflows: `Reported` → `AI Verified` / `Verification Required` → `Department Assigned` → `Work Started` → `Resolved` → `Citizen Verification` → `Closed`.
  - Rejection with audit remarks, and reopening on recurring problems.
  - Returns HTTP `409 Conflict` on illegal state jumps.
- **Department Operations & Kanban Board**:
  - Filterable table view and visual Kanban board by status.
  - Detail drawer with AI classification card, defect coordinates, and duplicate sibling reports.
  - Work actions: Staff assignment, Start work, Progress updates with remarks, and Resolution submission with before/after photos.
- **Citizen Accountability & Interactive Before/After Slider**:
  - Interactive visual slider allowing citizens to drag a divider comparing the initial problem against the department repair.
  - Citizen resolution verification: Reporter accepts or rejects the fix (with auto-closure after configurable N days).
- **Executive Admin Console & Recharts Visualizations**:
  - Incident reporting velocity line chart (past 14 days).
  - Defects by category bar chart.
  - Department workload & closure rates.
  - AI confidence distribution breakdown.
  - Hotspots density map and AI discrepancy audit tables.
  - Admin management tabs for Users, Departments, Categories, Priority Rules, and Duplicate Groups (Merge/Split tools).
- **Admin Assignment Queue & Dynamic Routing Controls**:
  - Unassigned civic reports enter the Admin "Assignment Queue" tab with AI suggested department chips.
  - 1-click "Accept Suggestion" shortcut, manual assignment to any civic department or Police, bulk assignment, and "Pull back to Queue" (unassign).
  - Department staff reassignment request workflow with approval/decline review.
  - Master Police Auto-Routing toggle switch and category-level `routeToPolice` checkboxes.
- **Dedicated Police Dashboard (`/police`) & Auto-Routing**:
  - Reports in police categories (Vehicle Blocking Footpath, No Parking, Traffic Accident, Road Blockage, Broken Traffic Signal) auto-route directly when AI Verified.
  - Verification-needed police reports enter Admin queue flagged for review.
  - Incoming Cases table highlighting critical Traffic Accident and Road Blockage cases at the top with KPI counters.
  - Case Drawer operations: Acknowledge, Dispatch to officer, Progress updates, Record Action Taken (vehicle cleared, towed, challan issued, signal reported), Resolve with before/after photos, Reopen, and "Not a police matter" (returns ticket to Admin queue with reason).
  - Hotspot Map and Patrol Roster views.
- **Audited Soft-Delete & Trash Bin Purge**:
  - Admin soft-deletes reports with mandatory justification reason.
  - Soft-deleted reports are globally excluded from regular queries, citizen feed, maps, duplicate clustering, and statistics via Mongoose middleware.
  - "Trash Bin" tab allows 1-click Restore or Permanent Deletion (with typed "DELETE" safety confirmation and Cloudinary image destruction).

---

## 🛠️ Fixed Tech Stack

- **Frontend**: React 18, Vite, Tailwind CSS (Custom civic palette, dark mode), React Router DOM v6, @tanstack/react-query, Axios, React Hook Form + Zod, React-Leaflet + Leaflet, Recharts, Lucide React, Sonner (toasts).
- **Backend**: Node.js (ES Modules), Express v5, Mongoose, MongoDB Atlas (or local Docker MongoDB), JWT + bcryptjs, Helmet, CORS, Express-Rate-Limit, Multer (Memory Storage), Sharp, Cloudinary SDK, Morgan, Node-Cron, Zod.
- **AI**: xAI Grok API (`grok-4.7` Vision + Text with `grok-4.3` Fallback).
- **Maps**: Leaflet + OpenStreetMap with backend Geocoder Proxy (Nominatim with 1 req/sec rate limit & in-memory cache).
- **Media**: Cloudinary (photos only: JPEG, PNG, WebP, HEIC). Built-in local disk fallback for zero-setup local development.

---

## 📁 Monorepo Folder Structure

```
.
├── client/                     # Frontend (React + Vite + Tailwind CSS)
│   ├── public/                 # Static assets
│   ├── src/
│   │   ├── components/         # Reusable Component Library
│   │   │   ├── badges/         # StatusBadge, PriorityBadge, CategoryChip, ConfidenceMeter
│   │   │   ├── ui/             # StatCard, DataTable, FilterBar, Skeleton, EmptyState, ConfirmDialog
│   │   │   ├── stepper/        # ProgressStepper (4-step Creation & 6-step Lifecycle)
│   │   │   ├── media/          # ImageUploader, BeforeAfterSlider
│   │   │   ├── map/            # MapView, LocationPicker
│   │   │   └── layout/         # Navbar, BottomNav, Sidebar, NotificationBell
│   │   ├── context/            # AuthContext, ThemeContext
│   │   ├── pages/              # 13 Complete Application Pages
│   │   ├── router/             # ProtectedRoute with role guards
│   │   ├── services/           # Axios API client
│   │   ├── utils/              # Constants & helper formulas
│   │   ├── App.jsx             # Shell layout & router
│   │   ├── index.css           # Tailwind base + custom design tokens
│   │   └── main.jsx
│   ├── tailwind.config.js
│   ├── vercel.json             # Vercel SPA rewrite
│   ├── .env.example
│   └── package.json
│
├── server/                     # Backend (Node.js + Express + Mongoose)
│   ├── public/uploads/         # Local fallback photo storage
│   ├── src/
│   │   ├── config/             # DB connection with auto-retry
│   │   ├── constants/          # Fixed categories, statuses, priorities, roles
│   │   ├── models/             # Mongoose schemas (User, Report, Department, DuplicateGroup, etc.)
│   │   ├── middleware/         # auth (JWT), roleCheck, rateLimiter, errorHandler, multer
│   │   ├── services/           # aiPipeline, priorityEngine, duplicateEngine, stateMachine, geocoder
│   │   ├── controllers/        # Express route handlers
│   │   ├── routes/             # REST API routers prefix /api/v1
│   │   ├── scripts/            # Database seed script & automated smoke test
│   │   ├── server.js           # Express bootstrap & nightly cron jobs
│   │   └── app.js              # Express app setup, helmet, cors
│   ├── render.yaml             # Render deployment configuration
│   ├── .env.example
│   └── package.json
│
├── package.json                # Root monorepo scripts
├── DEPLOYMENT.md               # Step-by-step production deployment guide
└── README.md
```

---

## ⚡ Quick Start (Run Locally in Two Commands)

### Prerequisites
- Node.js v18+ and npm
- Docker running (for local MongoDB on port 27017) OR a MongoDB Atlas connection string.

### 1. Install & Seed Database
```bash
# In project root:
cd server && npm install
npm run seed
```

### 2. Run Both Frontend & Backend
You can run both concurrently from the project root:
```bash
# Terminal 1: Start Backend (Port 5000)
cd server && npm run dev

# Terminal 2: Start Frontend (Port 5173)
cd client && npm run dev
```

Open your browser at **`http://localhost:5173`**.

---

## 🔑 Demo Login Credentials

| Role | Name | Email | Password | Scope / Department | Portal URL |
|---|---|---|---|---|---|
| **Citizen** | Aarav Sharma | `citizen1@urbanfix.org` | `UrbanFix123!` | Citizen Reporter (Trust Score 95%) | `/login` |
| **Citizen** | Maya Patel | `citizen2@urbanfix.org` | `UrbanFix123!` | Citizen Reporter (Trust Score 98%) | `/login` |
| **Admin** | Elena Vance | `admin@urbanfix.org` | `UrbanFix123!` | Municipal Command, Assignment Queue & Rules | `/admin/login` |
| **Police Officer** | Insp. Vikram Patil | `officer.patil@urbanfix.org` | `UrbanFix123!` | Pune Traffic Div (Badge #1042) | `/police/login` |
| **Police Officer** | Officer Deshmukh | `officer.deshmukh@urbanfix.org` | `UrbanFix123!` | Shivajinagar Station (Badge #1088) | `/police/login` |
| **Staff** | Marcus Roadman | `marcus.road@urbanfix.org` | `UrbanFix123!` | Road Infrastructure Department | `/department/login` |
| **Staff** | David Drain | `david.drainage@urbanfix.org` | `UrbanFix123!` | Municipal Drainage & Water Management | `/department/login` |
| **Staff** | Tom Woods | `tom.tree@urbanfix.org` | `UrbanFix123!` | Urban Forestry & Tree Department | `/department/login` |

> **Portal Access & Role Isolation**:
> - Citizens access their dashboard via `/login` and have **no access or links** to staff, admin, or police portals. Direct visits to `/admin`, `/department`, or `/police` display the 403 Forbidden page.
> - Staff, Admin, and Police log in through dedicated portal tiles on `/login` or via `/admin/login`, `/department/login`, and `/police/login`. Attempting to log into the wrong portal returns a friendly 403 message.
> - Staff and Police accounts cannot self-register; they are created and managed by administrators.

---

## 🧪 Automated End-to-End Smoke Test

Run the automated smoke test script to verify the entire citizen-to-municipal resolution lifecycle:
```bash
cd server
npm run smoke
```

### The Smoke Test verifies:
1. Citizen authentication & JWT issuance.
2. Photo preprocessing with Sharp & perceptual hash calculation.
3. Multi-modal AI analysis & cross-validation.
4. Priority score calculation and department recommendation.
5. Department staff login and work order assignment.
6. State machine transition to `Work Started`.
7. Field progress updates and remarks.
8. Resolution with before and after photo evidence.
9. Citizen verification and closure (`Closed`).
10. State machine illegal transition block (asserting HTTP `409 Conflict`).

---

## 📋 Manual UI Verification Walkthrough

1. **Landing Page**:
   - Visit `http://localhost:5173`.
   - Toggle theme using the Sun/Moon icon in the header.
   - Inspect the live KPI counters, How-It-Works stepper, and Category grid.
2. **Citizen Submission Flow**:
   - Log in as **Citizen (Aarav)**.
   - Click **Report a Problem** (`/report/new`).
   - **Step 1 (Photos)**: Upload 1 or 2 test photos.
   - **Step 2 (Location)**: Check the draggable marker and reverse-geocoded address.
   - **Step 3 (Details)**: Select category "Pothole" and enter description.
   - **Step 4 (Review)**: Submit report.
   - Verify the animated **AI Analysis Result Card** appears with confidence rating and department routing.
3. **Live Map Exploration**:
   - Open `/map`. Filter by category, priority, or hide resolved reports.
   - Click any pin on the map to inspect popup details.
   - Click a card in the side list to center the map on the defect.
4. **Department Resolution Flow**:
   - Log out and log in as **Road Staff (Marcus Roadman)**.
   - Open `/department`. Switch between **Table View** and **Kanban Board**.
   - Click on an assigned defect to open the detail drawer.
   - Click **Start Work** → Click **Mark Resolved** (upload before/after photos).
5. **Citizen Sign-Off Flow**:
   - Log back in as Citizen. Open the resolved report.
   - Interact with the **Before/After Comparison Slider** by dragging the vertical divider.
   - Click **Accept & Close** to verify the report transitions to `Closed`.
6. **Admin Command & Analytics**:
   - Log in as **Admin (Elena)** and open `/admin`.
   - Inspect the Recharts visual graphs, Hotspots map, and AI Quality Audit tables.
   - Switch to the **Priority Rules** tab and test updating formula weights.
   - Switch to the **Duplicate Groups** tab and test the Split Report tool.

---

## ⚙️ Environment Variables Reference

### Backend (`server/.env`)
| Variable | Default Value | Description |
|---|---|---|
| `PORT` | `5000` | Port for Express server |
| `NODE_ENV` | `development` | Environment mode |
| `MONGODB_URI` | `mongodb://127.0.0.1:27017/urbanfix` | Local or Atlas MongoDB connection string |
| `JWT_SECRET` | `super_secret_jwt_key` | 32+ character JWT signing secret |
| `JWT_EXPIRES_IN` | `7d` | Token lifetime |
| `CLIENT_URL` | `http://localhost:5173,http://localhost:3000` | Allowed origins for CORS |
| `XAI_API_KEY` | *(Key)* | xAI Grok API key |
| `GROK_VISION_MODEL` | `grok-4.7` | Primary vision model name |
| `GROK_VISION_FALLBACK_MODEL` | `grok-4.3` | Fallback vision model name |
| `GROK_TEXT_MODEL` | `grok-4.7` | Text classifier model name |
| `AI_MIN_CONFIDENCE` | `0.6` | Minimum confidence threshold |
| `CLOUDINARY_CLOUD_NAME` | *(Name)* | Cloudinary account name |
| `CLOUDINARY_API_KEY` | *(Key)* | Cloudinary API key |
| `CLOUDINARY_API_SECRET` | *(Secret)* | Cloudinary API secret |
| `GEOCODER_BASE_URL` | `https://nominatim.openstreetmap.org` | Geocoder proxy base URL |
| `GEOCODER_USER_AGENT` | `UrbanFix-Platform/1.0 (urbanfix@civictech.local)` | Nominatim required user agent |
| `DUPLICATE_RADIUS_METERS` | `40` | Geospatial cluster radius |
| `AUTO_CLOSE_DAYS` | `3` | Inactivity days before auto-closing resolved tickets |

### Frontend (`client/.env`)
| Variable | Default Value | Description |
|---|---|---|
| `VITE_API_URL` | `http://localhost:5000/api/v1` | URL pointing to backend API v1 endpoint |

---

## 💡 Engineering Assumptions & Design Decisions

1. **Zero-Friction Local Development Storage**:
   - If Cloudinary credentials are not configured or set to placeholder in `.env`, the server automatically saves processed photos to `server/public/uploads` and serves them statically. This ensures the app is 100% functional out of the box.
2. **AI Fallback Resilience**:
   - If an xAI API key is omitted, times out, or returns an error, the backend gracefully activates the heuristic analyzer and marks the report status as `Manual Verification Required`. The report is saved, priority is calculated, and dispatches proceed without crashing.
3. **Nominatim Fair Use Compliance**:
   - To adhere to OpenStreetMap Nominatim usage policies, the backend geocoder proxy enforces a mandatory 1 request per 1050ms throttle queue and maintains an in-memory LRU cache of recent coordinates and queries.
4. **Photos-Only Policy**:
   - In accordance with municipal civic-tech best practices, video uploads, video encoding, and ffmpeg dependencies are strictly excluded to minimize bandwidth, storage costs, and review overhead.
5. **Cold-Start Awareness**:
   - Render's free tier spins down web services after 15 minutes of inactivity. The frontend includes an automatic ping to `/health` with a lightweight, non-intrusive alert informing users if the cloud instance is spinning up.

---

## 📜 License

MIT License. Developed for municipal transparency and civic collaboration.
# UrbanFix
