// Fastify mock backend for ft_transendence42
const fastify = require('fastify')({ logger: true });
const cors = require('@fastify/cors');

const PORT = Number(process.env.PORT || 8000);

async function buildServer() {
  // CORS for local dev and nginx
  await fastify.register(cors, {
    origin: (origin, cb) => {
      // allow all in dev; tighten later
      cb(null, true);
    },
    credentials: true
  });

  // Health check
  fastify.get('/api/health', async () => ({ status: 'ok', ts: Date.now() }));

  // In-memory mock data
  const players = [
    { id: 'p1', alias: 'Alice' },
    { id: 'p2', alias: 'Bob' },
    { id: 'p3', alias: 'Charlie' },
    { id: 'p4', alias: 'Diana' },
    { id: 'p5', alias: 'Eve' },
    { id: 'p6', alias: 'Frank' },
  ];

  fastify.get('/api/players', async (req, reply) => {
    return players;
  });

  fastify.get('/api/tournament', async () => {
    const schedule = [];
    for (let i = 0; i < players.length - 1; i += 2) {
      if (players[i + 1]) schedule.push({ p1: players[i].alias, p2: players[i + 1].alias, status: 'pending' });
    }
    return {
      players,
      schedule,
      currentMatchIndex: null
    };
  });

  // Basic echo endpoint for future use
  fastify.post('/api/log', async (req, reply) => {
    fastify.log.info({ body: req.body }, 'client-log');
    return { ok: true };
  });

  return fastify;
}

buildServer()
  .then((app) => app.listen({ port: PORT, host: '0.0.0.0' }))
  .then((address) => {
    fastify.log.info(`Mock backend listening on ${address}`);
  })
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
