# Corporate Wars Deployment Guide

This guide deploys the Corporate Wars MVP so players can access it in a browser.

Recommended deployment:

- Frontend: Vercel
- Backend: Render
- Source code: GitHub

The game uses an in-memory backend. For the MVP, run only one backend instance. Active rooms will reset if the backend restarts or sleeps.

## Local Project Location

The local project files are here:

```text
/Users/wine/Documents/Codex/2026-06-10/files-mentioned-by-the-user-codex
```

Main folders:

```text
/Users/wine/Documents/Codex/2026-06-10/files-mentioned-by-the-user-codex/client
/Users/wine/Documents/Codex/2026-06-10/files-mentioned-by-the-user-codex/server
/Users/wine/Documents/Codex/2026-06-10/files-mentioned-by-the-user-codex/README.md
/Users/wine/Documents/Codex/2026-06-10/files-mentioned-by-the-user-codex/package.json
```

Important asset folder:

```text
/Users/wine/Documents/Codex/2026-06-10/files-mentioned-by-the-user-codex/client/public/assets/map
```

## Step 1: Validate Locally

From the project root, run:

```bash
npm run validate
```

This should build the client, build the server, and run the automated server tests.

Optional local dev run:

```bash
npm run dev
```

Open:

```text
http://localhost:5173
```

Backend health check:

```text
http://localhost:3001/health
```

## Step 2: Upload Code To GitHub

Create a new GitHub repository, then from the project root run:

```bash
git init
git add .
git commit -m "Deploy Corporate Wars MVP"
git branch -M main
git remote add origin YOUR_GITHUB_REPO_URL
git push -u origin main
```

Replace `YOUR_GITHUB_REPO_URL` with your GitHub repository URL.

## Step 3: Deploy Backend On Render

1. Go to Render: https://render.com
2. Create a new `Web Service`.
3. Connect the GitHub repository.
4. Use these settings:

```text
Name: corporate-wars-server
Environment: Node
Root Directory: leave blank, or use repository root
Build Command: npm install && npm run build --workspace server
Start Command: npm start --workspace server
```

5. Add environment variables:

```text
NODE_ENV=production
CLIENT_ORIGIN=*
```

For the first deploy, `CLIENT_ORIGIN=*` is okay so the frontend can connect before you know the Vercel URL.

6. Deploy the service.
7. After deployment, open:

```text
https://YOUR_RENDER_APP.onrender.com/health
```

You should see a healthy response from the backend.

Save your backend URL. You will need it for Vercel.

## Step 4: Deploy Frontend On Vercel

1. Go to Vercel: https://vercel.com
2. Create a new project.
3. Import the same GitHub repository.
4. Use these settings:

```text
Framework Preset: Vite
Root Directory: repository root
Install Command: npm install
Build Command: npm run build --workspace client
Output Directory: client/dist
```

5. Add this environment variable:

```text
VITE_SERVER_URL=https://YOUR_RENDER_APP.onrender.com
```

Replace the value with your real Render backend URL.

6. Deploy the project.
7. Open your Vercel URL and test creating a room.

## Step 5: Lock Backend CORS To Your Vercel URL

After the Vercel frontend is live, go back to Render and update:

```text
CLIENT_ORIGIN=https://YOUR_VERCEL_APP.vercel.app
```

Then redeploy the Render backend.

This prevents random websites from connecting to your game server.

## Step 6: Final Production Test

Test these items from the live Vercel URL:

- Create Game works.
- Join Game works from another browser or device.
- Room code works.
- Ready and Start Game work.
- Start Game only appears for the host.
- 14 players can join.
- 15th player cannot join.
- Workers march and attack.
- Angry Client announcement appears above everything.
- Monster Client appears and damages inactive players.
- Refresh reconnects the player.
- Disconnects do not crash the room.
- End-game screen appears when one office remains.

## Important MVP Hosting Notes

Corporate Wars currently stores rooms in backend memory only.

That means:

- Do not run multiple backend instances for MVP.
- Rooms are lost if Render restarts the server.
- Rooms may be lost if using a free hosting plan that sleeps.
- For more reliable production hosting later, add Redis or a database-backed room store.

## Useful Links

- Vercel build settings: https://vercel.com/docs/builds/configure-a-build
- Render Node/Express deployment: https://render.com/docs/deploy-node-express-app

## Copyright

© 2026 RineDC. All rights reserved.
