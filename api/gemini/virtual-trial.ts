import { GoogleGenAI } from "@google/genai";

export default async function handler(req: any, res: any) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  try {
    const { player, drillName, trialScore, paceScore, visionScore, finishingScore, benchmark, ranking } = req.body;
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey || apiKey === "MY_GEMINI_API_KEY" || apiKey.trim() === "") {
      return res.status(200).json({
        assessment: `During the ${drillName || "Sprint Test"}, ${player?.name || "the player"} showcased impressive mechanical efficiency that translates well to their target ${player?.position || "CAM"} role. Their score of ${trialScore || 80}/100 reflects a high ceiling, with their ${paceScore || 75}/100 pace showing dynamic bursts that exceed typical ${player?.position || "CAM"} baseline standards. Continued refinement of spatial and technical movements will consolidate their performance and enhance their profile value.`
      });
    }

    const ai = new GoogleGenAI({ apiKey });
    const prompt = `You are Neural Scout Intelligence, ScoutMe's AI scouting system.
A player just completed a ${drillName || "Sprint Test"} virtual trial. Write exactly 3 sentences of professional scouting assessment. Be specific, encouraging but honest, and use professional football language.

Player: ${player?.name || "Sipho Dlamini"}
Position: ${player?.position || "CAM"}
Age: ${player?.age || 18}
Province: ${player?.province || "Gauteng"}
Drill completed: ${drillName || "Sprint Test"}
Trial score: ${trialScore || 80}/100
Pace score: ${paceScore || 80}/100 (position average: ${benchmark?.pace || 72})
Vision score: ${visionScore || 80}/100 (position average: ${benchmark?.vision || 78})
Finishing score: ${finishingScore || 80}/100 (position average: ${benchmark?.finishing || 70})
Ranking: ${ranking || "ABOVE AVERAGE"}

Write the 3-sentence assessment now:`;

    const response = await ai.models.generateContent({ model: "gemini-2.0-flash", contents: prompt });
    res.json({ assessment: (response.text || "").trim() });
  } catch (err: any) {
    console.error("Gemini virtual-trial error:", err);
    res.status(200).json({
      assessment: `During the ${req.body?.drillName || "Sprint Test"}, the player showcased excellent raw agility that aligns with key demands of the ${req.body?.player?.position || "CAM"} position. With an active score of ${req.body?.trialScore || 80}/100, they are performing competitively relative to peer group benchmarks. Continued refinement of spatial and technical movements will consolidate their performance and enhance their profile value on the ScoutMe network.`
    });
  }
}
