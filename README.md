# React Email Client & AI-Powered Kanban - Frontend

Modern React single-page application featuring intelligent email management with AI-powered Kanban board, real-time Gmail integration, offline caching, and seamless authentication.

## 🚀 Features

### Authentication & Security

- **Google OAuth 2.0 Code Flow** - Secure sign-in with Gmail scope permissions
- **JWT Token Management** - Access token in-memory, refresh token in localStorage
- **Automatic Token Refresh** - Seamless renewal with request queuing
- **Cross-Tab Sync** - BroadcastChannel for instant logout synchronization
- **Session Persistence** - Automatic session restoration on page reload

### Email Management

- **Gmail Integration** - Real-time inbox sync with all labels
- **Offline Caching** - IndexedDB with stale-while-revalidate pattern
- **Full Email Operations** - Compose, reply, forward, delete
- **Attachment Support** - Preview and download with proper metadata
- **HTML Email Rendering** - Safe iframe sandbox with inline images

### AI-Powered Kanban Board

- **Drag-and-Drop** - Smooth animations with @dnd-kit
- **Dynamic Columns** - Create, rename, delete, reorder columns
- **Gmail Label Mapping** - Auto-sync labels when moving cards
- **AI Summarization** - One-click email summaries
- **Smart Snooze** - Hide emails with presets (30m, 1h, Tomorrow, Next week)
- **Infinite Scroll** - Lazy loading with automatic pagination
- **Optimistic Updates** - Instant UI feedback

### Search & Discovery

- **Fuzzy Search** - Typo-tolerant instant search
- **Semantic Search** - AI-powered conceptual relevance (Ctrl+Enter)
- **Auto-Suggestions** - Contact names and keyword hints
- **Search Results View** - Dedicated results with column indicators

### Filtering & Sorting

- **Sort by Date** - Newest first / Oldest first
- **Filter by Unread** - Show only unread emails
- **Filter by Attachments** - Show emails with attachments
- **Sender Filter** - Quick filter by sender name/email
- **Real-Time Updates** - Instant filter application

### User Experience

- **Responsive Design** - Desktop, tablet, mobile optimized
- **Keyboard Navigation** - Full shortcut support (J/K, Enter, Escape, /)
- **Dark/Light Mode** - System preference detection
- **Toast Notifications** - Action feedback
- **Loading States** - Skeleton loaders and spinners
- **Error Handling** - Graceful error messages

### Advanced Features

- **Gmail Push Notifications** - WebSocket real-time updates
- **Multi-Tab Logout Sync** - BroadcastChannel coordination
- **Offline Support** - IndexedDB caching for faster loads
- **Open in Gmail** - Quick link to view in Gmail

## 🛠 Tech Stack

| Category         | Technologies                     |
| ---------------- | -------------------------------- |
| Framework        | React 19, TypeScript 5.7, Vite 6 |
| Routing          | React Router 7                   |
| State Management | TanStack Query 5 (React Query)   |
| UI/Styling       | Tailwind CSS 4, shadcn/ui        |
| Drag & Drop      | @dnd-kit/core, @dnd-kit/sortable |
| HTTP Client      | Axios with interceptors          |
| Offline Storage  | IndexedDB (idb)                  |
| Real-time        | Socket.IO Client                 |
| Icons            | Lucide React                     |

## 📦 Getting Started

### Prerequisites

- Node.js 20.x or higher
- Backend server running (see backend README)

### 1. Install Dependencies

```bash
cd react-authentication-fe
npm install
```

### 2. Configure Environment

Create `.env` file:

```env
VITE_API_BASE_URL=http://localhost:3000
VITE_GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
```

> Use the same `GOOGLE_CLIENT_ID` as the backend

### 3. Run Development Server

```bash
npm run dev
```

App starts at `http://localhost:5173`

## 📱 Pages & Routes

| Route     | Description            | Auth Required               |
| --------- | ---------------------- | --------------------------- |
| `/`       | Landing page           | No                          |
| `/login`  | Google Sign-In         | No (redirects if logged in) |
| `/signup` | Registration           | No (redirects if logged in) |
| `/inbox`  | Traditional email view | Yes                         |
| `/kanban` | Kanban board view      | Yes                         |

## ⌨️ Keyboard Shortcuts

| Shortcut     | Action                          |
| ------------ | ------------------------------- |
| `J` / `↓`    | Next email                      |
| `K` / `↑`    | Previous email                  |
| `Enter`      | Open selected email             |
| `Escape`     | Close modal / Clear search      |
| `/`          | Focus search bar                |
| `Ctrl+Enter` | Semantic search (in search bar) |

## 🔧 Scripts

| Command           | Description                                |
| ----------------- | ------------------------------------------ |
| `npm run dev`     | Development server (http://localhost:5173) |
| `npm run build`   | Production build                           |
| `npm run preview` | Preview production build                   |
| `npm run lint`    | ESLint check                               |

## 🐳 Docker

### Build Image

```bash
docker build \
  --build-arg VITE_API_BASE_URL=https://api.example.com \
  --build-arg VITE_GOOGLE_CLIENT_ID=your-client-id \
  -t email-kanban-frontend .
```

### Run Container

```bash
docker run -p 80:80 email-kanban-frontend
```

## 📁 Project Structure

```
src/
├── components/
│   ├── auth/           # Google Sign-In button
│   ├── inbox/          # Traditional email view components
│   │   ├── ComposeModal.tsx
│   │   ├── EmailDetailColumn.tsx
│   │   ├── EmailListColumn.tsx
│   │   ├── InboxHeader.tsx
│   │   ├── InboxView.tsx
│   │   ├── KeyboardShortcutsHelp.tsx
│   │   └── MailboxSidebar.tsx
│   ├── kanban/         # Kanban board components
│   │   ├── KanbanBoard.tsx       # Main drag-drop board
│   │   ├── KanbanCard.tsx        # Email card component
│   │   ├── KanbanColumn.tsx      # Droppable column
│   │   ├── KanbanHeader.tsx      # Search + user menu
│   │   ├── KanbanInboxView.tsx   # Board container
│   │   ├── KanbanSettingsModal.tsx # Column configuration
│   │   ├── SearchBarWithSuggestions.tsx
│   │   ├── SearchResults.tsx
│   │   └── SnoozePopover.tsx
│   └── ui/             # shadcn/ui components
├── config/
│   └── env.ts          # Environment variables
├── constants/          # App constants
│   ├── constants.auth.ts
│   ├── constants.email.ts
│   ├── constants.gmail.ts
│   └── constants.kanban.ts
├── context/
│   └── AuthContext.tsx # Auth state management
├── hooks/
│   ├── useKeyboardNavigation.ts
│   ├── email/
│   │   ├── useEmailMutations.ts
│   │   ├── useEmailSelection.ts
│   │   └── useGmailPush.ts     # WebSocket connection
│   └── kanban/
│       ├── useKanbanConfig.ts   # Column configuration
│       ├── useKanbanFilters.ts  # Filter/sort state
│       └── useKanbanMutations.ts # Board mutations
├── lib/
│   ├── auth.ts         # Token management
│   ├── keyboardShortcuts.ts
│   ├── utils.ts
│   ├── api/            # API client & endpoints
│   │   ├── client.ts   # Axios instance with interceptors
│   │   ├── auth.api.ts
│   │   ├── gmail.api.ts
│   │   ├── gmail.cached.api.ts # Cached API calls
│   │   ├── kanban.api.ts
│   │   └── kanban-config.api.ts
│   └── db/             # Offline storage
│       ├── indexedDB.ts
│       └── emailCache.ts
├── pages/
│   ├── Home.tsx
│   ├── Login.tsx
│   ├── SignUp.tsx
│   ├── InboxPage.tsx
│   └── KanbanPage.tsx
├── types/              # TypeScript definitions
└── utils/              # Utility functions
    ├── authUtils.ts
    ├── emailUtils.ts
    ├── kanbanUtils.ts
    └── mailboxUtils.ts
```

## 🔄 State Management

### Authentication (AuthContext)

```tsx
const { user, bootstrapped, setUser, logout } = useAuth();
```

- `user`: Current user object or null
- `bootstrapped`: True when initial auth check complete
- `setUser`: Update user state
- `logout`: Clear all auth data

### Token Management (lib/auth.ts)

- Access token stored in memory (never in localStorage)
- Refresh token in localStorage for persistence
- Automatic token refresh on 401 responses
- Cross-tab sync via BroadcastChannel

### API Client (lib/api/client.ts)

- Axios instance with auth interceptor
- Request queuing during token refresh
- Automatic retry after successful refresh

## 📡 API Integration

### Email Endpoints

```typescript
// List emails
GET /api/mailboxes/:id/emails?pageToken=xxx&limit=20

// Email detail
GET /api/emails/:id

// Send email
POST /api/emails/send

// Reply/Forward
POST /api/emails/:id/reply
POST /api/emails/:id/forward

// Modify (read/unread/star/delete)
POST /api/emails/:id/modify
```

### Kanban Endpoints

```typescript
// Get board
GET /api/kanban/board?pageToken=xxx&limit=10

// Update status (drag-drop)
PATCH /api/kanban/items/:messageId/status

// Snooze
POST /api/kanban/items/:messageId/snooze

// AI Summary
POST /api/kanban/items/:messageId/summarize

// Column config
GET /api/kanban/columns
POST /api/kanban/columns
```

### Search Endpoints

```typescript
// Fuzzy search
GET /api/kanban/search?q=query&limit=50

// Semantic search
POST /api/kanban/search/semantic { query, limit }

// Suggestions
GET /api/kanban/search/suggestions?q=query&limit=5
```

## 🔐 Google OAuth Setup

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Create/select a project
3. Enable Gmail API
4. Create OAuth 2.0 Client ID (Web application)
5. Add authorized JavaScript origins:
   - `http://localhost:5173` (development)
   - Your production domain
6. Copy Client ID to `.env` as `VITE_GOOGLE_CLIENT_ID`

## 🚀 Deployment

### Vercel

1. Connect GitHub repository
2. Set environment variables in Vercel dashboard
3. Deploy

### Netlify

1. Connect repository
2. Build command: `npm run build`
3. Publish directory: `dist`
4. Set environment variables

### Docker + Nginx

The Dockerfile builds a production image with nginx:

```bash
docker build \
  --build-arg VITE_API_BASE_URL=https://api.yourdomain.com \
  --build-arg VITE_GOOGLE_CLIENT_ID=your-client-id \
  -t email-kanban-fe .

docker run -p 80:80 email-kanban-fe
```

## 📝 License

MIT
