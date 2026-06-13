export default function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const { password } = req.body;
  const correct = (process.env.SITE_PASSWORD || "").trim();

  if (!correct) return res.status(500).json({ error: "SITE_PASSWORD not configured" });
  if (password !== correct) return res.status(401).json({ error: "Wrong password" });

  res.setHeader("Set-Cookie", `cb_auth=${correct}; Path=/; HttpOnly; SameSite=Strict; Max-Age=604800`);
  return res.status(200).json({ ok: true });
}
