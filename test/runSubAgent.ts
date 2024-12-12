import { runSubAgent } from '../src/index';

console.log("\n🤖 Safe PKP AI Agent\n");

(async () => {
  try {
    console.log("🚀 Starting Safe PKP System...");
    await runSubAgent();
    console.log("✨ System execution completed");
    process.exit(0);
  } catch (error) {
    console.error("❌ Error running system:", error);
    process.exit(1);
  }
})();
