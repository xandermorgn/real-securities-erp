#!/usr/bin/env node

/**
 * Unified server: Next.js frontend + Express API in one process
 * Runs on port 3000, binds to 0.0.0.0 for Cloudflare tunnel compatibility
 */

import next from 'next';
import apiApp from './api/server';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });

const dev = process.env.NODE_ENV !== 'production';
const hostname = '0.0.0.0';
const port = parseInt(process.env.PORT || '3000', 10);

// Initialize Next.js
const nextApp = next({ dev, hostname, port });
const handle = nextApp.getRequestHandler();

async function main() {
  console.log('[unified]: Preparing Next.js...');
  await nextApp.prepare();
  console.log('[unified]: ✓ Next.js ready');

  // Next.js handler as fallback for all non-API routes
  // This is added AFTER all API routes are already defined in apiApp
  apiApp.use((req, res) => {
    return handle(req, res);
  });

  apiApp.listen(port, hostname, () => {
    console.log(`[unified]: ✓ Server running at http://${hostname}:${port}`);
    console.log(`[unified]:   - API routes: http://localhost:${port}/api/*`);
    console.log(`[unified]:   - Frontend: http://localhost:${port}`);
  });
}

main().catch((err) => {
  console.error('[unified]: Fatal error during startup', err);
  process.exit(1);
});
