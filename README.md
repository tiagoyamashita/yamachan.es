# yamachan.es

Website for Yama-Chan, a family Japanese restaurant in Benalúa, Alicante.

The public site covers the house, the menu (`/carta`), takeaway (`/para-llevar`), and reservations (`/reservas`). `/admin` is where the menu, tables, kitchen orders, bookings, and the rest of the site content are managed.

## Run locally

Use Node.js 22 or newer.

```bash
npm install
cp .env.example .env
npm run dev
```

Open http://localhost:5173/. The dev server also handles `/api/admin`, `/api/reservations`, and `/api/takeout`.

Copy `.env.example` to `.env` and fill in the keys you need. It lists Instagram, Google reviews, Supabase, admin login, Resend, Globally Booked, and Stripe. The site still starts without them; those features stay empty or off until the matching keys are set.

## Scripts

| Command | What it does |
| --- | --- |
| `npm run dev` | Dev server on port 5173 |
| `npm run build` | Typecheck and production build |
| `npm run preview` | Serve the production build |
| `npm run lint` | Lint with oxlint |
| `npm run admin:reset-password -- <new-password>` | Store a new admin password (at least 8 characters) |
| `npm run admin:reset-password -- --clear` | Drop the stored password and use `ADMIN_PASSWORD` from `.env` again |

## Deploy

Production runs on Vercel. `vercel.json` sends the public routes to the single-page app and the API paths to the serverless functions.
