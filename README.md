# SheNest

SheNest is a beginner-friendly accommodation and roommate platform designed for women. The project is intentionally simple enough to learn from while still covering a useful MVP.

## Tech stack

### Frontend
- React
- Vite
- React Router
- Lucide React icons
- Normal browser `fetch()` requests

### Backend
- Node.js
- Express REST API
- JWT authentication
- bcrypt password hashing
- Multer for local image uploads

### Database
- SQLite
- `better-sqlite3`

There is **no GraphQL, Prisma, PostgreSQL server or ORM** in this version. React talks to Express using REST endpoints, and Express talks directly to SQLite using SQL.

## MVP features

- Renter and landlord registration/login
- Property listings
- Property search and filters
- Property image uploads
- Favorites
- Direct messaging with property owners
- Roommate profiles
- Roommate messaging
- Reviews and ratings
- Booking requests
- Landlord booking approval/decline
- Landlord dashboard
- User account/profile page
- Role-aware navigation
- Admin property verification
- Loading, empty, success and error states
- Friendly 404 page

## Download the project

The current MVP is on the `build/initial-app` branch.

```bash
git clone https://github.com/akdavid4real/shenest.git
cd shenest
git checkout build/initial-app
```

## Project structure

```text
shenest/
├── client/
│   └── src/
│       ├── api/          # fetch helper
│       ├── components/   # reusable UI components
│       ├── pages/        # application screens
│       ├── App.jsx
│       └── main.jsx
│
├── server/
│   ├── data/             # SQLite database is created here
│   ├── uploads/          # uploaded property images
│   │   └── seed/         # generated demo property images
│   └── src/
│       ├── middleware/   # JWT authentication
│       ├── routes/       # Express REST routes
│       ├── db.js         # SQLite connection and tables
│       ├── seed.js       # demo seed data
│       └── server.js     # Express entry point
│
└── README.md
```

## Generated seed images

The demo seed expects these files inside:

```text
server/uploads/seed/
```

Expected filenames:

```text
cozy-blush-studio.png
bright-yaba-room.png
modern-ikeja-apartment.png
premium-ikoyi-bedroom.png
akoka-shared-room.png
vi-city-studio.png
gbagada-apartment.png
surulere-room.png
```

The seed script references them through URLs such as:

```text
http://localhost:4000/uploads/seed/cozy-blush-studio.png
```

## Install dependencies

### Backend

```bash
cd server
npm install
```

### Frontend

Open another terminal:

```bash
cd client
npm install
```

## Environment setup

Inside `server/`, copy the example environment file:

### Git Bash / macOS / Linux

```bash
cp .env.example .env
```

### Windows Command Prompt

```cmd
copy .env.example .env
```

The server only needs a port and JWT secret. SQLite does not need a database URL.

Example:

```env
PORT=4000
JWT_SECRET="replace-this-with-a-long-random-secret"
```

## Seed the SQLite database

From the `server` folder:

```bash
npm run seed
```

This creates/populates:

```text
server/data/shenest.db
```

The demo dataset contains:

- 8 users
- 2 landlords
- 1 admin
- 5 regular users
- 8 Lagos property listings
- roommate profiles
- reviews
- favorites
- booking requests
- approved, pending and declined booking examples
- landlord conversations
- roommate conversations

The property locations include Lekki, Yaba, Ikeja, Ikoyi, Akoka, Victoria Island, Gbagada and Surulere.

The seed script can be run again safely. It clears the demo records and recreates a clean development dataset.

## Demo accounts

All seeded demo accounts use:

```text
password123
```

### Landlords

```text
landlord@shenest.test
tomi.landlord@shenest.test
```

### Admin

```text
admin@shenest.test
```

### Regular users

```text
ada@shenest.test
zainab@shenest.test
temi@shenest.test
chioma@shenest.test
rita@shenest.test
```

New users can also register normally and choose whether they are **looking for a home** or registering as a **landlord**.

## Run the application

You need two terminals.

### Terminal 1 — backend

```bash
cd server
npm run dev
```

The API runs at:

```text
http://localhost:4000
```

Health check:

```text
http://localhost:4000/api/health
```

### Terminal 2 — frontend

```bash
cd client
npm run dev
```

Vite normally starts at:

```text
http://localhost:5173
```

Use the exact URL printed in your terminal if Vite selects a different port.

## Normal first-time setup

From a fresh clone, the normal order is:

```bash
# Clone
git clone https://github.com/akdavid4real/shenest.git
cd shenest
git checkout build/initial-app

# Install backend
cd server
npm install
cp .env.example .env
npm run seed
npm run dev
```

Then open a second terminal:

```bash
cd shenest/client
npm install
npm run dev
```

Make sure the generated seed images have been copied into `server/uploads/seed/` before opening the property listings if you want all seeded properties to display their matching local images.

## How the application works

A normal request is intentionally easy to trace:

```text
React page
   ↓
api() / fetch()
   ↓
Express REST route
   ↓
db.prepare("SQL...")
   ↓
SQLite
   ↓
JSON response
   ↓
React renders the result
```

Example:

```text
Properties.jsx
   ↓ GET /api/properties
properties.js Express route
   ↓ SELECT * FROM properties
SQLite
```

This is why the project does not use GraphQL or Prisma: the goal is to keep the backend flow clear and understandable.

## Main REST API areas

```text
/api/auth
/api/properties
/api/favorites
/api/bookings
/api/reviews
/api/roommates
/api/messages
/api/account
/api/uploads
```

Authentication-protected routes expect:

```text
Authorization: Bearer <JWT token>
```

The small frontend API helper adds this automatically after login.

## Property images

Users can upload property images directly from the listing form.

- Maximum image size: 5 MB
- Images are saved in `server/uploads/`
- Seed images live in `server/uploads/seed/`
- Express serves `/uploads` as static files

For this beginner/local version, images are intentionally stored on disk rather than using S3, Cloudinary or another external storage service.

## SQLite notes

SQLite is stored in one file:

```text
server/data/shenest.db
```

You do not need to install PostgreSQL, MySQL or another database server.

To reset the development data, simply run:

```bash
cd server
npm run seed
```

## Important development note

The following folders are ignored by Git because they contain runtime/local data:

```text
server/data/
server/uploads/
node_modules/
dist/
.env
```

So cloning the repository gives you the source code, while `npm run seed` creates the SQLite data locally. The generated seed image bundle needs to be copied into `server/uploads/seed/` separately.

## Current architecture

```text
React + Vite
     ↓
REST fetch requests
     ↓
Express
     ↓
Direct SQL
     ↓
SQLite
```

SheNest deliberately favors straightforward, readable code over unnecessary abstraction so someone learning JavaScript, React and Express can follow the full application flow.