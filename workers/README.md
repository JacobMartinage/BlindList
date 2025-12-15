# BlindList - Cloudflare Workers Backend

This is the Cloudflare Workers implementation of the BlindList backend.

## Quick Start

```bash
# Install dependencies
npm install

# Login to Cloudflare
npx wrangler login

# Set secrets
npx wrangler secret put DATABASE_URL
npx wrangler secret put RESEND_API_KEY
npx wrangler secret put FRONTEND_URL

# Deploy
npm run deploy
```

See `../CLOUDFLARE_DEPLOY.md` for full deployment guide.

## Development

```bash
# Run locally
npm run dev

# View logs
npm run tail

# Deploy
npm run deploy
```

## Environment Variables

Set these as secrets:

- `DATABASE_URL` - Supabase PostgreSQL connection string
- `RESEND_API_KEY` - Your Resend API key
- `FRONTEND_URL` - Your frontend domain (e.g., https://yourdomain.com)

## Stack

- **Runtime**: Cloudflare Workers
- **Database**: PostgreSQL (via Supabase)
- **ORM**: Prisma with connection pooling
- **Email**: Resend
