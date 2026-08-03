import * as Brevo from "@getbrevo/brevo";

const SENDER = {
  name: "ScoutMe",
  email: "lebosetlhogomi.scoutme@gmail.com",
};

function getWelcomeContent(role: string, name: string): { subject: string; html: string } {
  const subjects: Record<string, string> = {
    player: "Welcome to ScoutMe — Your pitch is ready ⚽🇿🇦",
    scout: "Welcome to ScoutMe — The talent is waiting 🔭",
    club: "Welcome to ScoutMe — Your scouting hub is ready 🏟",
    fan: "Welcome to ScoutMe — The community sees you 📣",
  };

  const accentColors: Record<string, string> = {
    player: "#00e56b",
    scout: "#f5c518",
    club: "#f5c518",
    fan: "#4da6ff",
  };

  const ctas: Record<string, string> = {
    player: "GO TO MY PROFILE →",
    scout: "START SCOUTING →",
    club: "GO TO CLUB DASHBOARD →",
    fan: "EXPLORE THE FEED →",
  };

  const steps: Record<string, string[]> = {
    player: [
      "Complete your profile",
      "Upload your first highlight",
      "Complete a Virtual Trial to get your AI score",
    ],
    scout: [
      "Search players by position and province",
      "Generate your first Neural Scout report",
      "Build your shortlist",
    ],
    club: [
      "Set up your club profile",
      "Post your first Trial Event",
      "Generate Neural Scout reports on prospects",
    ],
    fan: ["Follow your favourite players", "Vote and award talent badges"],
  };

  const intros: Record<string, string> = {
    player:
      "You just joined the first AI-powered football scouting platform built for South African grassroots players. Your profile is now visible to verified scouts and clubs across South Africa.",
    scout:
      "You now have access to Neural Scout Intelligence — AI-powered scouting reports for every grassroots player in South Africa. Find the talent nobody else has found yet.",
    club:
      "ScoutMe gives your club AI-powered recruitment tools built specifically for South African football. Find talent in ABC Motsepe, SAB League, and grassroots football before anyone else does.",
    fan:
      "You are now part of the ScoutMe community — the people who have always known who was special before the scouts did. Vote on talent, award badges, and help shape who gets discovered.",
  };

  const accent = accentColors[role] || "#00e56b";
  const stepItems = (steps[role] || steps.player)
    .map((s, i) => `<p style="color:#e8f5ee;margin:6px 0;">${i + 1}. ${s}</p>`)
    .join("");

  const html = `
    <div style="background:#050e08;color:#e8f5ee;font-family:Inter,sans-serif;padding:40px;max-width:600px;margin:0 auto;">
      <h1 style="color:${accent};font-size:32px;margin-bottom:8px;letter-spacing:2px;">WELCOME TO SCOUTME</h1>
      <p style="font-size:18px;color:#ffffff;margin-bottom:16px;">${
        role === "player" ? "Your pitch is ready" :
        role === "scout" ? "The talent is waiting" :
        role === "club" ? "Your scouting hub is ready" :
        "Welcome to the community"
      }, ${name}.</p>
      <p style="color:#5a8a6a;line-height:1.7;">${intros[role] || intros.player}</p>
      <div style="margin:32px 0;">
        <p style="color:${accent};font-weight:700;margin-bottom:12px;letter-spacing:1px;">GET STARTED:</p>
        ${stepItems}
      </div>
      <a href="https://scoutme-mu.vercel.app" style="background:${accent};color:#050e08;padding:16px 40px;text-decoration:none;font-weight:700;display:inline-block;margin-bottom:32px;letter-spacing:1px;">${ctas[role] || ctas.player}</a>
      <p style="color:#5a8a6a;font-size:12px;margin-top:24px;">From the streets of eKasi — to the screens of the world. 🇿🇦⚽</p>
      <p style="color:#1a3825;font-size:11px;">ScoutMe · Kasi Silicon NPC · South Africa</p>
    </div>
  `;

  return { subject: subjects[role] || subjects.player, html };
}

export default async function handler(req: any, res: any) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const apiKey = process.env.BREVO_API_KEY;
  if (!apiKey) return res.status(500).json({ error: "Email service not configured" });

  const { type, to, name, role, province, position, club } = req.body;
  if (!type || !to) return res.status(400).json({ error: "Missing required fields" });

  const apiInstance = new Brevo.TransactionalEmailsApi();
  apiInstance.setApiKey(Brevo.TransactionalEmailsApiApiKeys.apiKey, apiKey);

  try {
    if (type === "welcome") {
      const { subject, html } = getWelcomeContent(role || "player", name || "");
      const email = new Brevo.SendSmtpEmail();
      email.sender = SENDER;
      email.to = [{ email: to, name: name || "" }];
      email.subject = subject;
      email.htmlContent = html;
      await apiInstance.sendTransacEmail(email);
    }

    if (type === "admin_signup") {
      const email = new Brevo.SendSmtpEmail();
      email.sender = SENDER;
      email.to = [{ email: "lebosetlhogomi.scoutme@gmail.com", name: "Lebo" }];
      email.subject = `🆕 New ScoutMe signup — ${(role || "").toUpperCase()}: ${name}`;
      email.htmlContent = `
        <div style="font-family:Inter,sans-serif;padding:24px;background:#050e08;color:#e8f5ee;max-width:500px;">
          <h2 style="color:#00e56b;letter-spacing:1px;">New ScoutMe Signup</h2>
          <p><strong>Name:</strong> ${name}</p>
          <p><strong>Email:</strong> ${to}</p>
          <p><strong>Role:</strong> ${role}</p>
          <p><strong>Province:</strong> ${province || "—"}</p>
          ${position ? `<p><strong>Position:</strong> ${position}</p>` : ""}
          ${club ? `<p><strong>Club:</strong> ${club}</p>` : ""}
          <p><strong>Time:</strong> ${new Date().toLocaleString("en-ZA", { timeZone: "Africa/Johannesburg" })}</p>
          <a href="https://console.firebase.google.com/project/scoutme-10/authentication/users" style="color:#00e56b;">View in Firebase Console →</a>
        </div>
      `;
      await apiInstance.sendTransacEmail(email);
    }

    res.status(200).json({ success: true });
  } catch (err: any) {
    console.error("[send-email] Brevo error:", err?.message || err);
    res.status(500).json({ error: "Failed to send email", detail: err?.message });
  }
}
