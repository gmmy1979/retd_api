import { Hono } from 'hono';
import { logger } from 'hono/logger';
import { cors } from 'hono/cors';
import { serveStatic } from '@hono/node-server/serve-static';
import { serve } from '@hono/node-server';
import { retirement } from './routes/retirement.js';

const app = new Hono();

app.use(logger());
app.use('*', cors({
  origin: ['http://localhost:3000', 'http://127.0.0.1:3000'],
  maxAge: 86400,
}));

// Static files
app.use('/favicon.svg', serveStatic({ root: './public' }));
app.use('/img/*', serveStatic({ root: './public' }));
app.use('/css/*', serveStatic({ root: './public' }));
app.use('/js/*', serveStatic({ root: './public' }));
app.use('/tool/*', serveStatic({ root: './public' }));
app.get('/tool/retirement', serveStatic({ path: './public/tool/retirement.html' }));
app.get('/', serveStatic({ root: './public' }));

// API
app.route('/retirement', retirement);

const port = Number(process.env.PORT ?? 3000);

serve({ fetch: app.fetch, port }, (info) => {
  console.log(`🚀 retirement-api 已启动: http://localhost:${info.port}`);
});
