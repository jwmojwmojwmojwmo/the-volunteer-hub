# youcode-2026


## Quick Start

1. Install dependencies:

	npm install

2. Copy environment template:

	copy .env.example .env.local

3. Run development server:

	npm run dev

## Folder Structure

.
|- .env.example
|- middleware.ts
|- next.config.ts
|- package.json
|- postcss.config.mjs
|- tailwind.config.ts
|- tsconfig.json
|- supabase/
|  |- migrations/
|     |- .gitkeep
|- src/
|  |- app/
|  |  |- globals.css
|  |  |- layout.tsx
|  |  |- page.tsx
|  |- components/
|  |  |- .gitkeep
|  |- features/
|  |  |- .gitkeep
|  |- lib/
|  |  |- utils.ts
|  |  |- supabase/
|  |     |- client.ts
|  |     |- middleware.ts
|  |     |- server.ts
|  |- types/
|     |- database.ts

## Notes

- Put domain-specific code in src/features.
- Put shared UI in src/components.
- Replace src/types/database.ts with generated Supabase types when your schema is ready.