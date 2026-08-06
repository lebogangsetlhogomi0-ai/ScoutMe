
import { getPlatformToken, firestoreQuery, firestoreAdd, callGemini } from "../lib/agent-utils";

// Runs every Friday at 12:00 PM SAST (10:00 AM UTC)
export default async function handler(_req: any, res: any) {
  try {
    const token = await getPlatformToken();
    const now = new Date().toISOString();
    const deadline = new Date(Date.now() + 7 * 24 * 3600000).toISOString(); // 1 week to respond

    // Use Gemini to generate a unique weekly challenge
    const raw = await callGemini(
      `You are ScoutMe Official, South Africa's grassroots football discovery platform. ` +
      `Generate a weekly football drill challenge for kasi players. ` +
      `Return ONLY a JSON object with these exact keys: title, description, hashtag. ` +
      `title: short challenge name (max 6 words). ` +
      `description: what players must do and record (2 sentences, exciting, South African football culture). ` +
      `hashtag: one word starting with # (no spaces). ` +
      `Example: {"title":"First Touch Mastery Challenge","description":"Control the ball with one touch and immediately beat a defender. Film your best sequence and tag your squad.","hashtag":"#FirstTouchChallenge"}`
    );

    let title = "Weekly Drill Challenge";
    let description = "Show us your best skill move — beat a defender, control a long ball, or finish from outside the box. Film it and post it now!";
    let hashtag = "#ScoutMeChallenge";

    try {
      const parsed = JSON.parse(raw.replace(/```json|```/g, "").trim());
      if (parsed.title) title = parsed.title;
      if (parsed.description) description = parsed.description;
      if (parsed.hashtag) hashtag = parsed.hashtag;
    } catch {
      // Gemini returned non-JSON — use defaults above
    }

    // Create the challenge post (as official post in the main feed)
    const postId = `challenge_${Date.now()}`;
    const caption = `⚡ ${title}\n\n${description}\n\nDeadline: Sunday midnight. Winner gets spotlighted to all scouts. ${hashtag} #ScoutMe`;

    await firestoreAdd("posts", {
      postId,
      userId: "scoutme_official",
      playerName: "ScoutMe Official",
      position: "PLATFORM",
      club: "ScoutMe Platform",
      province: "South Africa",
      videoUrl: "",
      thumbnailUrl: "",
      caption,
      tags: [hashtag.replace("#", ""), "ScoutMe", "WeeklyChallenge"],
      contentType: "trial_challenge",
      isOfficialPost: true,
      votes: 0,
      views: 0,
      commentsCount: 0,
      createdAt: now,
      timestamp: now,
      trending: true,
      isArchived: false,
    }, token);

    // Also create a ChallengePost document
    const challengeId = `chal_${Date.now()}`;
    await firestoreAdd("challenges", {
      challengeId,
      creatorId: "scoutme_official",
      creatorName: "ScoutMe Official",
      creatorRole: "platform",
      title,
      description,
      hashtag,
      deadline,
      responseCount: 0,
      createdAt: now,
    }, token);

    // Notify all players
    const players = await firestoreQuery("users", token, [{ field: "role", value: "player" }]);
    const notifPromises = players.map(player =>
      firestoreAdd("notifications", {
        notificationId: `notif_chal_${Date.now()}_${player.userId}`,
        recipientId: player.userId,
        senderId: "scoutme_official",
        type: "challenge",
        text: `⚡ New Weekly Challenge: "${title}" — post your entry before Sunday midnight. ${hashtag}`,
        read: false,
        createdAt: now,
      }, token)
    );
    await Promise.all(notifPromises);

    res.status(200).json({ message: `Challenge posted: ${title}` });
  } catch (err: any) {
    console.error("[agent-challenge]", err);
    res.status(500).json({ error: err.message });
  }
}
