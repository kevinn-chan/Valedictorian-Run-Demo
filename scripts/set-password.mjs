// One-time: set a password for an allowlisted user so day-to-day sign-in
// costs zero emails. Run locally: node scripts/set-password.mjs <email> '<password>'
import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";

const [email, password] = process.argv.slice(2);
if (!email || !password) {
  console.log("usage: node scripts/set-password.mjs <email> '<password>'");
  process.exit(1);
}

const env = Object.fromEntries(
  readFileSync(new URL("../.env.local", import.meta.url), "utf8")
    .split("\n")
    .filter((l) => l.includes("="))
    .map((l) => [l.slice(0, l.indexOf("=")), l.slice(l.indexOf("=") + 1).trim()])
);

const admin = createClient(
  env.NEXT_PUBLIC_SUPABASE_URL,
  env.SUPABASE_SERVICE_ROLE_KEY
);
const { data, error: listErr } = await admin.auth.admin.listUsers({ perPage: 100 });
if (listErr) {
  console.error("ERR", listErr.message);
  process.exit(1);
}
const user = data.users.find(
  (u) => u.email?.toLowerCase() === email.toLowerCase()
);
if (!user) {
  console.error(
    "No account for that email yet — request one magic link first (that creates the account), then re-run."
  );
  process.exit(1);
}
const { error } = await admin.auth.admin.updateUserById(user.id, { password });
console.log(error ? "ERR " + error.message : "Password set for " + email);
