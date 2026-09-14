import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import './db.js';
import { authRouter } from './routes/auth.js';
import { propertiesRouter } from './routes/properties.js';

const app = express();
const port = process.env.PORT || 4000;

// These two lines let React call our API and send JSON request bodies.
app.use(cors());
app.use(express.json());

// Each feature gets a simple REST route.
app.use('/api/auth', authRouter);
app.use('/api/properties', propertiesRouter);

app.get('/api/health', (req, res) => {
  res.json({ ok: true, message: 'SheNest REST API is working.' });
});

app.listen(port, () => {
  console.log(`SheNest API running on http://localhost:${port}`);
});
