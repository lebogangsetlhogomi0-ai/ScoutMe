import { createHmac } from "crypto";

const WINDOW_MINUTES = 10;
const BASE_URL = "https://scoutme-mu.vercel.app";

export function generateOtp(email: string, secret: string, windowIndex?: number): string {
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

  if (role === "scout") {
    return {
      subject: `Your ScoutMe code: ${otp} — The talent is waiting 🔭`,
      html: wrap("#f5c518", `
        <h1 style="color:#f5c518;font-size:28px;font-weight:900;margin-bottom:8px;letter-spacing:2px;">THE TALENT IS WAITING.</h1>
        <p style="color:#ffffff;font-size:16px;font-weight:600;margin-bottom:16px;">Hey ${firstName}. Welcome aboard.</p>
        <p style="color:#5a8a6a;font-size:14px;line-height:1.75;margin-bottom:8px;">Right now there are players on ScoutMe that nobody else has found yet.</p>
        <p style="color:#5a8a6a;font-size:14px;line-height:1.75;margin-bottom:8px;">Fast. Technical. Hungry. Undiscovered.</p>
        <p style="color:#5a8a6a;font-size:14px;line-height:1.75;margin-bottom:8px;">Run a Neural Scout AI report. Build your shortlist. Get there first.</p>
        <p style="color:#e8f5ee;font-size:15px;font-weight:700;margin-bottom:8px;">Because someone else is already looking. 🔭</p>
        ${btn("#f5c518", "FIND MY FIRST PLAYER →")}
      `),
    };
  }

  if (role === "club") {
    return {
      subject: `Your ScoutMe code: ${otp} — Your next signing is waiting 🏟`,
      html: wrap("#f5c518", `
        <h1 style="color:#f5c518;font-size:28px;font-weight:900;margin-bottom:8px;letter-spacing:2px;">YOUR SCOUTING HUB IS READY.</h1>
        <p style="color:#ffffff;font-size:16px;font-weight:600;margin-bottom:16px;">Hey ${firstName}. Let's build something.</p>
        <p style="color:#5a8a6a;font-size:14px;line-height:1.75;margin-bottom:8px;">The player your squad is missing right now? They're on ScoutMe.</p>
        <p style="color:#5a8a6a;font-size:14px;line-height:1.75;margin-bottom:8px;">AI scouting reports. Virtual Trial scores. Real grassroots talent. All in one place.</p>
        <p style="color:#e8f5ee;font-size:15px;font-weight:700;margin-bottom:8px;">Stop missing players you should have signed. 🏆</p>
        ${btn("#f5c518", "OPEN MY SCOUTING HUB →")}
      `),
    };
  }

  if (role === "fan") {
    return {
      subject: `Your ScoutMe code: ${otp} — You called it before the scouts did 📣`,
      html: wrap("#4da6ff", `
        <h1 style="color:#4da6ff;font-size:28px;font-weight:900;margin-bottom:8px;letter-spacing:2px;">THE COMMUNITY SEES EVERYTHING.</h1>
        <p style="color:#ffffff;font-size:16px;font-weight:600;margin-bottom:16px;">Hey ${firstName}. The community needs you.</p>
        <p style="color:#5a8a6a;font-size:14px;line-height:1.75;margin-bottom:8px;">You've always known who was special before anyone else. Now your opinion actually matters.</p>
        <p style="color:#5a8a6a;font-size:14px;line-height:1.75;margin-bottom:8px;">Vote. Rate. Award badges. The players you back today could be professionals tomorrow.</p>
        <p style="color:#e8f5ee;font-size:15px;font-weight:700;margin-bottom:8px;">And when they make it — ScoutMe remembers you were first. 👀🇿🇦</p>
        ${btn("#4da6ff", "GO VOTE ON TALENT →")}
      `),
    };
  }

  return {
    subject: `Your ScoutMe code: ${otp} — You're almost in ⚽🔥`,
    html: wrap("#00e56b", `
      <h1 style="color:#00e56b;font-size:28px;font-weight:900;margin-bottom:8px;letter-spacing:2px;">YOUR PITCH IS LIVE.</h1>
      <p style="color:#ffffff;font-size:16px;font-weight:600;margin-bottom:16px;">Hey ${firstName}. Let's get you seen.</p>
      <p style="color:#5a8a6a;font-size:14px;line-height:1.75;margin-bottom:8px;">Scouts are already on ScoutMe searching for exactly your position.</p>
      <p style="color:#5a8a6a;font-size:14px;line-height:1.75;margin-bottom:8px;">Don't let them scroll past you. Upload your first highlight. Get your AI scouting score. Show the world what you've got.</p>
      <p style="color:#e8f5ee;font-size:15px;font-weight:700;margin-bottom:8px;">This is your moment. Don't waste it. 🇿🇦⚽</p>
      ${btn("#00e56b", "UPLOAD MY FIRST HIGHLIGHT →")}
      <p style="color:#5a8a6a;font-size:12px;margin-top:4px;">P.S. Players who upload in their first 24 hours get 3x more profile views. Just saying. 👀</p>
    `),
  };
}

export default async function handler(req: any, res: any) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const brevoKey = process.env.BREVO_API_KEY;
  const otpSecret = process.env.OTP_SECRET;

  console.log("[send-otp] called, has BREVO_API_KEY:", !!brevoKey, "has OTP_SECRET:", !!otpSecret);

  if (!brevoKey || !otpSecret) {
    console.error("[send-otp] Missing env vars");
    return res.status(500).json({ error: "Server not configured" });
  }

  const { email, name, role } = req.body;
  console.log("[send-otp] sending to:", email, "role:", role);

  if (!email || !name) return res.status(400).json({ error: "Missing email or name" });

  const firstName = (name as string).split(" ")[0] || name;
  const otp = generateOtp(email, otpSecret);
  const { subject, html } = buildEmail(otp, role || "player", firstName);

  try {
    const response = await fetch("https://api.brevo.com/v3/smtp/email", {
      method: "POST",
      headers: {
        "accept": "application/json",
        "api-key": brevoKey,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        sender: { name: "ScoutMe", email: "noreply@scoutme-notification.com" },
        replyTo: { email: "lebosetlhogomi.scoutme@gmail.com" },
        to: [{ email, name }],
        subject,
        htmlContent: html,
        headers: {
          "X-Mailer": "ScoutMe Notification System",
          "List-Unsubscribe": "<mailto:lebosetlhogomi.scoutme@gmail.com>",
        },
      }),
    });

    const result = await response.json();
    console.log("[send-otp] Brevo response:", JSON.stringify(result));

    if (!response.ok) {
      console.error("[send-otp] Brevo error status:", response.status, result);
      return res.status(500).json({ error: "Brevo rejected the request", detail: result });
    }

    res.status(200).json({ success: true });
  } catch (err: any) {
    console.error("[send-otp] fetch error:", err?.message || err);
    res.status(500).json({ error: "Failed to send OTP", detail: err?.message });
  }
}
