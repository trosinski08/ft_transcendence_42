const jwt = require('jsonwebtoken');
require('dotenv').config();
const fastify = require('fastify')({ logger: true });
const cors = require('@fastify/cors');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const { sendLogToLogstash } = require('./elk_logs');

const PORT = Number(process.env.PORT || 8000);

async function buildServer() {

    fastify.addHook('onRequest', async (request, reply) => {
    // attach start time for latency measurement
    request.startTime = Date.now();
    try {
      sendLogToLogstash('INFO', 'Incoming request', {
        eventType: 'request_start',
        route: request.routerPath || request.url,
        method: request.method,
        // include minimal headers if helpful (avoid Authorization / cookies)
        remoteAddress: request.ip
      });
    } catch (err) {
      // don't break request flow if logging fails
      fastify.log.warn('Failed to send start-log to Logstash', err);
    }
  });


  fastify.addHook('onResponse', async (request, reply) => {
    const durationMs = Date.now() - (request.startTime || Date.now());
    try {
      sendLogToLogstash('INFO', 'Request completed', {
        eventType: 'request_end',
        route: request.routerPath || request.url,
        method: request.method,
        statusCode: reply.statusCode,
        durationMs,
        userId: request.user && request.user.id ? request.user.id : undefined
      });
    } catch (err) {
      fastify.log.warn('Failed to send end-log to Logstash', err);
    }
  });

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
  fastify.delete('/api/players', async () => {
    await prisma.match.deleteMany({});
    await prisma.queueEntry.deleteMany({});
    await prisma.playerStats.deleteMany({});
    await prisma.player.deleteMany({});
    return { ok: true };
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
  // Delete all matches (for resetting tournament)
  fastify.delete('/api/schedule', async (req, reply) => {
    await prisma.match.deleteMany({});
    return { ok: true };
  });

  // Endpoint to update match result and player stats
  fastify.patch('/api/match/:id', async (request, reply) => {
    const { id } = request.params;
    const { score1, score2, winnerId } = request.body;
    try {
      const match = await prisma.match.update({
        where: { id },
        data: {
          score1,
          score2,
          winnerId,
          status: 'done'
        }
      });
      // Update player stats
      if (winnerId) {
        await prisma.playerStats.updateMany({
          where: { playerId: winnerId },
          data: { wins: { increment: 1 } }
        });
        const loserId = match.p1Id === winnerId ? match.p2Id : match.p1Id;
        await prisma.playerStats.updateMany({
          where: { playerId: loserId },
          data: { losses: { increment: 1 } }
        });
      }
      reply.send(match);
    } catch (error) {
      reply.status(500).send({ error: 'Failed to update match' });
    }
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

  const authenticate = async (request, reply) => {
    try {
      const token = request.cookies.token;
      if (!token) {
        throw new Error('Brak autoryzacji');
      }
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      request.user = await prisma.player.findUnique({ where: { id: decoded.userId } });
      if (!request.user) {
        throw new Error('Użytkownik nie znaleziony');
      }
    } catch (err) {
      reply.status(401).send({ error: 'Brak autoryzacji' });
    }
  };

  // Auth
  fastify.post('/api/auth/logout', (request, reply) => {
    reply.clearCookie('token', { path: '/' }).status(200).send({ message: 'Wylogowano' });
  });

  // --- Nowy endpoint do usuwania konta ---
  fastify.delete('/api/users/me', { preHandler: [authenticate] }, async (request, reply) => {
    try {
      const userId = request.user.id;
      await prisma.player.delete({ where: { id: userId } });
      reply.clearCookie('token', { path: '/' }).status(204).send();
    } catch (error) {
      fastify.log.error(error);
      reply.status(500).send({ error: 'Nie udało się usunąć konta' });
    }
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
