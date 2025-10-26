// Fastify mock backend for ft_transendence42
const fastify = require('fastify')({ logger: true });
const cors = require('@fastify/cors');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const { sendLogToLogstash } = require('./elk_logs');

const PORT = Number(process.env.PORT || 8000);

async function buildServer() {
  // CORS for local dev and nginx
  await fastify.register(cors, {
    origin: (origin, cb) => cb(null, true),
    credentials: true
  });

  // Health check
  fastify.get('/api/health', async () => ({ status: 'ok', ts: Date.now() }));

  // Players
  fastify.get('/api/players', async () => prisma.player.findMany());
  fastify.post('/api/players', async (req, reply) => {
    const { alias } = req.body;
    if (!alias) return reply.code(400).send({ error: 'Alias required' });
    const exists = await prisma.player.findUnique({ where: { alias } });
    if (exists) return reply.code(409).send({ error: 'Alias already exists' });
    return prisma.player.create({ data: { alias } });
  });

  // Queue
  fastify.get('/api/queue', async () =>
    prisma.queueEntry.findMany({ include: { player: true }, orderBy: { position: 'asc' } })
  );
  fastify.post('/api/queue', async (req, reply) => {
    const { playerId } = req.body;
    const count = await prisma.queueEntry.count();
    return prisma.queueEntry.create({ data: { playerId, position: count } });
  });
  fastify.delete('/api/queue/:playerId', async (req, reply) => {
    const { playerId } = req.params;
    return prisma.queueEntry.delete({ where: { playerId } });
  });

  // Schedule/Matches
  fastify.get('/api/schedule', async () =>
    prisma.match.findMany({ include: { p1: true, p2: true }, orderBy: { ts: 'asc' } })
  );
  fastify.post('/api/schedule', async (req, reply) => {
    const { p1Id, p2Id } = req.body;
    return prisma.match.create({ data: { p1Id, p2Id, score1: 0, score2: 0, status: 'pending' } });
  });
  fastify.patch('/api/schedule/:id', async (req, reply) => {
    const { id } = req.params;
    const { score1, score2, status, winnerId } = req.body;
    return prisma.match.update({ where: { id }, data: { score1, score2, status, winnerId } });
  });

  // PlayerStats
  fastify.get('/api/playerStats', async () =>
    prisma.playerStats.findMany({ include: { player: true } })
  );
  fastify.post('/api/playerStats', async (req, reply) => {
    const { playerId, wins, losses, streak, rating } = req.body;
    return prisma.playerStats.upsert({
      where: { playerId },
      update: { wins, losses, streak, rating },
      create: { playerId, wins, losses, streak, rating }
    });
  });

  // Log endpoint
  fastify.post('/api/log', async (req, reply) => {
    sendLogToLogstash("log", "client-log", { body: req.body });
    fastify.log.info({ body: req.body }, 'client-log');
    return { ok: true };
  });

  return fastify;
}

buildServer()
  .then((app) => app.listen({ port: PORT, host: '0.0.0.0' }))
  .then((address) => {
    fastify.log.info(`Backend listening on ${address}`);
  })
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
