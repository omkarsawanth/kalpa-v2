# Kalpa v2

Kalpa v2 is a modern career-development platform powered by Supabase and Gemini.

## Stack
- **Framework**: Vite + React
- **Styling**: Tailwind CSS v4 (dark glassmorphic design system)
- **Animations**: Framer Motion
- **Database & Auth**: Supabase (Postgres with strict Row Level Security)

## Environment Variables
Copy `.env.example` to `.env` and fill in your Supabase project credentials:
```bash
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

## Getting Started
```bash
npm install
npm run dev
```
