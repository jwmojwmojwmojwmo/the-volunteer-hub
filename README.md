# Volunteer Hub

Volunteer Hub is a volunteer engagement website that helps people find meaningful community opportunities and helps organizations run reliable, well-tracked events.

## What This Website Does

The platform connects two sides of community service:

- Volunteers discover events, apply, track accepted/completed activity, and build a verifiable service record.
- Organizations publish opportunities, review applicants, manage attendance, and track event outcomes.

## Volunteer Experience

- Discover opportunities through searchable listings and a map-based view.
- Apply to events and monitor application status across tabs (applied, accepted, rejected, past).
- Manage profile details and skills used for matching.
- View progression and milestones as hours/events are completed.
- Generate an official Record of Service document with a verification ID and PDF export.

## Organization Experience

- Create and manage volunteer events.
- Define event requirements, capacity, and details.
- Review volunteer applications and track attendance.
- Use AI-assisted drafting tools to accelerate event creation.

## Trust, Verification, and Accountability

- Session-aware authentication via Supabase.
- Database-backed volunteer hours and event completion records.
- Verified certification display on the service record.
- Official certificate-style output for schools, employers, and partner organizations.

## Key Pages

- Volunteer browser and dashboard: /
- Volunteer applications: /volunteer/applications
- Volunteer progression: /volunteer/progression
- Volunteer official record: /volunteer/certificate
- Organization event management: /org/events
- New organization event: /org/events/new

## Technology

- Next.js 15, React 19, TypeScript
- Tailwind CSS
- Supabase (Auth + Database)
- Leaflet / React Leaflet
- Google Gemini API (event drafting support)

## Quick Local Run

1. Install dependencies: npm install
2. Copy .env.example to .env.local
3. Set required env values
4. Run: npm run dev

Default local URL: http://localhost:3000

## Environment Variables

Required:

- NEXT_PUBLIC_SUPABASE_URL
- NEXT_PUBLIC_SUPABASE_ANON_KEY (or NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY)

Optional/feature-specific:

- GEMINI_API_KEY
- SUPABASE_SERVICE_ROLE_KEY

## Scripts

- npm run dev
- npm run build
- npm run start
- npm run lint
- npm run type-check

## Database

- SQL migrations are in supabase/migrations/
- Keep app types and schema aligned when migrations change

## Troubleshooting

If build/runtime artifacts become inconsistent (for example ENOENT in .next/server), stop running Next processes, delete .next, then rebuild.

PowerShell quick reset:

if (Test-Path .next) { Remove-Item -Recurse -Force .next }
npm run build
npm run start

## License

Internal project for Volunteer Hub.