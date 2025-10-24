// Fastify mock backend for ft_transendence42
const fastify = require('fastify')({ logger: true });
const cors = require('@fastify/cors');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const PORT = Number(process.env.PORT || 8000);

async function buildServer() {
  // CORS for local dev and nginx
  await fastify.register(cors, {
    origin: (origin, cb) => cb(null, true),
    credentials: true
  });

  // Health check
  fastify.get('/api/health', async () => ({ status: 'ok', ts: Date.now() }));

  // Get all players
  fastify.get('/api/players', async () => {
    return await prisma.player.findMany();
  });

  // Add a new player
  fastify.post('/api/players', async (req, reply) => {
    const { alias } = req.body;
    if (!alias) return reply.code(400).send({ error: 'Alias required' });
    // Prevent duplicate aliases
    const exists = await prisma.player.findUnique({ where: { alias } });
    if (exists) return reply.code(409).send({ error: 'Alias already exists' });
    const player = await prisma.player.create({ data: { alias } });
    return player;
  });

  // (Add more endpoints as needed, e.g., for matches, tournaments, etc.)

  // Log endpoint
  fastify.post('/api/log', async (req, reply) => {
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
