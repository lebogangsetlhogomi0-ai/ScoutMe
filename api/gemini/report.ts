import { GoogleGenAI } from "@google/genai";

export default async function handler(req: any, res: any) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  try {
    const { name, position, age, league, province, pace, vision, finishing, votes, views } = req.body;
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey || apiKey === "MY_GEMINI_API_KEY" || apiKey.trim() === "") {
      return res.status(200).json({
        report: `[Simulated Report] ${name || "Sipho Dlamini"} exhibits an exceptional tactical footprint as a ${position || "CAM"}. Physically gifted, their ${pace || 92}/100 pace allows them to cover ground rapidly, serving as a lethal catalyst on transition phases. Their refined ${vision || 85}/100 vision and ability to orchestrate plays makes them one of the most exciting young talents emerging from the ${province || "Gauteng"} grassroots structure.`
      });
    }

    const ai = new GoogleGenAI({ apiKey });
    const prompt = `You are Neural Scout Intelligence, an AI-powered football scouting system built by ScoutMe for African grassroots football. Generate a professional scouting report for the following player. Write exactly 3 sentences. Use professional football scouting language. Be specific and constructive. Do not use generic phrases.

Player details:
Name: ${name || "Sipho Dlamini"}
Position: ${position || "CAM"}
Age: ${age || 18}
League: ${league || "ABC Motsepe League"}
Province: ${province || "Gauteng"}
Pace score: ${pace || 92}/100
Vision score: ${vision || 85}/100
Finishing score: ${finishing || 79}/100
Community votes: ${votes || 847}
Total views: ${views || 12400}

Generate the scouting report now:`;

    const response = await ai.models.generateContent({ model: "gemini-2.0-flash", contents: prompt });
    res.json({ report: (response.text || "").trim() });
  } catch (err: any) {
    console.error("Gemini report error:", err);
    res.status(200).json({
      report: `[Fallback Report] ${req.body?.name || "The player"} demonstrates notable prowess in the ${req.body?.position || "midfield"} position. With impressive metrics including ${req.body?.pace || 80}/100 pace and ${req.body?.vision || 80}/100 vision, their composure under pressure highlights substantial professional potential. Continued development will consolidate their profile value on the ScoutMe network.`
    });
  }
}
