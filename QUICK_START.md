# Quick Start - Cloudflare Workers + Supabase

## 🎯 Goal
Move from Railway ($5/month) to Cloudflare Workers + Supabase ($0/month)

## ⚡ Quick Deploy (20 minutes)

### 1. Supabase Setup (5 min)
```bash
# 1. Go to https://supabase.com
# 2. Create project (save password!)
# 3. Get connection string from Settings → Database → URI
# Format: postgresql://postgres:YOUR_PASSWORD@db.YOUR_PROJECT_REF.supabase.co:5432/postgres
```

### 2. Cloudflare Deploy (10 min)
```bash
cd /Users/jaquibis/BlindList/workers

# Install
npm install

# Login to Cloudflare
npx wrangler login

# Set secrets
npx wrangler secret put DATABASE_URL
# Paste: postgresql://postgres:YOUR_PASSWORD@db.YOUR_PROJECT_REF.supabase.co:5432/postgres

npx wrangler secret put RESEND_API_KEY
# Paste: re_Z5KRqjU3_JHxzoUxDb9vFMmvyJwfhEdf1

npx wrangler secret put FRONTEND_URL
# Paste: https://yourdomain.com

# Deploy!
npm run deploy

# Initialize database
npx prisma db push
```

### 3. Update Frontend (5 min)
```bash
cd ../frontend

# Update API URL (use your Workers URL from deploy output)
echo "VITE_API_URL=https://blindlist.YOUR-SUBDOMAIN.workers.dev" > .env.production

# Build
npm run build

# Upload dist/ to Hostinger
```

### 4. Test
```bash
# Health check
curl https://blindlist.YOUR-SUBDOMAIN.workers.dev/api/health

# Should return: {"status":"ok"}
```

## ✅ Done!

- **Backend**: Cloudflare Workers (100k requests/day FREE)
- **Database**: Supabase (500MB FREE)
- **Cost**: $0/month

## 📝 What Changed

| Before | After |
|--------|-------|
| Railway Express API | Cloudflare Workers |
| Railway PostgreSQL | Supabase PostgreSQL |
| $5+/month | $0/month |

## 🛠️ Commands

```bash
cd workers

# Deploy
npm run deploy

# View logs
npm run tail

# Test locally
npm run dev
```

## 🆘 Help

- Full guide: See `CLOUDFLARE_DEPLOY.md`
- Issues? Run: `npm run tail` to see logs
- Database issues? Check Supabase dashboard
