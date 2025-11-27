# BlindList Deployment Guide

This guide walks you through deploying BlindList using Railway (backend) and Hostinger (frontend).

## Overview

- **Backend**: Deployed to Railway with PostgreSQL database
- **Frontend**: Static files deployed to Hostinger
- **Cost**: Free tier on Railway, existing Hostinger Pro hosting

## Prerequisites

- Railway account (sign up at https://railway.app)
- Hostinger Pro account with file access
- Resend API key (from your account at https://resend.com)

## Part 1: Deploy Backend to Railway

### 1.1 Create Railway Project

1. Go to https://railway.app and sign in
2. Click "New Project"
3. Select "Deploy from GitHub repo"
4. Connect your GitHub account and select the BlindList repository
5. Railway will detect the `railway.json` configuration automatically

### 1.2 Add PostgreSQL Database

1. In your Railway project, click "New Service"
2. Select "Database" → "PostgreSQL"
3. Railway will automatically create a PostgreSQL database
4. Copy the `DATABASE_URL` from the database service's variables tab

### 1.3 Configure Environment Variables

In your Railway backend service, go to the "Variables" tab and add:

```
DATABASE_URL=<paste the PostgreSQL connection string from step 1.2>
RESEND_API_KEY=re_Z5KRqjU3_JHxzoUxDb9vFMmvyJwfhEdf1
FRONTEND_URL=https://yourdomain.com
PORT=3000
NODE_ENV=production
```

**Important**: Replace `https://yourdomain.com` with your actual Hostinger domain.

### 1.4 Deploy

1. Railway will automatically deploy when you push to your repository
2. Manual deployment: Click "Deploy" in the Railway dashboard
3. Wait for build to complete (this runs: `npm install`, `prisma generate`, `npm run build`)
4. After deployment, Railway runs: `prisma migrate deploy` and `npm start`

### 1.5 Get Your Backend URL

1. In Railway, go to your backend service
2. Click "Settings" → "Generate Domain"
3. Copy the generated URL (e.g., `https://your-app-production.up.railway.app`)
4. **Save this URL** - you'll need it for the frontend configuration

## Part 2: Deploy Frontend to Hostinger

### 2.1 Build the Frontend

On your local machine, create a production build:

```bash
# From the project root directory
cd frontend

# Create .env.production file
echo "VITE_API_URL=https://your-app-production.up.railway.app" > .env.production

# Build the frontend
npm run build
```

**Important**: Replace `https://your-app-production.up.railway.app` with your actual Railway backend URL from step 1.5.

This creates a `frontend/dist` folder with all static files.

### 2.2 Upload to Hostinger

1. Log in to Hostinger's hPanel
2. Go to "File Manager"
3. Navigate to your website's `public_html` directory (or the appropriate domain folder)
4. Upload all files from `frontend/dist` to this directory
5. Your file structure should look like:
   ```
   public_html/
   ├── index.html
   ├── assets/
   │   ├── index-[hash].css
   │   └── index-[hash].js
   └── vite.svg
   ```

### 2.3 Configure URL Rewriting (for React Router)

Create or edit `.htaccess` file in your `public_html` directory:

```apache
<IfModule mod_rewrite.c>
  RewriteEngine On
  RewriteBase /
  RewriteRule ^index\.html$ - [L]
  RewriteCond %{REQUEST_FILENAME} !-f
  RewriteCond %{REQUEST_FILENAME} !-d
  RewriteRule . /index.html [L]
</IfModule>
```

This ensures that all routes (like `/my-lists`, `/find-lists`) work correctly.

## Part 3: Final Configuration

### 3.1 Update Railway Environment Variable

Go back to Railway and update the `FRONTEND_URL` variable to match your actual Hostinger domain:

```
FRONTEND_URL=https://yourdomain.com
```

This is important for CORS and email link generation.

### 3.2 Test the Deployment

1. Visit your Hostinger domain
2. Create a test wishlist
3. Try adding items with prices
4. Test the buyer link
5. Test email lookup functionality
6. Verify all features work

### 3.3 Monitor Railway Logs

If something doesn't work:

1. Go to Railway dashboard
2. Click on your backend service
3. View the "Deployments" tab
4. Click "View Logs" to see any errors

## Environment Variables Reference

### Backend (Railway)

| Variable | Description | Example |
|----------|-------------|---------|
| `DATABASE_URL` | PostgreSQL connection string | Automatically set by Railway |
| `RESEND_API_KEY` | Your Resend API key for emails | `re_xxxxx` |
| `FRONTEND_URL` | Your Hostinger domain | `https://yourdomain.com` |
| `PORT` | Server port | `3000` |
| `NODE_ENV` | Environment | `production` |

### Frontend (.env.production)

| Variable | Description | Example |
|----------|-------------|---------|
| `VITE_API_URL` | Railway backend URL | `https://your-app.up.railway.app` |

## Updating Your Deployment

### Update Backend

1. Push changes to GitHub
2. Railway automatically redeploys
3. Database migrations run automatically via `prisma migrate deploy`

### Update Frontend

1. Make your changes locally
2. Run `npm run build` in the frontend directory
3. Upload new `dist` files to Hostinger via File Manager
4. Clear browser cache to see changes

## Troubleshooting

### Backend Issues

**Database connection errors:**
- Verify `DATABASE_URL` is set correctly in Railway
- Check Railway logs for specific error messages

**Email not sending:**
- Verify `RESEND_API_KEY` is correct
- Check Resend dashboard for delivery status

**CORS errors:**
- Verify `FRONTEND_URL` matches your Hostinger domain exactly
- Include protocol (`https://`) and no trailing slash

### Frontend Issues

**404 errors on routes:**
- Verify `.htaccess` file is present and correct
- Ensure mod_rewrite is enabled on Hostinger

**API calls failing:**
- Check `VITE_API_URL` in `.env.production`
- Verify Railway backend is running
- Check browser console for specific errors

**Blank page:**
- Check browser console for JavaScript errors
- Verify all files uploaded correctly to Hostinger
- Clear browser cache

## Cost Estimates

- **Railway Free Tier**: $5 credit/month (typically enough for small apps)
- **Hostinger**: Already covered by your existing plan
- **Resend**: Free tier includes 3,000 emails/month

## Database Backups

Railway automatically backs up your PostgreSQL database. To manually backup:

1. In Railway, go to your PostgreSQL service
2. Click "Data" tab
3. Use the backup/export options

You can also use `pg_dump` with the `DATABASE_URL` connection string.

## Security Notes

- Never commit `.env` files to GitHub
- Keep your `RESEND_API_KEY` secret
- Railway automatically uses HTTPS
- Consider adding rate limiting for production use
- Email tokens are one-time use only
- Emails are hashed before storage (SHA-256)

## Support

If you encounter issues:
- Check Railway logs for backend errors
- Check browser console for frontend errors
- Verify all environment variables are set correctly
- Ensure database migrations have run successfully
