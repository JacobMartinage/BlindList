import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { PrismaClient } from '@prisma/client';
import { nanoid } from 'nanoid';
import { hashEmail, generateEmailToken, sendListLinksEmail, sendVerificationEmail } from './email';

const app = express();
const prisma = new PrismaClient();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

// 1. Create a new list
app.post('/api/lists', async (req, res) => {
  try {
    const { name } = req.body;

    if (!name || typeof name !== 'string') {
      return res.status(400).json({ error: 'List name is required' });
    }

    const creatorToken = nanoid(32);
    const buyerToken = nanoid(32);

    const list = await prisma.list.create({
      data: {
        name,
        creatorToken,
        buyerToken,
      },
    });

    const baseUrl = process.env.FRONTEND_URL || 'http://localhost:5173';

    res.json({
      creatorUrl: `${baseUrl}/list/creator/${creatorToken}`,
      buyerUrl: `${baseUrl}/list/buyer/${buyerToken}`,
    });
  } catch (error) {
    console.error('Error creating list:', error);
    res.status(500).json({ error: 'Failed to create list' });
  }
});

// 2. Creator View – Get List (BLIND RESPONSE)
app.get('/api/lists/creator/:creatorToken', async (req, res) => {
  try {
    const { creatorToken } = req.params;

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
            // Explicitly exclude 'purchased' field
          },
          orderBy: {
            createdAt: 'asc',
          },
        },
      },
    });

    if (!list) {
      return res.status(404).json({ error: 'List not found' });
    }

    res.json({
      name: list.name,
      items: list.items,
    });
  } catch (error) {
    console.error('Error fetching creator list:', error);
    res.status(500).json({ error: 'Failed to fetch list' });
  }
});

// 3. Buyer View – Get List (FULL VIEW)
app.get('/api/lists/buyer/:buyerToken', async (req, res) => {
  try {
    const { buyerToken } = req.params;

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
      return res.status(404).json({ error: 'List not found' });
    }

    res.json({
      name: list.name,
      items: list.items,
    });
  } catch (error) {
    console.error('Error fetching buyer list:', error);
    res.status(500).json({ error: 'Failed to fetch list' });
  }
});

// 4. Creator – Add Item
app.post('/api/lists/creator/:creatorToken/items', async (req, res) => {
  try {
    const { creatorToken } = req.params;
    const { name, description, url, category, price } = req.body;

    if (!name || typeof name !== 'string') {
      return res.status(400).json({ error: 'Item name is required' });
    }

    const list = await prisma.list.findUnique({
      where: { creatorToken },
    });

    if (!list) {
      return res.status(404).json({ error: 'List not found' });
    }

    const item = await prisma.item.create({
      data: {
        listId: list.id,
        name,
        description: description || null,
        url: url || null,
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
        // Explicitly exclude 'purchased'
      },
    });

    res.json(item);
  } catch (error) {
    console.error('Error adding item:', error);
    res.status(500).json({ error: 'Failed to add item' });
  }
});

// 5. Creator – Edit Item
app.patch('/api/lists/creator/:creatorToken/items/:itemId', async (req, res) => {
  try {
    const { creatorToken, itemId } = req.params;
    const { name, description, url, category, price } = req.body;

    const list = await prisma.list.findUnique({
      where: { creatorToken },
    });

    if (!list) {
      return res.status(404).json({ error: 'List not found' });
    }

    const item = await prisma.item.findFirst({
      where: {
        id: itemId,
        listId: list.id,
      },
    });

    if (!item) {
      return res.status(404).json({ error: 'Item not found' });
    }

    const updatedItem = await prisma.item.update({
      where: { id: itemId },
      data: {
        ...(name !== undefined && { name }),
        ...(description !== undefined && { description }),
        ...(url !== undefined && { url }),
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
        // Explicitly exclude 'purchased'
      },
    });

    res.json(updatedItem);
  } catch (error) {
    console.error('Error updating item:', error);
    res.status(500).json({ error: 'Failed to update item' });
  }
});

// 6. Creator – Delete Item
app.delete('/api/lists/creator/:creatorToken/items/:itemId', async (req, res) => {
  try {
    const { creatorToken, itemId } = req.params;

    const list = await prisma.list.findUnique({
      where: { creatorToken },
    });

    if (!list) {
      return res.status(404).json({ error: 'List not found' });
    }

    const item = await prisma.item.findFirst({
      where: {
        id: itemId,
        listId: list.id,
      },
    });

    if (!item) {
      return res.status(404).json({ error: 'Item not found' });
    }

    await prisma.item.delete({
      where: { id: itemId },
    });

    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting item:', error);
    res.status(500).json({ error: 'Failed to delete item' });
  }
});

// 7. Buyer – Toggle Purchased
app.post('/api/lists/buyer/:buyerToken/items/:itemId/toggle-purchased', async (req, res) => {
  try {
    const { buyerToken, itemId } = req.params;

    const list = await prisma.list.findUnique({
      where: { buyerToken },
    });

    if (!list) {
      return res.status(404).json({ error: 'List not found' });
    }

    const item = await prisma.item.findFirst({
      where: {
        id: itemId,
        listId: list.id,
      },
    });

    if (!item) {
      return res.status(404).json({ error: 'Item not found' });
    }

    const updatedItem = await prisma.item.update({
      where: { id: itemId },
      data: {
        purchased: !item.purchased,
      },
    });

    res.json({
      id: updatedItem.id,
      name: updatedItem.name,
      purchased: updatedItem.purchased,
    });
  } catch (error) {
    console.error('Error toggling purchased:', error);
    res.status(500).json({ error: 'Failed to toggle purchased status' });
  }
});

// 8. Associate Email with List
app.post('/api/lists/:creatorToken/associate-email', async (req, res) => {
  try {
    const { creatorToken } = req.params;
    const { email } = req.body;

    if (!email || typeof email !== 'string' || !email.includes('@')) {
      return res.status(400).json({ error: 'Valid email is required' });
    }

    const list = await prisma.list.findUnique({
      where: { creatorToken },
    });

    if (!list) {
      return res.status(404).json({ error: 'List not found' });
    }

    const hashedEmail = hashEmail(email);

    await prisma.list.update({
      where: { creatorToken },
      data: {
        creatorEmail: hashedEmail,
        emailVerified: true,
      },
    });

    // Send confirmation email with list links
    const baseUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    await sendListLinksEmail(email, [{
      name: list.name,
      creatorUrl: `${baseUrl}/list/creator/${list.creatorToken}`,
      buyerUrl: `${baseUrl}/list/buyer/${list.buyerToken}`,
    }]);

    res.json({ success: true });
  } catch (error) {
    console.error('Error associating email:', error);
    res.status(500).json({ error: 'Failed to associate email' });
  }
});

// 9. Request List Lookup (sends magic link)
app.post('/api/lists/lookup', async (req, res) => {
  try {
    const { email } = req.body;

    if (!email || typeof email !== 'string' || !email.includes('@')) {
      return res.status(400).json({ error: 'Valid email is required' });
    }

    const hashedEmail = hashEmail(email);

    // Find all lists associated with this email
    const lists = await prisma.list.findMany({
      where: {
        creatorEmail: hashedEmail,
        emailVerified: true,
      },
    });

    if (lists.length === 0) {
      // Don't reveal if email exists or not (security)
      return res.json({ success: true, message: 'If lists exist for this email, a link has been sent.' });
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
    const emailSent = await sendVerificationEmail(email, emailToken);

    if (!emailSent) {
      console.error('Failed to send verification email to:', email);
      return res.status(500).json({ error: 'Failed to send verification email' });
    }

    res.json({ success: true, message: 'If lists exist for this email, a link has been sent.' });
  } catch (error) {
    console.error('Error in list lookup:', error);
    res.status(500).json({ error: 'Failed to process request' });
  }
});

// 10. Verify Email Token and Get Lists
app.get('/api/lists/verify-email/:emailToken', async (req, res) => {
  try {
    const { emailToken } = req.params;

    // Find all lists with this email token
    const lists = await prisma.list.findMany({
      where: {
        emailToken,
        emailVerified: true,
      },
    });

    if (lists.length === 0) {
      return res.status(404).json({ error: 'Invalid or expired token' });
    }

    const baseUrl = process.env.FRONTEND_URL || 'http://localhost:5173';

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

    res.json({ lists: result });
  } catch (error) {
    console.error('Error verifying email token:', error);
    res.status(500).json({ error: 'Failed to verify token' });
  }
});

app.listen(PORT, () => {
  console.log(`🚀 BlindList backend running on http://localhost:${PORT}`);
});
