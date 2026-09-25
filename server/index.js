// Local-dev entry point only. Vercel deploys server/app.js directly as a
// serverless function via api/index.js — this file's app.listen() never
// runs there.
import app from "./app.js";

const PORT = process.env.PORT || 8787;

app.listen(PORT, () => {
  console.log(`Missy planning server listening on http://localhost:${PORT}`);
});
