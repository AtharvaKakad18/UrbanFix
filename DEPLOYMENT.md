# UrbanFix — Production Deployment Guide

This guide provides exact, step-by-step instructions for taking **UrbanFix (Citizen Collaboration Platform for Urban Mobility Problems)** to production using:
- **MongoDB Atlas** (Cloud Database with native 2dsphere Geospatial Indexing)
- **Cloudinary** (Photo Media Storage)
- **Render** (Node.js Express Backend Web Service)
- **Vercel** (React Vite Frontend Static SPA)

---

## Deployment Order Overview
1. **Step 1: MongoDB Atlas** (Database cluster setup, user, and IP allowlist)
2. **Step 2: Cloudinary** (Photo storage credentials and preset)
3. **Step 3: Render** (Deploy backend web service from GitHub)
4. **Step 4: Vercel** (Deploy frontend Vite app from GitHub)
5. **Step 5: Link Environments** (Configure `CLIENT_URL` on Render with Vercel domain)
6. **Step 6: Database Seeding** (Run remote seed script to populate demo data)
7. **Step 7: Verification Smoke Test** (End-to-end check checklist)

---

## Step 1: MongoDB Atlas Setup

1. **Sign Up / Log In**: Navigate to [mongodb.com/cloud/atlas](https://www.mongodb.com/cloud/atlas).
2. **Create a Free Cluster**:
   - Click **Create Deployment** → Select **M0 Free Tier**.
   - Choose a cloud provider (e.g., AWS) and region closest to your users.
   - Name your cluster (e.g., `urbanfix-cluster`) and click **Create**.
3. **Configure Database Access (User Credentials)**:
   - In the left sidebar, click **Security** → **Database Access**.
   - Click **Add New Database User**.
   - Choose **Password Authentication**.
   - Enter a username (e.g., `urbanfix_admin`) and a strong password. Save these securely.
   - Set privileges to **Read and write to any database**. Click **Add User**.
4. **Configure Network Access (IP Allowlist)**:
   - In the left sidebar, click **Security** → **Network Access**.
   - Click **Add IP Address**.
   - For demo deployment with Render and cloud containers, select **Allow Access from Anywhere** (`0.0.0.0/0`).
     > *Note for Production: While `0.0.0.0/0` is convenient for student demos, in corporate production restrict access to specific static IP addresses or VPC peering.*
   - Click **Confirm**.
5. **Obtain Connection String**:
   - Go to **Database** → Click **Connect** on your cluster.
   - Choose **Drivers** (Node.js).
   - Copy the SRV connection string:
     ```
     mongodb+srv://<username>:<password>@urbanfix-cluster.xxxx.mongodb.net/urbanfix?retryWrites=true&w=majority
     ```
   - Replace `<username>` and `<password>` with your credentials, ensuring the database name `/urbanfix` is appended before query parameters.

---

## Step 2: Cloudinary Setup (Photos Only)

1. **Sign Up / Log In**: Navigate to [cloudinary.com](https://cloudinary.com).
2. **Retrieve API Credentials**:
   - From your Cloudinary Dashboard / Settings page, locate the **Product Environment Credentials**:
     - **Cloud Name**: e.g., `urbanfix-media`
     - **API Key**: e.g., `123456789012345`
     - **API Secret**: e.g., `abcdefghijklmnopqrstuvwxyz123`
3. *Note*: UrbanFix processes photos only (JPEG, PNG, WebP, HEIC). Videos are strictly ignored and rejected on both client and server.

---

## Step 3: Deploy Backend on Render

1. **Sign Up / Log In**: Navigate to [render.com](https://render.com).
2. **Create New Web Service**:
   - Click **New +** → **Web Service**.
   - Connect your GitHub repository containing the UrbanFix monorepo.
3. **Configure Web Service Settings**:
   - **Name**: `urbanfix-backend`
   - **Root Directory**: `server`
   - **Environment**: `Node`
   - **Build Command**: `npm install`
   - **Start Command**: `node src/server.js`
   - **Plan**: `Free`
4. **Add Environment Variables** (under Environment tab):
   | Variable | Value | Description |
   |---|---|---|
   | `NODE_ENV` | `production` | Production mode |
   | `PORT` | `10000` | Port automatically assigned by Render |
   | `MONGODB_URI` | `mongodb+srv://...` | MongoDB Atlas connection string from Step 1 |
   | `JWT_SECRET` | `super_secret_jwt_random_string_min_32_chars` | Secure 32+ character key |
   | `JWT_EXPIRES_IN` | `7d` | Token expiry duration |
   | `CLIENT_URL` | `http://localhost:5173` | Temporary value; will update with Vercel URL in Step 5 |
   | `XAI_API_KEY` | `your_xai_grok_key` | xAI API Key for Grok Vision & Text analysis |
   | `GROK_VISION_MODEL` | `grok-4.7` | Primary vision model |
   | `GROK_VISION_FALLBACK_MODEL` | `grok-4.3` | Fallback vision model |
   | `GROK_TEXT_MODEL` | `grok-4.7` | Text classifier model |
   | `AI_MIN_CONFIDENCE` | `0.6` | Minimum confidence threshold |
   | `CLOUDINARY_CLOUD_NAME` | `...` | Cloudinary Cloud Name from Step 2 |
   | `CLOUDINARY_API_KEY` | `...` | Cloudinary API Key from Step 2 |
   | `CLOUDINARY_API_SECRET` | `...` | Cloudinary API Secret from Step 2 |
   | `GEOCODER_BASE_URL` | `https://nominatim.openstreetmap.org` | Geocoder proxy base URL |
   | `GEOCODER_USER_AGENT` | `UrbanFix-Platform/1.0 (urbanfix@civictech.local)` | Nominatim user agent |
   | `DUPLICATE_RADIUS_METERS` | `40` | Cluster proximity radius in meters |
   | `AUTO_CLOSE_DAYS` | `3` | Inactivity days before auto-closing |
5. **Health Check Path**: Set to `/health`.
6. Click **Create Web Service**. Once deployed, copy your Render service URL (e.g., `https://urbanfix-backend.onrender.com`).
7. Verify by opening `https://urbanfix-backend.onrender.com/health` in your browser. Expected output:
   ```json
   { "status": "ok", "service": "UrbanFix Backend API", "database": "connected" }
   ```

---

## Step 4: Deploy Frontend on Vercel

1. **Sign Up / Log In**: Navigate to [vercel.com](https://vercel.com).
2. **Import Project**:
   - Click **Add New...** → **Project**.
   - Select your UrbanFix GitHub repository.
3. **Configure Project Settings**:
   - **Framework Preset**: `Vite`
   - **Root Directory**: Click Edit → select `client`
4. **Configure Environment Variables**:
   | Variable | Value |
   |---|---|
   | `VITE_API_URL` | `https://urbanfix-backend.onrender.com/api/v1` |
   *(Ensure no trailing slash after `/api/v1`)*
5. **Deploy**:
   - Click **Deploy**. Vercel will install dependencies, build with Tailwind, and deploy.
   - Once complete, copy your production frontend URL (e.g., `https://urbanfix-platform.vercel.app`).

---

## Step 5: Set CLIENT_URL on Render

1. Return to your **Render Dashboard** → Select `urbanfix-backend`.
2. Go to **Environment** tab.
3. Update `CLIENT_URL` to match your Vercel URL and local development URLs:
   ```
   https://urbanfix-platform.vercel.app,http://localhost:5173
   ```
4. Click **Save Changes**. Render will automatically trigger a zero-downtime redeploy with the updated CORS policy.

---

## Step 6: Run Seed Script on Remote Database

To populate your Atlas database with the initial administrator, 5 departments, 10 staff members, 3 citizens, 15 categories, priority rules, and 25 realistic reports:

Run the seed script locally pointing to your Atlas cluster:
```bash
# In your terminal:
cd server
MONGODB_URI="mongodb+srv://<user>:<password>@urbanfix-cluster.xxxx.mongodb.net/urbanfix?retryWrites=true&w=majority" npm run seed
```

Expected output:
```
[Database] MongoDB connected successfully: urbanfix-cluster...
🎉 UrbanFix Seed Complete!
Demo Login Credentials:
  Admin:      admin@urbanfix.org / UrbanFix123!
  Staff:      marcus.road@urbanfix.org / UrbanFix123!
  Citizen:    citizen1@urbanfix.org / UrbanFix123!
Created 25 reports across 5 departments.
```

---

## Step 7: Production Smoke Test Checklist

Perform this 5-minute sanity check on your deployed frontend:

- [ ] **1. Cold Start Notification**: Visit your Vercel URL. If the Render backend is waking from inactivity, verify the golden cold-start banner appears gracefully without crashing.
- [ ] **2. Live Counters**: Verify the hero section displays live counters (25+ reports filed, resolved counts, avg resolution time).
- [ ] **3. Light / Dark Mode**: Click the Moon/Sun icon in the header; verify high-contrast dark theme persists across page reload.
- [ ] **4. Citizen Login**: Click "Log In" → Click 1-click demo button **🏙️ Citizen (Aarav)** → Verify redirect to `/dashboard`.
- [ ] **5. Report Creation**: Click "Report a Problem":
  - Upload 1 test JPEG photo.
  - Check location picker (GPS auto-detection and draggable marker).
  - Select category "Pothole", enter description, and submit.
  - Verify the **AI Analysis Result Card** renders with confidence meter and recommended department.
- [ ] **6. Live Map Exploration**: Navigate to `/map`:
  - Verify custom color-coded pins appear across the city.
  - Click on a pin or side drawer card to view details.
  - Test category and priority filters.
- [ ] **7. Department Resolution Flow**:
  - Log out and log in as **🚧 Staff (Road Dept)** (`marcus.road@urbanfix.org`).
  - Open `/department`, view Kanban board, open your reported defect.
  - Click **Start Work** → Click **Mark Resolved** with before/after photos.
- [ ] **8. Citizen Verification**:
  - Log back in as Citizen → Open the report → Verify the **Before/After Comparison Slider** renders.
  - Click **Accept & Close** to verify the report status transitions to `Closed`.
- [ ] **9. Admin Console**:
  - Log in as **👑 Admin (Elena)** (`admin@urbanfix.org`).
  - Open `/admin` → Check Recharts charts, AI audit table, and Priority Rules weights.
