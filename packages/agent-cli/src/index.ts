import { AgentCLI } from './lib/agent-cli.js';

export async function startCli(): Promise<void> {
  const cli = new AgentCLI();
  await cli.start();
}

// Start CLI if this is the main module
if (import.meta.url === new URL(import.meta.url).href) {
  startCli().catch((error) => {
    console.error('Failed to start CLI:', error);
    process.exit(1);
  });
}
