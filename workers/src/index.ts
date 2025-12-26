import { PrismaClient } from '@prisma/client';
import { PrismaNeon } from '@prisma/adapter-neon';
import { Pool } from '@neondatabase/serverless';
import { nanoid } from 'nanoid';
import { hashEmail, generateEmailToken, sendListLinksEmail, sendVerificationEmail } from './email';

export interface Env {
  DATABASE_URL: string;
  RESEND_API_KEY: string;
  FRONTEND_URL: string;
}

// Prisma Client cache for Cloudflare Workers
let cachedPrisma: PrismaClient | undefined;

// Helper to create CORS headers
function corsHeaders(origin: string | null, frontendUrl: string) {
  const allowedOrigin = origin === frontendUrl ? origin : frontendUrl;
  return {
    'Access-Control-Allow-Origin': allowedOrigin,
    'Access-Control-Allow-Methods': 'GET, POST, PATCH, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };
}

// Helper to create JSON response with CORS
function jsonResponse(data: any, status: number, headers: Record<string, string>) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      ...headers,
    },
  });
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    const origin = request.headers.get('Origin');
    const headers = corsHeaders(origin, env.FRONTEND_URL);

    // Handle CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers });
    }

    // Initialize Prisma client with Neon adapter for Cloudflare Workers
    // Create new instances per request to avoid connection issues
    const pool = new Pool({ connectionString: env.DATABASE_URL });
    const adapter = new PrismaNeon(pool);
    const prisma = new PrismaClient({ adapter });

    try {
      // Health check
      if (url.pathname === '/api/health' && request.method === 'GET') {
        return jsonResponse({ status: 'ok' }, 200, headers);
      }

      // 1. Create a new list
      if (url.pathname === '/api/lists' && request.method === 'POST') {
        try {
          const body: any = await request.json();
          const { name } = body;

          console.log('Creating list with name:', name);

          if (!name || typeof name !== 'string') {
            return jsonResponse({ error: 'List name is required' }, 400, headers);
          }

          const creatorToken = nanoid(32);
          const buyerToken = nanoid(32);

          console.log('Generated tokens, creating in DB...');

          const list = await prisma.list.create({
            data: {
              name,
              creatorToken,
              buyerToken,
            },
          });

          console.log('List created successfully:', list.id);

          const baseUrl = env.FRONTEND_URL;

          return jsonResponse({
            creatorUrl: `${baseUrl}/list/creator/${creatorToken}`,
            buyerUrl: `${baseUrl}/list/buyer/${buyerToken}`,
          }, 200, headers);
        } catch (createError) {
          console.error('Error in create list endpoint:', createError);
          console.error('Create error type:', typeof createError);
          console.error('Create error keys:', Object.keys(createError || {}));
          throw createError;
        }
      }

      // 2. Creator View – Get List (BLIND RESPONSE)
      const creatorMatch = url.pathname.match(/^\/api\/lists\/creator\/([^/]+)$/);
      if (creatorMatch && request.method === 'GET') {
        const creatorToken = creatorMatch[1];

        const list = await prisma.list.findUnique({
          where: { creatorToken },
          include: {
            items: {
              select: {
                id: true,
                name: true,
                description: true,
                url: true,
                category: true,
                price: true,
                createdAt: true,
              },
              orderBy: {
                createdAt: 'asc',
              },
            },
          },
        });

        if (!list) {
          return jsonResponse({ error: 'List not found' }, 404, headers);
        }

        return jsonResponse({
          name: list.name,
          items: list.items,
        }, 200, headers);
      }

      // 3. Buyer View – Get List (FULL VIEW)
      const buyerMatch = url.pathname.match(/^\/api\/lists\/buyer\/([^/]+)$/);
      if (buyerMatch && request.method === 'GET') {
        const buyerToken = buyerMatch[1];

        const list = await prisma.list.findUnique({
          where: { buyerToken },
          include: {
            items: {
              orderBy: {
                createdAt: 'asc',
              },
            },
          },
        });

        if (!list) {
          return jsonResponse({ error: 'List not found' }, 404, headers);
        }

        return jsonResponse({
          name: list.name,
          items: list.items,
        }, 200, headers);
      }

      // 4. Creator – Add Item
      const addItemMatch = url.pathname.match(/^\/api\/lists\/creator\/([^/]+)\/items$/);
      if (addItemMatch && request.method === 'POST') {
        const creatorToken = addItemMatch[1];
        const body: any = await request.json();
        const { name, description, url: itemUrl, category, price } = body;

        if (!name || typeof name !== 'string') {
          return jsonResponse({ error: 'Item name is required' }, 400, headers);
        }

        const list = await prisma.list.findUnique({
          where: { creatorToken },
        });

        if (!list) {
          return jsonResponse({ error: 'List not found' }, 404, headers);
        }

        const item = await prisma.item.create({
          data: {
            listId: list.id,
            name,
            description: description || null,
            url: itemUrl || null,
            category: category || null,
            price: price ? parseFloat(price) : null,
          },
          select: {
            id: true,
            name: true,
            description: true,
            url: true,
            category: true,
            price: true,
            createdAt: true,
          },
        });

        return jsonResponse(item, 200, headers);
      }

      // 5. Creator – Edit Item
      const editItemMatch = url.pathname.match(/^\/api\/lists\/creator\/([^/]+)\/items\/([^/]+)$/);
      if (editItemMatch && request.method === 'PATCH') {
        const creatorToken = editItemMatch[1];
        const itemId = editItemMatch[2];
        const body: any = await request.json();
        const { name, description, url: itemUrl, category, price } = body;

        const list = await prisma.list.findUnique({
          where: { creatorToken },
        });

        if (!list) {
          return jsonResponse({ error: 'List not found' }, 404, headers);
        }

        const item = await prisma.item.findFirst({
          where: {
            id: itemId,
            listId: list.id,
          },
        });

        if (!item) {
          return jsonResponse({ error: 'Item not found' }, 404, headers);
        }

        const updatedItem = await prisma.item.update({
          where: { id: itemId },
          data: {
            ...(name !== undefined && { name }),
            ...(description !== undefined && { description }),
            ...(itemUrl !== undefined && { url: itemUrl }),
            ...(category !== undefined && { category }),
            ...(price !== undefined && { price: price ? parseFloat(price) : null }),
          },
          select: {
            id: true,
            name: true,
            description: true,
            url: true,
            category: true,
            price: true,
            createdAt: true,
          },
        });

        return jsonResponse(updatedItem, 200, headers);
      }

      // 6. Creator – Delete Item
      if (editItemMatch && request.method === 'DELETE') {
        const creatorToken = editItemMatch[1];
        const itemId = editItemMatch[2];

        const list = await prisma.list.findUnique({
          where: { creatorToken },
        });

        if (!list) {
          return jsonResponse({ error: 'List not found' }, 404, headers);
        }

        const item = await prisma.item.findFirst({
          where: {
            id: itemId,
            listId: list.id,
          },
        });

        if (!item) {
          return jsonResponse({ error: 'Item not found' }, 404, headers);
        }

        await prisma.item.delete({
          where: { id: itemId },
        });

        return jsonResponse({ success: true }, 200, headers);
      }

      // 7. Buyer – Toggle Purchased
      const togglePurchasedMatch = url.pathname.match(/^\/api\/lists\/buyer\/([^/]+)\/items\/([^/]+)\/toggle-purchased$/);
      if (togglePurchasedMatch && request.method === 'POST') {
        const buyerToken = togglePurchasedMatch[1];
        const itemId = togglePurchasedMatch[2];

        const list = await prisma.list.findUnique({
          where: { buyerToken },
        });

        if (!list) {
          return jsonResponse({ error: 'List not found' }, 404, headers);
        }

        const item = await prisma.item.findFirst({
          where: {
            id: itemId,
            listId: list.id,
          },
        });

        if (!item) {
          return jsonResponse({ error: 'Item not found' }, 404, headers);
        }

        const updatedItem = await prisma.item.update({
          where: { id: itemId },
          data: {
            purchased: !item.purchased,
          },
        });

        return jsonResponse({
          id: updatedItem.id,
          name: updatedItem.name,
          purchased: updatedItem.purchased,
        }, 200, headers);
      }

      // 8. Associate Email with List
      const associateEmailMatch = url.pathname.match(/^\/api\/lists\/([^/]+)\/associate-email$/);
      if (associateEmailMatch && request.method === 'POST') {
        const creatorToken = associateEmailMatch[1];
        const body: any = await request.json();
        const { email } = body;

        if (!email || typeof email !== 'string' || !email.includes('@')) {
          return jsonResponse({ error: 'Valid email is required' }, 400, headers);
        }

        const list = await prisma.list.findUnique({
          where: { creatorToken },
        });

        if (!list) {
          return jsonResponse({ error: 'List not found' }, 404, headers);
        }

        const hashedEmail = await hashEmail(email);

        await prisma.list.update({
          where: { creatorToken },
          data: {
            creatorEmail: hashedEmail,
            emailVerified: true,
          },
        });

        // Send confirmation email with list links
        const baseUrl = env.FRONTEND_URL;
        await sendListLinksEmail(env.RESEND_API_KEY, baseUrl, email, [{
          name: list.name,
          creatorUrl: `${baseUrl}/list/creator/${list.creatorToken}`,
          buyerUrl: `${baseUrl}/list/buyer/${list.buyerToken}`,
        }]);

        return jsonResponse({ success: true }, 200, headers);
      }

      // 9. Request List Lookup (sends magic link)
      if (url.pathname === '/api/lists/lookup' && request.method === 'POST') {
        const body: any = await request.json();
        const { email } = body;

        if (!email || typeof email !== 'string' || !email.includes('@')) {
          return jsonResponse({ error: 'Valid email is required' }, 400, headers);
        }

        const hashedEmail = await hashEmail(email);

        // Find all lists associated with this email
        const lists = await prisma.list.findMany({
          where: {
            creatorEmail: hashedEmail,
            emailVerified: true,
          },
        });

        if (lists.length === 0) {
          // Don't reveal if email exists or not (security)
          return jsonResponse({
            success: true,
            message: 'If lists exist for this email, a link has been sent.'
          }, 200, headers);
        }

        // Generate email token and store it
        const emailToken = generateEmailToken();

        // Update all lists with the same email token (for this session)
        await prisma.list.updateMany({
          where: {
            creatorEmail: hashedEmail,
          },
          data: {
            emailToken,
          },
        });

        // Send verification email
        const emailSent = await sendVerificationEmail(
          env.RESEND_API_KEY,
          env.FRONTEND_URL,
          email,
          emailToken
        );

        if (!emailSent) {
          console.error('Failed to send verification email to:', email);
          return jsonResponse({ error: 'Failed to send verification email' }, 500, headers);
        }

        return jsonResponse({
          success: true,
          message: 'If lists exist for this email, a link has been sent.'
        }, 200, headers);
      }

      // 10. Verify Email Token and Get Lists
      const verifyEmailMatch = url.pathname.match(/^\/api\/lists\/verify-email\/([^/]+)$/);
      if (verifyEmailMatch && request.method === 'GET') {
        const emailToken = verifyEmailMatch[1];

        // Find all lists with this email token
        const lists = await prisma.list.findMany({
          where: {
            emailToken,
            emailVerified: true,
          },
        });

        if (lists.length === 0) {
          return jsonResponse({ error: 'Invalid or expired token' }, 404, headers);
        }

        const baseUrl = env.FRONTEND_URL;

        // Return list information
        const result = lists.map(list => ({
          name: list.name,
          creatorToken: list.creatorToken,
          buyerToken: list.buyerToken,
          creatorUrl: `${baseUrl}/list/creator/${list.creatorToken}`,
          buyerUrl: `${baseUrl}/list/buyer/${list.buyerToken}`,
          createdAt: list.createdAt,
        }));

        // Clear the email token after use (one-time use)
        await prisma.list.updateMany({
          where: {
            emailToken,
          },
          data: {
            emailToken: null,
          },
        });

        return jsonResponse({ lists: result }, 200, headers);
      }

      // 404 - Route not found
      return jsonResponse({ error: 'Not found' }, 404, headers);

    } catch (error) {
      console.error('Error caught:', error);
      // Log the full error details
      if (error instanceof Error) {
        console.error('Error message:', error.message);
        console.error('Error stack:', error.stack);
        console.error('Error name:', error.name);
      } else {
        console.error('Non-error object:', JSON.stringify(error));
      }
      return jsonResponse({
        error: 'Internal server error',
        details: error instanceof Error ? error.message : String(error)
      }, 500, headers);
    } finally {
      try {
        await prisma.$disconnect();
      } catch (e) {
        console.error('Error disconnecting:', e);
      }
    }
  },

  // Scheduled cron job to keep Supabase database alive
  // Runs twice weekly (Sunday and Wednesday at midnight UTC)
  async scheduled(_event: ScheduledEvent, env: Env, _ctx: ExecutionContext): Promise<void> {
    console.log('[KEEPALIVE] Running scheduled database keepalive at', new Date().toISOString());

    try {
      const pool = new Pool({ connectionString: env.DATABASE_URL });
      const adapter = new PrismaNeon(pool);
      const prisma = new PrismaClient({ adapter });

      // Perform a simple query to keep the database active
      await prisma.$queryRaw`SELECT 1`;

      await prisma.$disconnect();
      console.log('[KEEPALIVE] Database ping successful');
    } catch (error) {
      console.error('[KEEPALIVE] Database ping failed:', error);
    }
  },
};
