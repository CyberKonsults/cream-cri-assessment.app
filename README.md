# CREAM AI Assessment Tool
# CREAM Digital Assessment Platform (CRI Profile)

This React app allows users to conduct CRI-based diagnostic assessments, powered by Supabase for data storage and AI for evaluation.

## Features
- Tier-based CRI assessment structure
- Upload and store evidence
- AI scoring engine
- Email simulation
- CSV/PDF export
- Real-time scoring chart

## Deployment (Vercel)
1. Install Vercel CLI: `npm i -g vercel`
2. Login: `vercel login`
3. Link project: `vercel`
4. Set environment variables:
   ```bash
   vercel env add NEXT_PUBLIC_SUPABASE_URL
   vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY
   ```
5. Deploy: `vercel --prod`

## Local Dev
```bash
npm install
cp .env.local.example .env.local
npm run dev
```

---
MIT License. Developed by CREAM Governance.

