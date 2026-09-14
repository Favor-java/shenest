import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import './db.js';
import { authRouter } from './routes/auth.js';
import { propertiesRouter } from './routes/properties.js';
import { socialRouter } from './routes/social.js';

const app = express();
const port = process.env.PORT || 4000;

app.use(cors());
app.use(express.json());

app.use('/api/auth', authRouter);
app.use('/api/properties', propertiesRouter);
app.use('/api', socialRouter);

app.get('/api/health', (req, res) => res.json({ ok: true, message: 'SheNest REST API is working.' }));

app.listen(port, () => console.log(`SheNest API running on http://localhost:${port}`));
