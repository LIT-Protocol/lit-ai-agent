#!/usr/bin/env node

import { startCli } from './index.js';

startCli().catch((error: Error) => {
  console.error('Failed to start CLI:', error);
  process.exit(1);
});
