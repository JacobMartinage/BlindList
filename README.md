# BlindList

A frictionless wishlist app where list creators stay completely blind to what has been purchased.

## What is BlindList?

BlindList lets you create a shareable wishlist where buyers can mark items as purchased — but the list creator stays completely blind to what was bought. This keeps the element of surprise alive!

### Key Features

- **No login required** - Everything works via unique URL tokens
- **Privacy by design** - Creators can never see what's been purchased
- **Two special links** for each list:
  - **Creator Link**: Add and edit items, but stay blind to purchases
  - **Buyer Link**: See the list and mark items as purchased to avoid duplicates
- **Categories**: Organize items into categories
- **Item details**: Add descriptions and product URLs

## Tech Stack

- **Backend**: Node.js + Express + TypeScript
- **Database**: SQLite with Prisma ORM
- **Frontend**: React + Vite + TypeScript
- **Styling**: Tailwind CSS

## Getting Started

### Prerequisites

- Node.js 18+ and npm

### Installation

1. **Install all dependencies** (root, backend, and frontend):
   ```bash
   npm run install:all
   ```

2. **Set up the database**:
   ```bash
   cd backend
   npm run db:push
   cd ..
   ```

### Running the App

**Start both backend and frontend simultaneously**:
```bash
npm run dev
```

This will start:
- Backend on `http://localhost:3000`
- Frontend on `http://localhost:5173`

Or run them separately:

```bash
# Terminal 1 - Backend
npm run dev:backend

# Terminal 2 - Frontend
npm run dev:frontend
```

## How to Use

1. **Create a list**:
   - Visit `http://localhost:5173`
   - Enter a list name (e.g., "Jacob's Christmas 2025")
   - Click "Create List"

2. **Save your links**:
   - You'll get two links:
     - **Creator Link** - Use this to manage your list (you won't see purchases)
     - **Buyer Link** - Share this with friends and family

3. **Add items** (Creator):
   - Open your creator link
   - Click "+ Add Item"
   - Fill in item details (name, description, URL, category)
   - Save the item

4. **Mark items as purchased** (Buyer):
   - Open the buyer link
   - Click on any item to mark it as purchased
   - Click again to unmark if you change your mind

5. **Stay surprised** (Creator):
   - You can add, edit, or delete items anytime
   - But you'll never see which items have been purchased
   - Keep the surprise alive!

## Project Structure

```
BlindList/
├── backend/              # Express API server
│   ├── prisma/          # Database schema
│   │   └── schema.prisma
│   ├── src/
│   │   └── index.ts     # API routes
│   └── package.json
├── frontend/            # React application
│   ├── src/
│   │   ├── pages/      # Page components
│   │   │   ├── LandingPage.tsx
│   │   │   ├── CreatorView.tsx
│   │   │   └── BuyerView.tsx
│   │   ├── App.tsx
│   │   ├── main.tsx
│   │   └── types.ts
│   └── package.json
└── package.json         # Root package with scripts
```

## API Endpoints

### Create List
```
POST /api/lists
Body: { "name": "My List" }
Returns: { "creatorUrl": "...", "buyerUrl": "..." }
```

### Creator Endpoints (Blind to Purchases)
```
GET    /api/lists/creator/:creatorToken
POST   /api/lists/creator/:creatorToken/items
PATCH  /api/lists/creator/:creatorToken/items/:itemId
DELETE /api/lists/creator/:creatorToken/items/:itemId
```

### Buyer Endpoints (Full Access)
```
GET  /api/lists/buyer/:buyerToken
POST /api/lists/buyer/:buyerToken/items/:itemId/toggle-purchased
```

## Database Management

```bash
# Push schema changes to database
cd backend
npm run db:push

# Open Prisma Studio (database GUI)
npm run db:studio
```

## Privacy Guarantee

The creator endpoints **never** return the `purchased` field. This is enforced at the API level using Prisma's `select` to explicitly exclude the field. Even if someone tries to access the API directly with a creator token, they cannot see purchase information.

## Development Notes

- The database file is stored at `backend/dev.db`
- Tokens are generated using `nanoid` (32 characters)
- CORS is enabled for local development
- Frontend proxy redirects `/api/*` requests to backend

## License

MIT

---

Built with privacy in mind. Keep the surprises alive!
