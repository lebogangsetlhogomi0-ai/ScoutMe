
import { getPlatformToken, firestoreQuery, firestoreAdd, firestorePatch, callGemini } from "../lib/agent-utils";

// Runs every Monday at 9:00 AM SAST (7:00 AM UTC)
export default async function handler(_req: any, res: any) {
  try {
    const token = await getPlatformToken();
    const now = new Date().toISOString();

    // Get all players and all posts
    const [players, posts] = await Promise.all([
      firestoreQuery("users", token, [{ field: "role", value: "player" }]),
      firestoreQuery("posts", token),
    ]);

    // Score each player based on last 7 days engagement
    const oneWeekAgo = new Date(Date.now() - 7 * 24 * 3600000).toISOString();
    const scored = players
      .filter(p => !p.potwUntil || p.potwUntil < now) // not already POTW this week
      .map(player => {
        const playerPosts = posts.filter(p => p.userId === player.userId && (p.createdAt || "") > oneWeekAgo);
        const weeklyVotes = playerPosts.reduce((s: number, p: any) => s + (p.votes || 0), 0);
        const weeklyViews = playerPosts.reduce((s: number, p: any) => s + (p.views || 0), 0);
        const ratingBoost = (player.communityRating || 0) * 8;
        const score = weeklyVotes * 3 + weeklyViews * 0.5 + ratingBoost + (player.votes || 0);
        return { player, score };
      })
      .sort((a, b) => b.score - a.score);

    if (scored.length === 0) {
      res.status(200).json({ message: "No eligible players this week" });
      return;
    }

    const { player } = scored[0];

    // Generate POTW caption via Gemini
    const caption = await callGemini(
      `You are ScoutMe Official, South Africa's grassroots football discovery platform. ` +
      `Write an exciting Player of the Week announcement (2-3 sentences, energetic, professional) for ` +
      `${player.name}, a ${player.position || "footballer"} from ${player.province || "South Africa"}. ` +
      `They had outstanding engagement this week. Start with their name. No hashtags in the caption itself.`
    );

    // Create the POTW post
    const postId = `potw_${Date.now()}`;
    const potwPost = {
      postId,
      userId: "scoutme_official",
      playerName: "ScoutMe Official",
      position: "PLATFORM",
      club: "ScoutMe Platform",
      province: player.province || "South Africa",
      videoUrl: "",
      thumbnailUrl: player.avatarBase64 || "",
      caption: caption || `${player.name} is ScoutMe's Player of the Week! 🏆 Outstanding performance and engagement this week — scouts, take note.`,
      tags: ["PlayerOfTheWeek", "ScoutMe", "KasiFootball"],
      contentType: "player_of_week",
      isOfficialPost: true,
      votes: 0,
      views: 0,
      commentsCount: 0,
      createdAt: now,
      timestamp: now,
      trending: true,
      isArchived: false,
      featuredPlayerId: player.userId,
      featuredPlayerName: player.name,
    };

    await firestoreAdd("posts", potwPost, token);

    // Set potwUntil on the player
    const until = new Date(Date.now() + 7 * 24 * 3600000).toISOString();
    await firestorePatch("users", player._id || player.userId, { potwUntil: until }, token);

    // Notify the player
    const notifId = `notif_potw_${Date.now()}`;
    await firestoreAdd("notifications", {
      notificationId: notifId,
      recipientId: player.userId,
      senderId: "scoutme_official",
      type: "potw",
      text: `🏆 You are ScoutMe's Player of the Week! Your profile is now featured to all scouts on the platform. Keep posting!`,
      read: false,
      createdAt: now,
    }, token);

    res.status(200).json({ message: `POTW posted for ${player.name}` });
  } catch (err: any) {
    console.error("[agent-potw]", err);
    res.status(500).json({ error: err.message });
  }
}
