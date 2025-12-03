# React Authentication Frontend

Vite + React single-page app that demonstrates modern authentication flows (email/password + Google Sign-In) and a protected 3-column email dashboard backed by mocked APIs.

## Highlights

- Email/password login with form validation (React Hook Form + Zod).
- Google Identity Services button that exchanges credentials with the backend.
- Token handling strategy: access token kept in memory, refresh token persisted in `localStorage`, automatic refresh with concurrency-safe Axios interceptor.
- Auth-aware routing (`/login`, `/signup`, `/inbox`, `/`) via React Router + custom `AuthContext`.
- Responsive Inbox UI: folders, paginated list, detail pane, compose modal, keyboard focus states, mobile fallback.

## Tech Stack

- React 19, TypeScript, Vite 7
- React Router 7, React Query 5
- Tailwind CSS 4, shadcn-inspired component primitives

## Setup

```bash
cd react-authentication-fe
npm install
```

Create `.env`:

```env
VITE_API_BASE_URL=http://localhost:4000
VITE_GOOGLE_CLIENT_ID=your-google-client-id.apps.googleusercontent.com
```

> Use the exact same client ID as `GOOGLE_CLIENT_ID` on the backend. Add `http://localhost:5173` and your production origin to the OAuth client's “Authorized JavaScript origins”.

### Scripts

| Command           | Description                                |
| ----------------- | ------------------------------------------ |
| `npm run dev`     | Start dev server @ `http://localhost:5173` |
| `npm run build`   | Type-check + production bundle             |
| `npm run preview` | Preview production build                   |
| `npm run lint`    | ESLint                                     |

## Pages

- `/` – Marketing/overview page that adapts to auth state.
- `/signup` – Email/password registration (strong password rules, inline feedback).
- `/login` – Email/password + Google Sign-In, loading & error messaging.
- `/inbox` – Requires valid access token; renders folders, list, detail, mock actions, and compose modal.

## Working With Tokens

- `src/lib/auth.ts` keeps access token in memory and handles refresh timers.
- `src/lib/api.ts` attaches the access token to every request and queues up 401s so only one refresh call is executed even during bursts.
- `AuthContext` refreshes on boot, syncs logout across tabs, and exposes `logout()` to the UI.

## Mock Email Experience

The inbox fetches from:

- `GET /mailboxes`
- `GET /mailboxes/:id/emails?page=1&pageSize=8`
- `GET /emails/:id`

Responses include realistic sender names, previews, timestamps, HTML bodies, and attachment metadata so the UI feels like a live email client even without a real provider.

## Deployment Tips

- Build with Node 20.19+ or 22.12+ (Vite requirement).
- Provide environment variables through your host (Vercel, Netlify, etc.).
- Remember to update Google OAuth origins when you deploy to a new domain.
