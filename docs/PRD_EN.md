# LinkHub Express — Product Requirements Document (PRD)

**Version:** 2.0 · **Date:** 2026-10-23 · **Status:** Active
**URLs:** https://linkhub.estudioai.site · https://linkhub-express.lovable.app

## 1. Overview
LinkHub Express is a link-in-bio platform. Each user gets a public page (`/{username}`) that collects their social profiles, websites and other content. It stands out for deep visual customization, a fast guided onboarding and detailed visit and click analytics.

## 2. Problem
Instagram, TikTok and similar networks allow only one bio link. Existing tools offer little visual customization or charge high fees for basics like analytics.

## 3. Solution
- A single fast, mobile-first public page.
- A 4-step onboarding that gets the page ready in minutes.
- Ready-made templates plus a custom editor (background, typography, buttons, avatar) with a live preview.
- Profile and per-link analytics: location, device, referrer and time.
- An admin panel for the master manager.

## 4. Personas
Personal, Creator, Business, and the Master admin.

## 5. User journey
```text
Landing -> Sign up/Login (email or Google) -> Email confirmation
 -> Onboarding: 1) Usage type 2) Profile details 3) Template 4) Platforms
 -> Dashboard (Links | Design | Analytics | Profile) -> View / Copy profile link
 -> Visitor opens /{username} -> views and clicks are tracked
```

## 6. Features
- **Landing:** light/dark toggle and an example page inside a smartphone mockup.
- **Auth:** email/password with required confirmation, Google login, persistent session.
- **Onboarding:** usage type (required), avatar/name/bio (bio up to 160 characters), 10+ templates, 12 platforms that become links automatically.
- **Links:** create, edit, delete and hide links; drag-and-drop ordering; automatic icons; click counter; a details dialog with the last 100 clicks.
- **Design:** a Templates tab and a Custom tab (background, typography, button style, corners and size, avatar), with a live preview that matches the public page.
- **Public page:** links open instantly (iOS-safe), and views and clicks are tracked.
- **Analytics:** totals, activity heatmap, world map, devices, insights.
- **Profile:** unique username, avatar crop, custom or preferred domain, copy link.
- **Admin:** stats, user search, deactivate/reactivate users, delete a user with all their data; admins cannot deactivate or delete themselves.

## 7. Success metrics
Signup conversion, onboarding completion rate, average links per user, monthly views and clicks, retention.

## 8. Roadmap
| Phase | Delivery | Status |
|---|---|---|
| v1.0–1.3 | Core link-in-bio, design, analytics | Complete |
| v2.0 | Onboarding, templates, admin, click details, custom domain | Complete |
| v2.1 | Alternative layouts, CSV export, filters | Planned |
| v3.0 | Paid plans, scheduling, integrations | Future |

## 9. Risks
LGPD compliance for visitor data, iOS link-opening rules, and the accuracy of the external geolocation service.

## 10. Stack
React 18, TypeScript, Vite, Tailwind, shadcn/ui, dnd-kit, Recharts, Zustand, Lovable Cloud.

Detailed requirements: see `REQUISITOS.md` (Portuguese).
