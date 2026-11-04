import { app } from "./app.js";
import { env } from "./config/env.js";
import { disconnectDatabase } from "./db/prisma.js";

const server = app.listen(env.PORT, () => {
  console.info(`PC Builder Store API listening on port ${env.PORT}`);
});

function shutdown(signal: NodeJS.Signals): void {
  server.close((error) => {
    if (error) {
      console.error("API shutdown failed:", error);
      process.exitCode = 1;
    }
    void disconnectDatabase();
  });
  setTimeout(() => {
    console.error(`Forced shutdown after ${signal}`);
    process.exit(1);
  }, 10_000).unref();
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
