import nodemailer from "nodemailer";

const BASE_URL = "https://scoutme-mu.vercel.app";

const FOOTER = `
  <p style="color:#5a8a6a;font-size:12px;margin-top:32px;line-height:1.6;">From the streets of eKasi — to the screens of the world. 🇿🇦⚽</p>
  <p style="color:#1a3825;font-size:11px;margin-top:4px;">ScoutMe · Kasi Silicon NPC · South Africa</p>
`;

function wrap(accent: string, content: string): string {
  return `<div style="background:#050e08;color:#e8f5ee;font-family:Inter,Arial,sans-serif;padding:40px;max-width:600px;margin:0 auto;">${content}${FOOTER}</div>`;
}

function btn(accent: string, label: string): string {
  return `<a href="${BASE_URL}" style="background:${accent};color:#050e08;padding:16px 40px;text-decoration:none;font-weight:900;display:inline-block;margin:28px 0 12px;letter-spacing:1px;font-size:13px;">${label}</a>`;
}

function body(lines: string[], color = "#b0cfc0"): string {
  return lines.map(l => `<p style="color:${color};font-size:15px;line-height:1.75;margin:10px 0;">${l}</p>`).join("");
}

function getWelcomeContent(role: string, name: string): { subject: string; html: string } {
  const firstName = name.split(" ")[0] || name;

  if (role === "scout") {
    return {
      subject: "The next star is already on ScoutMe. Go find them. 🔭",
      html: wrap("#f5c518", `
        <h1 style="color:#f5c518;font-size:34px;margin-bottom:4px;letter-spacing:3px;font-weight:900;">THE TALENT IS WAITING.</h1>
        <p style="color:#ffffff;font-size:17px;margin-bottom:24px;">Hey ${firstName}. Welcome aboard.</p>
        ${body([
          "Right now there are players on ScoutMe that nobody else has found yet.",
          "Fast. Technical. Hungry. Undiscovered.",
          "Run a Neural Scout AI report. Build your shortlist. Get there first.",
          "Because someone else is already looking. 🔭",
        ])}
        ${btn("#f5c518", "FIND MY FIRST PLAYER →")}
        ${body(["Don't wait. The best ones go fast."], "#5a8a6a")}
      `),
    };
  }

  if (role === "club") {
    return {
      subject: "Your next signing is already on ScoutMe. 🏟⚽",
      html: wrap("#f5c518", `
        <h1 style="color:#f5c518;font-size:34px;margin-bottom:4px;letter-spacing:3px;font-weight:900;">YOUR SCOUTING HUB IS READY.</h1>
        <p style="color:#ffffff;font-size:17px;margin-bottom:24px;">Hey ${firstName}. Let's build something.</p>
        ${body([
          "The player your squad is missing right now?",
          "They're on ScoutMe.",
          "Wrong position. Wrong province. Wrong league — you name it, we'll find them.",
          "AI scouting reports. Virtual Trial scores. Real grassroots talent. All in one place.",
          "Stop missing players you should have signed. 🏆",
        ])}
        ${btn("#f5c518", "OPEN MY SCOUTING HUB →")}
      `),
    };
  }

  if (role === "fan") {
    return {
      subject: "You called it before the scouts did. Now prove it. 📣",
      html: wrap("#4da6ff", `
        <h1 style="color:#4da6ff;font-size:34px;margin-bottom:4px;letter-spacing:3px;font-weight:900;">THE COMMUNITY SEES EVERYTHING.</h1>
        <p style="color:#ffffff;font-size:17px;margin-bottom:24px;">Hey ${firstName}. The community needs you.</p>
        ${body([
          "You've always known who was special before anyone else.",
          "Now your opinion actually matters.",
          "Vote. Rate. Award badges. The players you back today could be professionals tomorrow.",
          "And when they make it — ScoutMe remembers you were first. 👀🇿🇦",
        ])}
        ${btn("#4da6ff", "GO VOTE ON TALENT →")}
      `),
    };
  }

  // player (default)
  return {
    subject: "You're in. Now go get discovered. ⚽🔥",
    html: wrap("#00e56b", `
      <h1 style="color:#00e56b;font-size:34px;margin-bottom:4px;letter-spacing:3px;font-weight:900;">YOUR PITCH IS LIVE.</h1>
      <p style="color:#ffffff;font-size:17px;margin-bottom:24px;">Hey ${firstName}. Let's get you seen.</p>
      ${body([
        "Scouts are already on ScoutMe searching for exactly your position.",
        "Don't let them scroll past you.",
        "Upload your first highlight. Get your AI scouting score. Show the world what you've got.",
        "This is your moment. Don't waste it. 🇿🇦⚽",
      ])}
      ${btn("#00e56b", "UPLOAD MY FIRST HIGHLIGHT →")}
      ${body(["P.S. Players who upload in their first 24 hours get 3x more profile views. Just saying. 👀"], "#5a8a6a")}
    `),
  };
}

// ── PayFast ITN handler ────────────────────────────────────────────────────
// PayFast posts application/x-www-form-urlencoded to notify_url after payment
async function handlePayFastITN(req: any, res: any) {
  try {
    const body: Record<string, string> = req.body || {};
    const paymentStatus = body.payment_status;
    const mPaymentId: string = body.m_payment_id || "";
    const itemName: string = body.item_name || "";

    console.log("[payfast-itn] status:", paymentStatus, "payment:", mPaymentId);

    if (paymentStatus !== "COMPLETE") {
      return res.status(200).send("OK"); // acknowledge but don't activate
    }

    // Derive plan from m_payment_id (format: scoutme_{userId}_{timestamp})
    // and item_name (e.g. "ScoutMe Player Pro")
    const userId = mPaymentId.split("_")[1] || "";
    const tier = itemName.toLowerCase().includes("scout pro") ? "scout_pro" : "player_pro";

    if (userId) {
      const FIREBASE_API_KEY = process.env.FIREBASE_API_KEY || "";
      const PLATFORM_EMAIL = process.env.PLATFORM_AGENT_EMAIL || "";
      const PLATFORM_PASSWORD = process.env.PLATFORM_AGENT_PASSWORD || "";
      // Get platform token
      const authRes = await fetch(
        `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${FIREBASE_API_KEY}`,
        { method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: PLATFORM_EMAIL, password: PLATFORM_PASSWORD, returnSecureToken: true }) }
      );
      const authData = await authRes.json();
      if (authData.idToken) {
        // Update user subscription in Firestore
        await fetch(
          `https://firestore.googleapis.com/v1/projects/scoutme-10/databases/(default)/documents/users/${userId}?updateMask.fieldPaths=tier&updateMask.fieldPaths=tierActivatedAt`,
          { method: "PATCH", headers: { Authorization: `Bearer ${authData.idToken}`, "Content-Type": "application/json" },
            body: JSON.stringify({ fields: {
              tier: { stringValue: tier },
              tierActivatedAt: { stringValue: new Date().toISOString() },
            }}) }
        );
        console.log("[payfast-itn] activated", tier, "for user", userId);
      }
    }
    return res.status(200).send("OK");
  } catch (err: any) {
    console.error("[payfast-itn] error:", err.message);
    return res.status(200).send("OK"); // always 200 to PayFast
  }
}

export default async function handler(req: any, res: any) {
  // PayFast ITN arrives as form-encoded POST with payment_status field
  const contentType = (req.headers["content-type"] || "").toLowerCase();
  if (req.method === "POST" && contentType.includes("application/x-www-form-urlencoded") && req.body?.payment_status) {
    return handlePayFastITN(req, res);
  }

  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const gmailUser = process.env.GMAIL_USER;
  const gmailPass = process.env.GMAIL_APP_PASSWORD;
  console.log("[send-email] called, has GMAIL_USER:", !!gmailUser, "has GMAIL_APP_PASSWORD:", !!gmailPass);
  if (!gmailUser || !gmailPass) return res.status(500).json({ error: "Email service not configured" });

  const { type, to, name, role, province, position, club } = req.body;
  if (!type || !to) return res.status(400).json({ error: "Missing required fields" });

  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: { user: gmailUser, pass: gmailPass },
  });

  try {
    if (type === "admin_signup") {
      console.log("[send-email] sending admin notification for:", name, role);
      await transporter.sendMail({
        from: `"ScoutMe" <${gmailUser}>`,
        to: "lebosetlhogomi.scoutme@gmail.com",
        subject: `🆕 ${(role || "").toUpperCase()} just joined ScoutMe — ${name}`,
        html: `
          <div style="font-family:Inter,Arial,sans-serif;padding:32px;background:#050e08;color:#e8f5ee;max-width:500px;">
            <h2 style="color:#00e56b;letter-spacing:2px;margin-bottom:4px;">NEW SIGNUP 🎉</h2>
            <p style="color:#5a8a6a;font-size:13px;margin-top:0;">Someone just joined the platform.</p>
            <table style="width:100%;border-collapse:collapse;margin-top:20px;">
              <tr><td style="padding:10px 0;border-bottom:1px solid #1a3825;color:#5a8a6a;font-size:12px;text-transform:uppercase;letter-spacing:1px;width:100px;">Name</td><td style="padding:10px 0;border-bottom:1px solid #1a3825;color:#ffffff;font-weight:700;">${name}</td></tr>
              <tr><td style="padding:10px 0;border-bottom:1px solid #1a3825;color:#5a8a6a;font-size:12px;text-transform:uppercase;letter-spacing:1px;">Role</td><td style="padding:10px 0;border-bottom:1px solid #1a3825;color:#00e56b;font-weight:900;letter-spacing:1px;">${(role || "").toUpperCase()}</td></tr>
              <tr><td style="padding:10px 0;border-bottom:1px solid #1a3825;color:#5a8a6a;font-size:12px;text-transform:uppercase;letter-spacing:1px;">Email</td><td style="padding:10px 0;border-bottom:1px solid #1a3825;color:#e8f5ee;">${to}</td></tr>
              <tr><td style="padding:10px 0;border-bottom:1px solid #1a3825;color:#5a8a6a;font-size:12px;text-transform:uppercase;letter-spacing:1px;">Province</td><td style="padding:10px 0;border-bottom:1px solid #1a3825;color:#e8f5ee;">${province || "—"}</td></tr>
              ${position ? `<tr><td style="padding:10px 0;border-bottom:1px solid #1a3825;color:#5a8a6a;font-size:12px;text-transform:uppercase;letter-spacing:1px;">Position</td><td style="padding:10px 0;border-bottom:1px solid #1a3825;color:#e8f5ee;">${position}</td></tr>` : ""}
              ${club ? `<tr><td style="padding:10px 0;border-bottom:1px solid #1a3825;color:#5a8a6a;font-size:12px;text-transform:uppercase;letter-spacing:1px;">Club</td><td style="padding:10px 0;border-bottom:1px solid #1a3825;color:#e8f5ee;">${club}</td></tr>` : ""}
              <tr><td style="padding:10px 0;color:#5a8a6a;font-size:12px;text-transform:uppercase;letter-spacing:1px;">Time</td><td style="padding:10px 0;color:#e8f5ee;">${new Date().toLocaleString("en-ZA", { timeZone: "Africa/Johannesburg" })}</td></tr>
            </table>
            <a href="https://console.firebase.google.com/project/scoutme-10/authentication/users" style="display:inline-block;margin-top:24px;background:#00e56b;color:#050e08;padding:12px 28px;text-decoration:none;font-weight:900;font-size:12px;letter-spacing:1px;">VIEW IN FIREBASE →</a>
          </div>
        `,
      });
    }

    res.status(200).json({ success: true });
  } catch (err: any) {
    console.error("[send-email] error:", err?.message || err);
    res.status(500).json({ error: "Failed to send email", detail: err?.message });
  }
}

