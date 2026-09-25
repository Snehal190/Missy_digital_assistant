// Vercel serverless entry point. Vercel calls this exported handler for
// every request under /api/* (see the rewrite in vercel.json) — the Express
// app itself still does the internal route matching (/api/plan-day, etc).
import app from "../server/app.js";

export default app;
