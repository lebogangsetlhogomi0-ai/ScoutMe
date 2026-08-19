import { createHmac } from "crypto";
import nodemailer from "nodemailer";

const WINDOW_MINUTES = 10;
const BASE_URL = "https://scoutme-mu.vercel.app";

function generateOtp(email: string, secret: string, windowIndex?: number): string {
  const w = windowIndex ?? Math.floor(Date.now() / (WINDOW_MINUTES * 60 * 1000));
  const raw = createHmac("sha256", secret).update(`${email}:${w}`).digest("hex");
  return String(parseInt(raw.slice(0, 8), 16) % 1000000).padStart(6, "0");
}

function buildEmail(otp: string, role: string, firstName: string): { subject: string; html: string } {
  const footer = `
    <p style="color:#5a8a6a;font-size:12px;margin-top:32px;line-height:1.6;">From the streets of eKasi — to the screens of the world. 🇿🇦⚽</p>
    <p style="color:#1a3825;font-size:11px;margin-top:4px;">ScoutMe · Kasi Silicon NPC · South Africa</p>
  `;
  const otpBlock = (accent: string) => `
    <p style="color:#5a8a6a;font-size:11px;letter-spacing:4px;text-transform:uppercase;text-align:center;margin-bottom:8px;">Your verification code</p>
    <p style="color:${accent};font-size:72px;font-weight:900;letter-spacing:12px;text-align:center;margin:8px 0 4px;">${otp}</p>
    <p style="color:#5a8a6a;font-size:13px;text-align:center;margin-bottom:0;">Expires in ${WINDOW_MINUTES} minutes &middot; Don't share this</p>
    <div style="border-top:1px solid #1a3825;margin:32px 0;"></div>
  `;
  const wrap = (accent: string, inner: string) =>
    `<div style="background:#050e08;color:#e8f5ee;font-family:Inter,Arial,sans-serif;padding:40px;max-width:480px;margin:0 auto;">${otpBlock(accent)}${inner}${footer}</div>`;
  const btn = (accent: string, label: string) =>
    `<a href="${BASE_URL}" style="background:${accent};color:#050e08;padding:16px 40px;text-decoration:none;font-weight:900;font-size:14px;display:inline-block;margin:24px 0 12px;letter-spacing:1px;">${label}</a>`;

  if (role === "scout") return { subject: `Your ScoutMe code: ${otp} — The talent is waiting 🔭`, html: wrap("#f5c518", `<h1 style="color:#f5c518;font-size:28px;font-weight:900;margin-bottom:8px;letter-spacing:2px;">THE TALENT IS WAITING.</h1><p style="color:#ffffff;font-size:16px;font-weight:600;margin-bottom:16px;">Hey ${firstName}. Welcome aboard.</p><p style="color:#5a8a6a;font-size:14px;line-height:1.75;margin-bottom:8px;">Right now there are players on ScoutMe that nobody else has found yet.</p><p style="color:#5a8a6a;font-size:14px;line-height:1.75;margin-bottom:8px;">Fast. Technical. Hungry. Undiscovered.</p><p style="color:#e8f5ee;font-size:15px;font-weight:700;margin-bottom:8px;">Because someone else is already looking. 🔭</p>${btn("#f5c518", "FIND MY FIRST PLAYER →")}`) };
  if (role === "club") return { subject: `Your ScoutMe code: ${otp} — Your next signing is waiting 🏟`, html: wrap("#f5c518", `<h1 style="color:#f5c518;font-size:28px;font-weight:900;margin-bottom:8px;letter-spacing:2px;">YOUR SCOUTING HUB IS READY.</h1><p style="color:#ffffff;font-size:16px;font-weight:600;margin-bottom:16px;">Hey ${firstName}. Let's build something.</p><p style="color:#5a8a6a;font-size:14px;line-height:1.75;margin-bottom:8px;">The player your squad is missing right now? They're on ScoutMe.</p><p style="color:#e8f5ee;font-size:15px;font-weight:700;margin-bottom:8px;">Stop missing players you should have signed. 🏆</p>${btn("#f5c518", "OPEN MY SCOUTING HUB →")}`) };
  if (role === "fan") return { subject: `Your ScoutMe code: ${otp} — You called it before the scouts did 📣`, html: wrap("#4da6ff", `<h1 style="color:#4da6ff;font-size:28px;font-weight:900;margin-bottom:8px;letter-spacing:2px;">THE COMMUNITY SEES EVERYTHING.</h1><p style="color:#ffffff;font-size:16px;font-weight:600;margin-bottom:16px;">Hey ${firstName}. The community needs you.</p><p style="color:#5a8a6a;font-size:14px;line-height:1.75;margin-bottom:8px;">Vote. Rate. Award badges. The players you back today could be professionals tomorrow.</p><p style="color:#e8f5ee;font-size:15px;font-weight:700;margin-bottom:8px;">And when they make it — ScoutMe remembers you were first. 👀🇿🇦</p>${btn("#4da6ff", "GO VOTE ON TALENT →")}`) };
  return { subject: `Your ScoutMe code: ${otp} — You're almost in ⚽🔥`, html: wrap("#00e56b", `<h1 style="color:#00e56b;font-size:28px;font-weight:900;margin-bottom:8px;letter-spacing:2px;">YOUR PITCH IS LIVE.</h1><p style="color:#ffffff;font-size:16px;font-weight:600;margin-bottom:16px;">Hey ${firstName}. Let's get you seen.</p><p style="color:#5a8a6a;font-size:14px;line-height:1.75;margin-bottom:8px;">Scouts are already on ScoutMe searching for exactly your position.</p><p style="color:#e8f5ee;font-size:15px;font-weight:700;margin-bottom:8px;">This is your moment. Don't waste it. 🇿🇦⚽</p>${btn("#00e56b", "UPLOAD MY FIRST HIGHLIGHT →")}<p style="color:#5a8a6a;font-size:12px;margin-top:4px;">P.S. Players who upload in their first 24 hours get 3x more profile views. Just saying. 👀</p>`) };
}

export default async function handler(req: any, res: any) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const otpSecret = process.env.OTP_SECRET;
  const { action, email, otp, name, role } = req.body || {};

  // ── Verify OTP ──────────────────────────────────────────────────────────
  if (action === "verify") {
    if (!otpSecret) return res.status(500).json({ error: "Server not configured" });
    if (!email || !otp) return res.status(400).json({ error: "Missing email or otp" });
    const now = Math.floor(Date.now() / (WINDOW_MINUTES * 60 * 1000));
    const match = generateOtp(email, otpSecret, now) === String(otp) ||
                  generateOtp(email, otpSecret, now - 1) === String(otp);
    if (!match) return res.status(400).json({ error: "Incorrect code" });
    return res.status(200).json({ success: true });
  }

  // ── Send OTP ────────────────────────────────────────────────────────────
  const gmailUser = process.env.GMAIL_USER;
  const gmailPass = process.env.GMAIL_APP_PASSWORD;
  if (!gmailUser || !gmailPass || !otpSecret) return res.status(500).json({ error: "Server not configured" });
  if (!email || !name) return res.status(400).json({ error: "Missing email or name" });

  const firstName = (name as string).split(" ")[0] || name;
  const code = generateOtp(email, otpSecret);
  const { subject, html } = buildEmail(code, role || "player", firstName);

  try {
    const transporter = nodemailer.createTransport({ service: "gmail", auth: { user: gmailUser, pass: gmailPass } });
    await transporter.sendMail({ from: `"ScoutMe" <${gmailUser}>`, to: email, subject, html });
    return res.status(200).json({ success: true });
  } catch (err: any) {
    return res.status(500).json({ error: "Failed to send OTP", detail: err?.message });
  }
}
