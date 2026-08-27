# 🚀 SpeakX Deployment & Application Setup Guide

This guide covers the **best, 100% FREE ways** to run and deploy SpeakX for regular daily communication practice without spending a single dollar.

---

## 🌟 Comparison of Options

| Method | Cost | Setup Time | Latency & Performance | Best For |
| :--- | :--- | :--- | :--- | :--- |
| **1. Desktop App (PWA + Launcher)** *(Recommended)* | **$0** (Free) | 1 minute | ⚡ Instant (0ms server lag) | Daily desktop practice, zero lag, private data |
| **2. Mobile / Remote via Free Cloudflare Tunnel** | **$0** (Free) | 2 minutes | ⚡ Fast (Direct to PC) | Practicing on phone from bed or anywhere |
| **3. Cloud Web App (Render + Turso)** | **$0** (Free tier) | 5 minutes | ⏱️ Server spins down after 15m idle | Hosted link accessible from any browser |

---

## Option 1: Run as a Standalone Desktop App (Recommended)

Running SpeakX locally on your computer gives you the fastest voice response, lowest audio latency, and 100% free unlimited database storage.

### Step 1: Create Desktop Shortcut
In the project directory, simply double click:
```text
create-desktop-shortcut.bat
```
This automatically places a **"SpeakX"** shortcut on your Windows Desktop.

### Step 2: Install as Native App (Chrome / Edge PWA)
1. Double-click the **SpeakX** shortcut to start the app.
2. In your browser (Chrome or Edge) at `http://localhost:3000`:
   - Click the **Install SpeakX** button in the address bar (looks like a monitor/down-arrow icon on the right side of the address bar), or
   - Go to Browser Menu (`⋮`) -> **Save and share** -> **Install SpeakX as App**.
3. **SpeakX is now a standalone desktop application!** It will launch in its own clean window with no URL bar and can be pinned to your Windows Taskbar.

---

## Option 2: Practice on Your Phone for Free (Cloudflare Tunnel)

If you want to practice speaking on your phone while walking or lying down:

1. Start SpeakX locally using `launch-app.bat` or `npm run dev`.
2. In another terminal window, run:
   ```bash
   npx cloudflared tunnel --url http://localhost:3000
   ```
3. Cloudflare will print a free HTTPS link (e.g. `https://random-name.trycloudflare.com`).
4. Open that link on your smartphone's browser.
5. Tap **"Add to Home Screen"** on your phone to install SpeakX on your mobile device!

---

## Option 3: Deploy to 100% Free Cloud (Render + Turso)

If you want a permanently hosted web application on the cloud:

### 1. Database (Free Cloud SQLite via Turso)
1. Go to [turso.tech](https://turso.tech) and create a free account (generous 9GB free tier).
2. Create a database:
   ```bash
   turso db create speakx-db
   turso db show speakx-db --url
   turso db tokens create speakx-db
   ```
3. Copy your `DATABASE_URL` (starts with `libsql://...`) and `TURSO_AUTH_TOKEN`.

### 2. Host on Render (Free Web Service)
1. Push your repository to GitHub.
2. Go to [render.com](https://render.com) and create a free account.
3. Click **New +** -> **Web Service** -> Connect your GitHub repository.
4. Configure settings:
   - **Environment**: `Node`
   - **Build Command**: `npm ci && npm run build`
   - **Start Command**: `node server.js`
   - **Instance Type**: `Free`
5. Under **Environment Variables**, add:
   - `NODE_ENV`: `production`
   - `GEMINI_API_KEYS`: `your-gemini-api-key(s)`
   - `GEMINI_LIVE_MODEL`: `gemini-2.5-flash-live-preview`
   - `GEMINI_TEXT_MODEL`: `gemini-2.5-flash`
   - `DATABASE_URL`: Your Turso DB URL
   - `TURSO_AUTH_TOKEN`: Your Turso Auth Token
6. Click **Deploy Web Service**.

---

## 🔑 Keeping Gemini API Free

- Google AI Studio provides **free API keys** with 15 Requests Per Minute (RPM) and 1,000,000 Tokens Per Minute (TPM).
- SpeakX has a built-in **Key Orchestrator**:
  - You can add 2 or 3 free API keys from different Google accounts separated by commas:
    ```env
    GEMINI_API_KEYS=key1,key2,key3
    ```
  - SpeakX will automatically rotate between them and handle rate limits seamlessly so you will never run out of quota during daily practice.
