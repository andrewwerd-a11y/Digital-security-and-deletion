import { buildServer } from "./api/server.js";

const start = async () => {
  const server = await buildServer();
  await server.listen({ host: "0.0.0.0", port: Number(process.env.PORT ?? 3000) });
};

start().catch((error) => {
  // Startup failures should hard-fail closed.
  console.error(error);
  process.exit(1);
});
