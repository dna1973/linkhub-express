# LinkHub Express — Technical Specification (SPEC)

**Version:** 1.0  
**Date:** 2026-02-22

---

## 1. Architecture

```
┌─────────────────────────────────────────────┐
│                 Frontend                     │
│   React 18 + TypeScript + Vite + Tailwind   │
│              Lovable Cloud                   │
└──────────────────┬──────────────────────────┘
                   │ HTTPS
┌──────────────────▼──────────────────────────┐
│              Backend (Lovable Cloud)          │
│  ┌──────────┐ ┌──────────┐ ┌──────────────┐ │
│  │   Auth   │ │ Database │ │   Storage    │ │
│  │  (OAuth) │ │ (Postgres)│ │  (Buckets)  │ │
│  └──────────┘ └──────────┘ └──────────────┘ │
│  ┌──────────────────────────────────────────┐│
│  │         Edge Functions (Deno)            ││
│  └──────────────────────────────────────────┘│
└──────────────────────────────────────────────┘
```

---

## 2. Data Model

### 2.1 Table `profiles`

| Column | Type | Description |
|--------|------|-------------|
| id | UUID (PK) | User ID (auth.users) |
| username | TEXT (UNIQUE, NULLABLE) | Public username |
| full_name | TEXT | Full name |
| avatar_url | TEXT | Avatar URL |
| bio | TEXT | Biography |
| theme_options | JSONB | Theme/design settings |
| custom_domain | TEXT | Custom domain |
| preferred_domain | TEXT | Preferred domain |
| created_at | TIMESTAMPTZ | Creation date |
| updated_at | TIMESTAMPTZ | Update date |

### 2.2 Table `links`

| Column | Type | Description |
|--------|------|-------------|
| id | SERIAL (PK) | Link ID |
| user_id | UUID (FK → profiles) | Link owner |
| title | TEXT | Link title |
| url | TEXT | Destination URL |
| position | INTEGER | Sort position |
| is_visible | BOOLEAN | Visibility flag |
| clicks | INTEGER | Click counter |
| created_at | TIMESTAMPTZ | Creation date |
| updated_at | TIMESTAMPTZ | Update date |

### 2.3 Table `profile_views`

| Column | Type | Description |
|--------|------|-------------|
| id | SERIAL (PK) | View ID |
| profile_id | UUID (FK → profiles) | Viewed profile |
| viewed_at | TIMESTAMPTZ | View timestamp |
| ip_address | TEXT | Visitor IP |
| user_agent | TEXT | Browser user agent |
| device_type | TEXT | Device type |
| country | TEXT | Country |
| country_code | TEXT | Country code |
| city | TEXT | City |
| referrer | TEXT | Referrer |
| session_id | TEXT | Session ID |

### 2.4 Table `link_clicks`

| Column | Type | Description |
|--------|------|-------------|
| id | SERIAL (PK) | Click ID |
| link_id | INTEGER (FK → links) | Clicked link |
| profile_id | UUID | Profile owner |
| clicked_at | TIMESTAMPTZ | Click timestamp |
| ip_address | TEXT | Visitor IP |
| user_agent | TEXT | User agent |
| device_type | TEXT | Device type |
| country | TEXT | Country |
| country_code | TEXT | Country code |
| city | TEXT | City |
| referrer | TEXT | Referrer |
| session_id | TEXT | Session ID |

---

## 3. Security

### 3.1 Row Level Security (RLS)

All tables have RLS enabled:

- **profiles:** Public read (for public profiles), write restricted to own user
- **links:** Public read (for public profiles), CRUD restricted to own user
- **profile_views:** Public insert (anonymous), read restricted to profile owner
- **link_clicks:** Public insert (anonymous), read restricted to profile owner

### 3.2 Authentication

- Email/password with email confirmation
- OAuth 2.0 with Google via Lovable Cloud Auth
- JWT tokens managed automatically
- Persistent sessions with automatic refresh

---

## 4. Directory Structure

```
src/
├── assets/              # Icons and static images
├── components/
│   ├── analytics/       # Analytics components
│   ├── dashboard/       # Dashboard components
│   ├── design-system/   # Visual design editor
│   └── ui/              # shadcn/ui components
├── contexts/            # AuthContext
├── hooks/               # Custom hooks
├── integrations/        # Supabase/Lovable clients
├── lib/                 # Utilities
├── pages/               # Pages/routes
├── stores/              # Zustand stores
├── types/               # TypeScript types
└── utils/               # Utility functions
```

---

## 5. Routes

| Route | Component | Description | Auth |
|-------|-----------|-------------|------|
| `/` | Index | Landing page | ❌ |
| `/auth` | Auth | Login/Sign up | ❌ |
| `/auth/callback` | AuthCallback | OAuth callback | ❌ |
| `/dashboard` | Dashboard | Main panel | ✅ |
| `/analytics` | Analytics | Detailed analytics | ✅ |
| `/:username` | PublicProfile | Public profile | ❌ |
| `/example` | ExampleProfile | Example profile | ❌ |
| `*` | NotFound | 404 page | ❌ |

---

## 6. Supported Link Types

| Type | ID | URL Detection |
|------|----|---------------|
| Instagram | instagram | instagram.com |
| X (Twitter) | x | x.com, twitter.com |
| TikTok | tiktok | tiktok.com |
| Facebook | facebook | facebook.com |
| LinkedIn | linkedin | linkedin.com |
| YouTube | youtube | youtube.com |
| GitHub | github | github.com |
| Google Drive | googledrive | drive.google.com |
| NotebookLM | notebooklm | notebooklm.google.com |
| Website | website | (fallback → Globe icon) |
| Email | email | mailto: |

---

## 7. Design System

### 7.1 CSS Tokens (index.css)

The system uses semantic HSL tokens:
- `--background`, `--foreground`
- `--primary`, `--primary-foreground`
- `--secondary`, `--muted`, `--accent`
- `--card`, `--popover`, `--border`
- `--destructive`

### 7.2 Dynamic Theming

Users can customize via `theme_options` (JSONB) in their profile:
- Primary and text colors
- Background color and gradients
- Button styles
- Fonts and typography
- Background image

---

## 8. Key Dependencies

| Package | Version | Usage |
|---------|---------|-------|
| react | ^18.3 | UI framework |
| @dnd-kit/core | ^6.3 | Drag and drop |
| @dnd-kit/sortable | ^10.0 | Sortable list |
| recharts | ^2.12 | Charts |
| zustand | ^5.0 | State management |
| react-router-dom | ^6.26 | Routing |
| react-simple-maps | ^3.0 | World map |
| sonner | ^1.5 | Toast notifications |
