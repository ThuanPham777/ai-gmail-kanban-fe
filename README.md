# React Email Client And AI-powered Kanban Frontend

Modern React single-page application featuring intelligent email management with AI-powered Kanban board, real-time Gmail integration, and seamless authentication flows.

## Highlights

### Authentication & Security

- Email/password registration with strong validation (React Hook Form + Zod)
- Google Identity Services One Tap integration
- Secure token management: access token in memory, refresh token in localStorage
- Concurrent-safe automatic token refresh with Axios interceptors
- Auth-aware routing with protected routes

### Email Management

- Gmail integration with real-time inbox sync
- Full email operations (compose, reply, forward, delete)
- Rich text editor for composing emails
- Attachment preview and download
- Advanced filtering (unread, starred, attachments)

### AI-Powered Kanban Board

- Drag-and-drop email organization with smooth animations (@dnd-kit)
- Dynamic column configuration with user-customizable labels
- AI-powered email summarization for quick insights
- Smart snooze with calendar picker
- Gmail label sync on card moves
- Real-time updates with optimistic UI
- Infinite scroll with automatic loading
- Advanced filters: sender, unread, attachments, date sorting

### Search & Discovery

- Instant fuzzy search with keyboard shortcuts
- Semantic search with AI-powered relevance
- Search suggestions with contact autocomplete

### User Experience

- Responsive design (desktop, tablet, mobile)
- Keyboard navigation and shortcuts
- Dark/light mode support
- Toast notifications for all actions
- Loading states and error handling

## Tech Stack

- **Framework**: React 19, TypeScript 5, Vite 7
- **Routing**: React Router 7 with protected routes
- **State Management**: React Query 5 (TanStack Query)
- **UI/Styling**: Tailwind CSS 4, shadcn/ui components
- **Drag & Drop**: @dnd-kit/core
- **Forms**: React Hook Form + Zod validation
- **HTTP Client**: Axios with interceptors
- **Icons**: Lucide React

## Getting Started

### 1. Install Dependencies

```bash
cd react-authentication-fe
npm install
```

### 2. Configure Environment

Create `.env` file:

```env
VITE_API_BASE_URL=http://localhost:4000
VITE_GOOGLE_CLIENT_ID=your-google-client-id.apps.googleusercontent.com
```

### 3. Run Development Server

```bash
npm run dev
```

The frontend will start on `http://localhost:5173`

> Use the exact same client ID as `GOOGLE_CLIENT_ID` on the backend. Add `http://localhost:5173` and your production origin to the OAuth client's “Authorized JavaScript origins”.

### Useful Commands

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

## API Endpoints

### Authentication

- `POST /api/auth/register` - Email/password signup
- `POST /api/auth/login` - Issue access + refresh token
- `POST /api/auth/google` - Exchange Google credential for tokens
- `POST /api/auth/refresh` - Rotate refresh token
- `POST /api/auth/logout` - Revoke stored refresh token

### Mailbox & Email

- `GET /api/mailboxes` - List folders + unread counts
- `GET /api/mailboxes/:id/emails` - Paginated list for a folder
- `GET /api/emails/:id` - Email detail, metadata, attachments
- `POST /api/emails/send` - Send email
- `POST /api/emails/:id/reply` - Reply to an email
- `POST /api/emails/:id/modify` - Modify email (mark read/unread, star, etc)
- `GET /api/attachments/:id` - Download attachment

### Kanban Board

- `GET /api/kanban/board` - Get kanban board data
- `GET /api/kanban/search` - Fuzzy search emails
- `POST /api/kanban/search/semantic` - Semantic vector search
- `GET /api/kanban/search/suggestions` - Get search suggestions
- `POST /api/kanban/items/:messageId/generate-embedding` - Generate embedding for email
- `PATCH /api/kanban/items/:messageId/status` - Update email status
- `POST /api/kanban/items/:messageId/snooze` - Snooze email until date
- `POST /api/kanban/items/:messageId/summarize` - Generate AI summary
- `GET /api/kanban/columns` - Get user's column configuration
- `POST /api/kanban/columns` - Update column configuration

Responses include realistic sender names, previews, timestamps, HTML bodies, and attachment metadata so the UI feels like a live email client even without a real provider.

## Deployment Tips

- Build with Node 20.19+ or 22.12+ (Vite requirement).
- Provide environment variables through your host (Vercel, Netlify, etc.).
- Remember to update Google OAuth origins when you deploy to a new domain.
