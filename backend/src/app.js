require('dotenv').config();

const express     = require('express');
const helmet      = require('helmet');
const cors        = require('cors');
const rateLimit   = require('express-rate-limit');
const { connectMongoDB } = require('./config/database');

// 라우터
const authRouter      = require('./routes/auth');
const characterRouter = require('./routes/character');
const combatRouter    = require('./routes/combat');
const petRouter       = require('./routes/pet');
const itemRouter      = require('./routes/item');
const questRouter     = require('./routes/quest');

const app  = express();
const PORT = process.env.PORT || 3000;

// ── 미들웨어 ──────────────────────────────────────────
app.use(helmet());
app.use(cors());
app.use(express.json());

// 전역 Rate Limit (분당 100 요청)
app.use(rateLimit({
  windowMs: 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
}));

// ── 라우터 ────────────────────────────────────────────
app.use('/api/auth',      authRouter);
app.use('/api/character', characterRouter);
app.use('/api/combat',    combatRouter);
app.use('/api/pet',       petRouter);
app.use('/api/item',      itemRouter);
app.use('/api/quest',     questRouter);

// 헬스 체크
app.get('/health', (_req, res) => res.json({ status: 'ok', version: '0.1.0' }));

// 404 핸들러
app.use((_req, res) => res.status(404).json({ error: 'NOT_FOUND' }));

// 전역 에러 핸들러
app.use((err, _req, res, _next) => {
  console.error('[ERROR]', err);
  res.status(500).json({ error: 'INTERNAL_SERVER_ERROR' });
});

// ── 서버 시작 ─────────────────────────────────────────
async function start() {
  await connectMongoDB();
  app.listen(PORT, () => {
    console.log(`[Server] 에테르나 크로니클 API 서버 실행 중 — http://localhost:${PORT}`);
  });
}

start();

module.exports = app; // 테스트용
