# Doodle Date

A tiny private drawing date for two people. Original web app inspired by the *idea* of collaborative guided drawing games, without copying ArtWorkout's code, copyrighted artwork, or trademarks.

**Features:** real shared drawing canvas, live brush updates, four prompts (including free drawing), mobile/desktop pen and touch input, two-person online presence, partner cursor, six brush colors, eraser, undo your own last stroke, save PNG, shareable 128-bit invite link, local board recovery, and little heart reactions.

## 1. Run locally

Node.js 22+ recommended.

```bash
npm install
npm run dev
```

Visit the local URL shown by Vite. With no Supabase configuration, it opens in **solo preview mode** so you can see the UI and draw. A second device will not synchronize until Realtime is configured.

## 2. Enable real-time multiplayer for free

Create a **dedicated** Supabase project, or use a suitable existing project whose usage policies you control. No database schema changes or SQL migrations are required for this MVP.

1. In Supabase, open your project's **Connect** screen. Copy the project URL and the **publishable** public API key (`sb_publishable_...`).
2. Copy `.env.example` to `.env.local` and replace the placeholder URL and key.
3. In the Supabase dashboard, check **Realtime Settings** and ensure **public channels** are allowed. These are link-secret rooms, not authenticated rooms.
4. Restart `npm run dev` to load the environment variables.
5. On a device, create a room, then use **Copy invitation link** and send it to your partner. Open the same public URL on two devices to draw together.

**Important:** Never put a Supabase secret key or `service_role` key in Vite frontend variables. The browser-safe publishable key is intended for public frontend apps.

## 3. Deploy

Deploy the static Vite app on Vercel, Netlify, Cloudflare Pages, or another static host. Build command: `npm run build`; output folder: `dist`. Set the same two `VITE_` environment variables in the hosting dashboard and redeploy. Share the deployed HTTPS link, not `localhost`.

## 4. How privacy works

- Room links contain a cryptographically generated 128-bit random value. They are not listed or searchable within the app.
- The app uses Supabase **public Realtime Broadcast + Presence**: anyone who obtains the room URL can listen/send to that topic. It is *not* private authenticated authorization and should not be used for sensitive drawings or data.
- The UI allows two active participants, but this is **not a server-enforced security limit**; it is appropriate for a lightweight trusted two-person hobby project only. If strict access control is needed, implement authenticated private channels with Supabase Realtime Authorization + RLS or an authoritative server.
- No session content is saved in a Supabase database by this app. Broadcast messages transit through Supabase servers; local state is saved in each browser's `localStorage`, and PNG export is explicit.
- When both partners close the room, only a locally cached board remains on their own devices. Joining with a fresh device later does not retrieve a historical room snapshot.

## 5. Limitations / next iterations

- It is a **functional starter app**, not an exact replica of ArtWorkout. There is no stroke-accuracy scoring, full lesson progression, or original ArtWorkout lesson catalog.
- Simultaneous clear/new-prompt events use last-write-wins revision timestamps; for heavy concurrent editing, move to a server-authoritative operation log/CRDT.
- If a partner joins mid-stroke, they may see that draft only when the stroke completes. On join, snapshots cover completed strokes.
- Supabase's free tier and limits can change; monitor usage for frequent brush events. Events are batched roughly every 85ms per active drawing pointer.
- Reconnect and presence are best-effort; canvas state sync is not durable across server outages. Save PNGs for keepsakes.

## Architecture

```text
Browser A (React/Vite)           Browser B (React/Vite)
           \                      /
               Supabase Realtime
               - Broadcast: strokes, cursors, state
               - Presence: who's connected

Each browser:
- Live canvas with local+remote draft strokes
- LocalStorage snapshot keyed by room ID
- Export current ink as PNG
```

## Basic smoke test

1. Open the hosted site in two browsers/devices and enter two different names.
2. Create a date in the first browser; copy the link to the second.
3. Confirm both people appear in the duo panel.
4. Draw with the mouse and touch at the same time; both screens should show both strokes.
5. Change a picture prompt, use eraser and Undo, then send a heart.
6. Save the drawing and check the PNG.
7. Refresh one browser, make another stroke on the other, and verify the refreshed device receives state.
8. Try a third browser: the UI should show a full-room notice (this is not server-side enforcement).

## Disclaimer

This is a clean-room feature-level implementation. It does not include reverse-engineered artifacts or REA analysis. REA could be used separately on software you are legally authorized to inspect for compatibility research. Do not use this project to bypass ArtWorkout subscriptions or access its servers.
