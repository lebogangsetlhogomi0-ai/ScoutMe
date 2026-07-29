import express from "express";
import path from "path";
import fs from "fs";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";
import nodemailer from "nodemailer";

dotenv.config();

// In-Memory simulated mail storage for interactive tester demo purposes
interface SimulatedEmail {
  id: string;
  email: string;
  name: string;
  role: string;
  ticketId: string;
  queueNo: number;
  timestamp: number; // The exact epoch timestamp when the email is "delivered" (25 seconds delay)
}
const simulatedEmails: SimulatedEmail[] = [];

async function startServer() {
  const app = express();
  app.use(express.json());
  const PORT = 3000;

  // Endpoint for Neural Scout report generation
  app.post("/api/gemini/report", async (req: express.Request, res: express.Response) => {
    try {
      const { name, position, age, league, province, pace, vision, finishing, votes, views } = req.body;
      
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey || apiKey === "MY_GEMINI_API_KEY" || apiKey.trim() === "") {
        // Safe, responsive simulated response when no key is configured yet
        return res.status(200).json({
          report: `[API Key Mode: Simulated Report] ${name || 'Sipho Dlamini'} exhibits an exceptional tactical footprint as a ${position || 'CAM'}. Physically gifted, their ${pace || 92}/100 pace allows them to cover ground rapidly, serving as a lethal catalyst on transition phases. Their refined ${vision || 85}/100 vision and ability to orchestrate plays makes them one of the most exciting young talents emerging from the ${province || 'Gauteng'} grassroots structure. This profile is ripe for development within a professional academy structure.`
        });
      }

      const ai = new GoogleGenAI({
        apiKey: apiKey,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build',
          }
        }
      });

      const prompt = `You are Neural Scout Intelligence, an AI-powered football scouting system built by ScoutMe for African grassroots football. Generate a professional scouting report for the following player. Write exactly 3 sentences. Use professional football scouting language. Be specific and constructive. Do not use generic phrases.
 
Player details:
Name: ${name || 'Sipho Dlamini'}
Position: ${position || 'CAM'}
Age: ${age || 18}
League: ${league || 'ABC Motsepe League'}
Province: ${province || 'Gauteng'}
Pace score: ${pace || 92}/100
Vision score: ${vision || 85}/100
Finishing score: ${finishing || 79}/100
Community votes: ${votes || 847}
Total views: ${views || 12400}
 
Generate the scouting report now:`;

      const response = await ai.models.generateContent({
        model: "gemini-2.0-flash",
        contents: prompt
      });

      const text = response.text || "[Scouting report is being updated, please refresh.]";
      res.json({ report: text.trim() });
    } catch (err: any) {
      console.error("Gemini API Error:", err);
      res.status(200).json({ 
        report: `[AI Connection Fallback Report] ${req.body.name || 'The player'} demonstrates notable prowess in the ${req.body.position || 'midfield'} position. With an impressive set of metrics like ${req.body.pace || 80}/100 pace and ${req.body.vision || 80}/100 vision, their composure under pressure highlights substantial professional potential. There is clear evidence of tactical understanding that warrants immediate monitoring by technical scouts.`
      });
    }
  });

  // Endpoint for Virtual Trial scoring
  app.post("/api/gemini/virtual-trial", async (req: express.Request, res: express.Response) => {
    try {
      const { player, drillName, trialScore, paceScore, visionScore, finishingScore, benchmark, ranking } = req.body;
      
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey || apiKey === "MY_GEMINI_API_KEY" || apiKey.trim() === "") {
        // Safe simulated fallback
        return res.status(200).json({
          assessment: `During the ${drillName || 'Sprint Test'}, ${player?.name || 'the player'} showcased impressive mechanical efficiency that translates well to their target ${player?.position || 'CAM'} role. Their score of ${trialScore || 80}/100 reflects a high ceiling, with their ${paceScore || 75}/100 pace showing dynamic bursts that exceed typical ${player?.position || 'CAM'} baseline standards. To maximize their professional prospects, focusing on fine-tuning technical mechanics in pressure scenarios will turn these raw athletic qualities into elite-level traits.`
        });
      }

      const ai = new GoogleGenAI({
        apiKey: apiKey,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build',
          }
        }
      });

      const prompt = `You are Neural Scout Intelligence, ScoutMe's AI scouting system. 
A player just completed a ${drillName || 'Sprint Test'} virtual trial. Write exactly 3 sentences of professional 
scouting assessment. Be specific, encouraging but honest, and use professional football language.

Player: ${player?.name || 'Sipho Dlamini'}
Position: ${player?.position || 'CAM'}  
Age: ${player?.age || 18}
Province: ${player?.province || 'Gauteng'}
Drill completed: ${drillName || 'Sprint Test'}
Trial score: ${trialScore || 80}/100
Pace score: ${paceScore || 80}/100 (position average: ${benchmark?.pace || 72})
Vision score: ${visionScore || 80}/100 (position average: ${benchmark?.vision || 78})
Finishing score: ${finishingScore || 80}/100 (position average: ${benchmark?.finishing || 70})
Ranking: ${ranking || 'ABOVE AVERAGE'}

Write the 3-sentence assessment now:`;

      const response = await ai.models.generateContent({
        model: "gemini-2.0-flash",
        contents: prompt
      });

      const text = response.text || "No assessment generated.";
      res.json({ assessment: text.trim() });
    } catch (err: any) {
      console.error("Gemini API Virtual Trial Error:", err);
      res.status(200).json({ 
        assessment: `During the ${req.body.drillName || 'Sprint Test'}, the player showcased excellent raw agility that aligns with key demands of the ${req.body.player?.position || 'CAM'} position. With an active score of ${req.body.trialScore || 80}/100, they are performing competitively relative to peer group benchmarks. Continued refinement of spatial and technical movements will consolidate their performance and enhance their profile value on the ScoutMe network.`
      });
    }
  });

  // Waitlist email queuing endpoint with delayed delivery mechanism
  app.post("/api/queue-waiting-list", async (req: express.Request, res: express.Response) => {
    try {
      const { email, name, role } = req.body;
      if (!email) {
        return res.status(400).json({ error: "Email is required" });
      }

      const ticketId = "SM-" + Math.floor(100000 + Math.random() * 900000);
      const queueNo = Math.floor(150 + Math.random() * 850);
      const delayMs = 25000; // 25 seconds delay to send within 30 seconds
      const deliveryTime = Date.now() + delayMs;

      console.log(`[Queue System] Queuing ScoutMe waiting list entry for ${name || email} (${email}). Delivering in 25s.`);

      // Add to simulated mailbox so that testers can see it on mobile / in-app
      const simulatedObj: SimulatedEmail = {
        id: `mail_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
        email: email,
        name: name || email.split("@")[0].toUpperCase(),
        role: role || "player",
        ticketId,
        queueNo,
        timestamp: deliveryTime
      };
      simulatedEmails.push(simulatedObj);

      res.status(200).json({
        success: true,
        message: "Email response successfully scheduled on background thread. Dispatches in 25 seconds.",
        ticketId,
        queueNo,
        deliveryTime
      });

      // Dispatch admin notification immediately on background thread
      setTimeout(async () => {
        const smtpHost = process.env.SMTP_HOST;
        const smtpPort = process.env.SMTP_PORT ? parseInt(process.env.SMTP_PORT) : 587;
        const smtpUser = process.env.SMTP_USER;
        const smtpPass = process.env.SMTP_PASS;
        const smtpFrom = process.env.SMTP_FROM || `"ScoutMe Admin Alerts" <admin@scoutme.org>`;

        const hasSmtpConfig = smtpHost && smtpUser && smtpPass;
        const adminEmail = "lebo.setlhogomi@kasisilicon.org";
        const adminSubject = `🔔 New ScoutMe Waiting List Registration! [${(name || email.split('@')[0]).toUpperCase()}]`;
        const adminHtml = `
          <div style="background-color: #0c0a09; color: #f5f5f4; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, sans-serif; padding: 40px 20px; max-width: 600px; margin: 0 auto; border-radius: 16px; border: 1px solid #292524; box-shadow: 0 4px 12px rgba(0,0,0,0.5);">
            <div style="text-align: center; margin-bottom: 30px;">
              <h1 style="color: #22c55e; margin: 0; font-size: 28px; text-transform: uppercase; letter-spacing: 2px; font-weight: 800;">SCOUTME ✦</h1>
              <p style="color: #a8a29e; font-size: 11px; margin: 5px 0 0 0; text-transform: uppercase; letter-spacing: 1px;">Admin Dashboard Registration Notification</p>
            </div>

            <div style="background-color: #1c1917; border-radius: 12px; padding: 24px; border: 1px solid #44403c; margin-bottom: 24px;">
              <p style="font-size: 16px; margin-top: 0; color: #22c55e; font-weight: bold; text-transform: uppercase; letter-spacing: 1px;">⚡️ NEW USER REGISTRATION DETECTED</p>
              <p style="font-size: 14px; line-height: 1.6; color: #d6d3d1;">
                Hello Lebogang, a new user has successfully joined the waiting list! Here are the registration details:
              </p>

              <div style="background-color: #0c0a09; border-radius: 8px; padding: 18px; border-left: 4px solid #22c55e; margin: 20px 0;">
                <p style="font-size: 13px; line-height: 1.6; color: #fafaf9; margin: 0;">
                  <strong>User Profile Record:</strong><br/>
                  • <strong>Name / Handle:</strong> ${name || "Not Specified"}<br/>
                  • <strong>Email Profile:</strong> <a href="mailto:${email}" style="color: #22c55e; text-decoration: none;">${email}</a><br/>
                  • <strong>Role Classification:</strong> <span style="text-transform: capitalize; color: #22c55e; font-weight: bold;">${role || "Player"}</span><br/>
                  • <strong>Waitlist Ticket:</strong> <code style="background-color: #292524; padding: 2px 6px; border-radius: 4px; font-family: monospace;">${ticketId}</code><br/>
                  • <strong>Platform Queue Number:</strong> #${queueNo}<br/>
                  • <strong>Created Stamp:</strong> ${new Date().toLocaleString()}
                </p>
              </div>

              <p style="font-size: 12px; line-height: 1.6; color: #a8a29e; margin-bottom: 0;">
                The platform has successfully queued the user's welcoming email which will dispatch in 25 seconds.
              </p>
            </div>

            <div style="text-align: center; color: #78716c; font-size: 11px;">
              <p style="margin: 0;">© 2026 ScoutMe Platform Engine. Pitch Discovery Operations.</p>
            </div>
          </div>
        `;

        if (hasSmtpConfig) {
          try {
            const transporter = nodemailer.createTransport({
              host: smtpHost,
              port: smtpPort,
              secure: smtpPort === 465,
              auth: {
                user: smtpUser,
                pass: smtpPass
              }
            });

            await transporter.sendMail({
              from: smtpFrom,
              to: adminEmail,
              subject: adminSubject,
              html: adminHtml
            });
            console.log(`[SMTP System] Admin registration notification email successfully sent to ${adminEmail}!`);
          } catch (smtpErr) {
            console.error("[SMTP System] Admin email dispatch failed (verify SMTP credentials):", smtpErr);
          }
        } else {
          console.log(`[SMTP SYSTEM SIMULATION] NO PROD SMTP credentials detected for Admin notification.`);
          console.log(`[SMTP SIMULATED ADMIN ALERT] To: ${adminEmail}\nSubject: ${adminSubject}`);
        }
      }, 500);

      // Spawn background worker for the real SMTP if provided (does not block client response)
      setTimeout(async () => {
        const smtpHost = process.env.SMTP_HOST;
        const smtpPort = process.env.SMTP_PORT ? parseInt(process.env.SMTP_PORT) : 587;
        const smtpUser = process.env.SMTP_USER;
        const smtpPass = process.env.SMTP_PASS;
        const smtpFrom = process.env.SMTP_FROM || `"ScoutMe Waitlist" <waitlist@scoutme.org>`;

        const hasSmtpConfig = smtpHost && smtpUser && smtpPass;
        
        const emailSubject = `🚀 Welcome to the Pitch! Your ScoutMe Waiting List Ticket [#${ticketId}]`;
        const emailHtml = `
          <div style="background-color: #0c0a09; color: #f5f5f4; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, sans-serif; padding: 40px 20px; max-width: 600px; margin: 0 auto; border-radius: 16px; border: 1px solid #292524; box-shadow: 0 4px 12px rgba(0,0,0,0.5);">
            <div style="text-align: center; margin-bottom: 30px;">
              <h1 style="color: #22c55e; margin: 0; font-size: 28px; text-transform: uppercase; letter-spacing: 2px; font-weight: 800;">SCOUTME ✦</h1>
              <p style="color: #a8a29e; font-size: 11px; margin: 5px 0 0 0; text-transform: uppercase; letter-spacing: 1px;">African Grassroots Football Discovery Platform</p>
            </div>

            <div style="background-color: #1c1917; border-radius: 12px; padding: 24px; border: 1px solid #44403c; margin-bottom: 24px;">
              <p style="font-size: 16px; margin-top: 0; color: #fafaf9;">Hi <strong>${name || email.split('@')[0]}</strong>,</p>
              <p style="font-size: 14px; line-height: 1.6; color: #d6d3d1;">
                Welcome to the ScoutMe family! You have successfully stepped onto the pitch and joined the exclusive waiting list for the premier grassroots talent network in South Africa and across Africa.
              </p>

              <div style="border-top: 1px solid #292524; border-bottom: 1px solid #292524; padding: 18px 0; margin: 24px 0; text-align: center;">
                <div style="display: inline-block; margin: 0 15px; text-align: center;">
                  <span style="display: block; font-size: 10px; text-transform: uppercase; color: #a8a29e; letter-spacing: 1px; margin-bottom: 4px;">Your Queue Spot</span>
                  <strong style="font-size: 28px; color: #22c55e; font-weight: 800;">#${queueNo}</strong>
                </div>
                <div style="display: inline-block; margin: 0 15px; border-left: 1px solid #292524; padding-left: 20px; text-align: center;">
                  <span style="display: block; font-size: 10px; text-transform: uppercase; color: #a8a29e; letter-spacing: 1px; margin-bottom: 4px;">Waitlist Ticket</span>
                  <strong style="font-size: 22px; color: #fafaf9; font-family: monospace;">${ticketId}</strong>
                </div>
              </div>

              <div style="background-color: #0c0a09; border-radius: 8px; padding: 16px; border-left: 4px solid #22c55e; margin: 15px 0;">
                <p style="font-size: 13px; line-height: 1.5; color: #fafaf9; margin: 0;">
                  <strong>Waitlist Profile Summary:</strong><br/>
                  • Account Category: <span style="text-transform: capitalize; color: #22c55e;">${role || "Player"}</span><br/>
                  • Registered Email: ${email}<br/>
                  • Status: Active Waiting List
                </p>
              </div>

              <p style="font-size: 13px; line-height: 1.6; color: #a8a29e; margin-bottom: 0;">
                We are currently admitting users in waves as regional scouting hubs open across major provinces. You will receive physical SMS codes and private login links at this address shortly. Prepare your highlights!
              </p>
            </div>

            <div style="text-align: center; color: #78716c; font-size: 11px; line-height: 1.5;">
              <p style="margin: 0 0 8px 0;">This is an automated delivery sent on behalf of ScoutMe Technologies.</p>
              <p style="margin: 0;">© 2026 ScoutMe Platform. Grassroots to Professional Soccer Systems.</p>
            </div>
          </div>
        `;

        if (hasSmtpConfig) {
          try {
            const transporter = nodemailer.createTransport({
              host: smtpHost,
              port: smtpPort,
              secure: smtpPort === 465,
              auth: {
                user: smtpUser,
                pass: smtpPass
              }
            });

            await transporter.sendMail({
              from: smtpFrom,
              to: email,
              subject: emailSubject,
              html: emailHtml
            });
            console.log(`[SMTP System] Waiting list registration email successfully dispatched to ${email}!`);
          } catch (smtpErr) {
            console.error("[SMTP System] Real email dispatch failed (verify SMTP credentials):", smtpErr);
          }
        } else {
          console.log(`[SMTP SYSTEM SIMULATION] NO PROD SMTP credentials detected.`);
          console.log(`[SMTP SIMULATED BODY SEND] To: ${email}\nSubject: ${emailSubject}`);
          console.log(`Hint: Configure SMTP_HOST, SMTP_PORT, SMTP_USER, and SMTP_PASS to trigger real delivery.`);
        }
      }, delayMs);

    } catch (routeErr: any) {
      console.error("Queue waitlist error:", routeErr);
      res.status(500).json({ error: "Could not register details for email dispatch." });
    }
  });

  // GET endpoint to poll for simulated incoming emails
  app.get("/api/simulated-emails", (req: express.Request, res: express.Response) => {
    try {
      const { email } = req.query;
      if (!email) {
        return res.json([]);
      }
      const searchEmail = String(email).toLowerCase();
      const now = Date.now();
      
      // Filter emails belonging to this user that are past their delivery timestamp trigger
      const triggered = simulatedEmails.filter(e => e.email.toLowerCase() === searchEmail && e.timestamp <= now);
      res.json(triggered);
    } catch (pollErr) {
      console.error("Failed to fetch simulated emails:", pollErr);
      res.status(500).json([]);
    }
  });

  // Robust Vite middleware / static files router
  const distPath = path.join(process.cwd(), 'dist');
  const hasDist = fs.existsSync(path.join(distPath, 'index.html'));

  if (process.env.NODE_ENV !== "production" || !hasDist) {
    console.log(`[Server] Starting Vite development server middleware (hasDist: ${hasDist})`);
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "custom",
    });
    app.use(vite.middlewares);

    // Explicit fallback HTML rendering for SPA routes under development mode
    app.get('*', async (req, res, next) => {
      // If the request points to an API endpoint, pass through
      if (req.path.startsWith('/api/')) {
        return next();
      }
      try {
        const url = req.originalUrl;
        const htmlPath = path.resolve(process.cwd(), 'index.html');
        let html = fs.readFileSync(htmlPath, 'utf-8');
        // Let Vite transform the HTML to inject HMR and custom scripts
        html = await vite.transformIndexHtml(url, html);
        res.status(200).set({ 'Content-Type': 'text/html' }).end(html);
      } catch (err) {
        next(err);
      }
    });
  } else {
    console.log("[Server] Serving production static assets from dist/");
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
