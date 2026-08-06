
import { getPlatformToken, firestoreQuery, firestoreAdd, callGemini } from "./_agent-utils";

// Runs every day at 6:00 PM SAST (4:00 PM UTC)
export default async function handler(_req: any, res: any) {
  try {
    const token = await getPlatformToken();
    const now = new Date().toISOString();
    const oneDayAgo = new Date(Date.now() - 24 * 3600000).toISOString();

    const posts = await firestoreQuery("posts", token);

    // Posts from the last 24 hours that crossed the trending threshold (10+ votes)
    // and aren't official posts and aren't already spotlighted today
    const trending = posts.filter(p =>
      !p.isOfficialPost &&
      !p.isArchived &&
      (p.createdAt || "") > oneDayAgo &&
      (p.votes || 0) >= 10 &&
      !p.agentSpotlightedAt
    );

    if (trending.length === 0) {
      res.status(200).json({ message: "No trending posts today" });
      return;
    }

    // Sort by votes desc, take top 3
    const top = trending.sort((a, b) => (b.votes || 0) - (a.votes || 0)).slice(0, 3);

    for (const post of top) {
      // Generate a short hype caption for the spotlight
      const hype = await callGemini(
        `You are ScoutMe Official. Write a 1-sentence exciting shoutout (no hashtags) for a trending grassroots football post ` +
        `by ${post.playerName} from ${post.province || "South Africa"} that got ${post.votes} votes in 24 hours. ` +
        `Make scouts want to watch it. Keep it under 20 words.`
      );

      // Create an official trending post referencing the original
      await firestoreAdd("posts", {
        postId: `trending_${post.postId}_${Date.now()}`,
        userId: "scoutme_official",
        playerName: "ScoutMe Official",
        position: "PLATFORM",
        club: "ScoutMe Platform",
        province: post.province || "South Africa",
        videoUrl: post.videoUrl || "",
        thumbnailUrl: post.thumbnailUrl || "",
        caption: `🔥 TRENDING NOW — ${hype || `${post.playerName}'s post is blowing up. ${post.votes} votes in 24 hours. Scouts, don't sleep on this.`}\n\n#Trending #ScoutMe #KasiFootball`,
        tags: ["Trending", "ScoutMe"],
        contentType: "highlight",
        isOfficialPost: true,
        votes: 0,
        views: 0,
        commentsCount: 0,
        createdAt: now,
        timestamp: now,
        trending: true,
        isArchived: false,
        featuredPlayerId: post.userId,
        featuredPlayerName: post.playerName,
      }, token);

      // Notify the player
      await firestoreAdd("notifications", {
        notificationId: `notif_trending_${post.postId}_${Date.now()}`,
        recipientId: post.userId,
        senderId: "scoutme_official",
        type: "trending",
        text: `🔥 Your post is trending on ScoutMe! ${post.votes} votes in 24 hours — scouts are watching. Keep it up!`,
        postId: post.postId,
        read: false,
        createdAt: now,
      }, token);
    }

    res.status(200).json({ message: `Spotlighted ${top.length} trending post(s)` });
  } catch (err: any) {
    console.error("[agent-trending]", err);
    res.status(500).json({ error: err.message });
  }
}
