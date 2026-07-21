// PROFILES env: "Name:email,Name:email"
export function getProfiles() {
  return (process.env.PROFILES ?? "")
    .split(",")
    .map((s) => {
      const i = s.indexOf(":");
      return { name: s.slice(0, i).trim(), email: s.slice(i + 1).trim().toLowerCase() };
    })
    .filter((p) => p.name && p.email);
}
