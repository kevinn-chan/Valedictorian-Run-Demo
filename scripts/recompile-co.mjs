// Recompile specific files by id, running the app's real ingestFile against the
// shared Supabase with the service-role client. Loads .env.local into the env so
// the LLM + Supabase clients pick up their keys. Run from project root:
//   node scripts/recompile-co.mjs <fileId> [<fileId> ...]
import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";

for (const line of readFileSync(new URL("../.env.local", import.meta.url), "utf8").split("\n")) {
  const i = line.indexOf("=");
  if (i > 0 && !line.startsWith("#")) process.env[line.slice(0, i)] = line.slice(i + 1).trim();
}

const { ingestFile } = await import("../src/lib/ingest.ts");
const admin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

for (const id of process.argv.slice(2)) {
  const t0 = Date.now();
  try {
    const r = await ingestFile(admin, id);
    console.log(`OK ${id}  chunks=${r.chunks} topics=${r.topics} figures=${r.figures}  (${Math.round((Date.now() - t0) / 1000)}s)`);
  } catch (e) {
    console.error(`FAIL ${id}: ${e instanceof Error ? e.message : e}`);
  }
}
