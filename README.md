# AI Trip Planner

Pick a destination and budget, generate a day-by-day itinerary with real places (OpenAI + Google
Maps), and save trips to your account.

## Stack

- **Next.js 14** (App Router, TypeScript) — frontend + API routes
- **NextAuth.js** — email/password (Credentials) and Google OAuth login
- **Prisma + PostgreSQL** (Supabase or Neon) — users, sessions, saved trips
- **OpenAI API** — generates the structured itinerary
- **Google Maps API** — Geocoding (resolve destination), Places + Place Details (real, live-rated
  attractions/restaurants with opening hours), Distance Matrix (real travel time between stops)
- **Open-Meteo** — free, keyless daily weather forecast for the trip dates
- **Amadeus Self-Service API** — flight and hotel search (sandbox/test by default)
- **Tailwind CSS** — styling

## How it fits together

1. User submits destination / budget / days / interests, and optionally a start date and
   from/to airport codes (`TripForm`).
2. `POST /api/generate-itinerary`:
   - Geocodes the destination (Google Geocoding API).
   - Pulls real attractions and restaurants nearby (Google Places API, Text Search), then fetches
     live **Place Details** (opening hours, open-now status, rating) for the top candidates.
   - Sends that enriched place list + preferences to OpenAI, which returns a structured JSON
     itinerary built **only from the real places provided**, scheduling around their actual hours.
   - Matches each generated item back to its real place to attach coordinates, then calls the
     **Distance Matrix API** between consecutive stops in a day for a real walking time.
   - If a start date was given: fetches a daily **weather forecast** (Open-Meteo) and attaches it
     per day. Open-Meteo only forecasts ~16 days out, so farther-out trips get a note instead.
   - If an origin + destination airport code + start date were given: searches **flights and
     hotels** via Amadeus.
3. Itinerary renders in the browser with an embedded map, per-day weather, travel time between
   stops, and flight/hotel results (`ItineraryView`).
4. If signed in, "Save trip" → `POST /api/trips` writes the full itinerary JSON (including
   weather/flights/hotels) to Postgres via Prisma.
5. `/dashboard` lists saved trips; `/trips/[id]` shows one in full.

## 1. Install dependencies

```bash
npm install
```

## 2. Set up Postgres (Supabase or Neon)

Create a free project on [Supabase](https://supabase.com) or [Neon](https://neon.tech), then copy
the connection string into `.env` as `DATABASE_URL`. Supabase: use the "Connection string" in
Project Settings → Database (URI, with `?sslmode=require`). Neon: copy the pooled connection
string from the project dashboard.

## 3. Configure environment variables

```bash
cp .env.example .env
```

Fill in:

- `DATABASE_URL` — from step 2
- `NEXTAUTH_SECRET` — run `openssl rand -base64 32`
- `NEXTAUTH_URL` — `http://localhost:3000` for local dev
- `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` — from [Google Cloud Console](https://console.cloud.google.com/apis/credentials):
  create an OAuth 2.0 Client ID (Web application), add
  `http://localhost:3000/api/auth/callback/google` as an authorized redirect URI.
- `OPENAI_API_KEY` — from [platform.openai.com](https://platform.openai.com/api-keys)
- `GOOGLE_MAPS_API_KEY` and `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` — from Google Cloud Console. Enable
  the **Geocoding API**, **Places API**, **Distance Matrix API**, and **Maps Embed API** on the
  project. You can use the same key for both variables locally; in production, restrict the
  server-side key by IP and the public one by HTTP referrer.
- `AMADEUS_CLIENT_ID` / `AMADEUS_CLIENT_SECRET` — free self-service account at
  [developers.amadeus.com](https://developers.amadeus.com). Leave `AMADEUS_HOSTNAME=test` to use
  the sandbox (no cost, but a limited set of routes/dates return real data — this is expected).
  Flights/hotels are optional: if left blank, or if the person doesn't fill in the from/to airport
  fields, the itinerary still generates normally without them.
- Weather needs no key — Open-Meteo is free and keyless.

## 4. Push the database schema

```bash
npx prisma migrate dev --name init
```

## 5. Run it

```bash
npm run dev
```

Visit `http://localhost:3000`.

## Deploying (Vercel)

1. Push this repo to GitHub and import it into [Vercel](https://vercel.com/new).
2. Add all the env vars from `.env` in the Vercel project settings.
3. Set `NEXTAUTH_URL` to your production URL, and add
   `https://your-domain.com/api/auth/callback/google` as an authorized redirect URI in Google Cloud
   Console.
4. Vercel runs `npm install` → `postinstall` (`prisma generate`) → `npm run build` automatically.
   The build script now runs `prisma migrate deploy` before `next build`, so the database schema
   is applied on every deploy - no manual migration step needed.

## Deploying (Render)

A `render.yaml` Blueprint is included, so this can deploy as a single Render web service.

1. Push this repo to GitHub.
2. In the Render dashboard: **New → Blueprint**, pick this repo. Render reads `render.yaml` and
   provisions one web service (`ai-trip-planner`) with the build/start commands already set:
   - Build: `npm install && npx prisma generate && npx prisma migrate deploy && npm run build`
     (this also applies the Prisma schema to your database on every deploy)
   - Start: `npm run start` (reads Render's `$PORT` automatically)
3. Render will prompt for every env var marked `sync: false` in `render.yaml` — fill in the same
   values as your local `.env` (Supabase/Neon `DATABASE_URL`, `NEXTAUTH_SECRET`, Google OAuth,
   OpenAI, Google Maps, Amadeus).
4. Set `NEXTAUTH_URL` to the `https://<your-service>.onrender.com` URL Render assigns (or your
   custom domain), and add `https://<your-service>.onrender.com/api/auth/callback/google` as an
   authorized redirect URI in Google Cloud Console.
5. Deploy. Render auto-redeploys on every push to the branch you connect, same as Vercel.

No Blueprint? You can set the same service up manually: **New → Web Service**, connect the repo,
Node runtime, same build/start commands as above, add the env vars by hand.

**Note:** Render's free web service tier spins down after inactivity and takes ~30–60s to wake on
the next request — fine for testing, worth upgrading off of if you want it always-on.

## Where to extend next

- Swap the Places `textsearch` calls for `nearbysearch` + category filters (e.g. museums, parks)
  for more targeted results.
- Add editing of a generated itinerary before saving (drag-and-drop reorder, swap a place).
- Add a "regenerate day" action that re-prompts OpenAI for just one day.
- Rate-limit `/api/generate-itinerary` — it's now a fairly expensive route: one Geocoding call, two
  Places Text Search calls, up to 14 Place Details calls, one OpenAI call, several Distance Matrix
  calls, one weather call, and (optionally) Amadeus flight + hotel calls per request.
- Cache Places/weather results per destination+date to cut down repeat API calls/cost.
- Resolve a free-text destination to an IATA city code automatically (e.g. via a small lookup
  table or an airport-code API) instead of asking the person to type one in, for the flight/hotel
  search fields.
- Swap Amadeus's sandbox for production once you're ready to pay for real coverage — sandbox data
  only covers a limited set of routes/dates, so empty flight/hotel results there are expected and
  don't necessarily mean the route doesn't exist.
