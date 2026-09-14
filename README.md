# SheNest

SheNest is a beginner-friendly accommodation and roommate platform designed for women.

## Stack

- React + Vite
- React Router
- Express REST API
- SQLite with `better-sqlite3`
- JWT authentication
- bcrypt password hashing
- Normal browser `fetch()` calls

There is no GraphQL, Prisma or separate database server. SQLite creates `server/data/shenest.db` automatically.

## Run locally

Open two terminals.

### 1. Backend

```bash
cd server
npm install
cp .env.example .env
npm run seed
npm run dev
```

The API runs at `http://localhost:4000`.

### 2. Frontend

```bash
cd client
npm install
npm run dev
```

Open the Vite URL shown in the terminal, normally `http://localhost:5173`.

## Demo accounts

Run `npm run seed` in `server` first. All demo accounts use password `password123`.

- Landlord: `landlord@shenest.test`
- Admin: `admin@shenest.test`
- User: `ada@shenest.test`

## How the app works

```text
React page
   ↓ fetch()
Express REST route
   ↓ SQL query
SQLite database
   ↓ JSON response
React displays the result
```

## Main folders

```text
client/src/
├── api/          # small fetch helper
├── components/   # reusable UI
└── pages/        # website screens

server/src/
├── middleware/   # JWT authentication
├── routes/       # REST endpoints
├── db.js         # SQLite connection + tables
├── seed.js       # demo data
└── server.js     # Express entry point
```

The project intentionally favors straightforward code over extra abstraction so a beginner can trace requests from the React page to Express and then directly to SQL.
