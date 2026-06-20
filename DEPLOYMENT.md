# Deployment Guide

## Frontend

1. Create a Vercel project from this repository.
2. Add the variables from `.env.example`.
3. Build command: `npm run build`
4. Output directory: `dist`

## Backend

1. Create a Supabase project.
2. Apply `supabase/migrations/init.sql`.
3. Configure authentication and create storage buckets:
   - `member-photos`
   - `member-documents`
4. Deploy the edge function in `supabase/functions/birthday-reminder`.
5. Schedule daily execution at `07:00 Asia/Colombo`.

## Security Checklist

- Use real values for `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`
- Store SendGrid credentials in Supabase secrets, not frontend environment files
- Review RLS policies before production rollout
- Enable HTTPS-only custom domains on Vercel
