
import { getPlatformToken, firestoreQuery, firestorePatch, firestoreAdd } from "../lib/agent-utils";

// Runs every day at 8:00 AM SAST (6:00 AM UTC)
export default async function handler(_req: any, res: any) {
  try {
    const token = await getPlatformToken();
    const now = new Date().toISOString();

    const posts = await firestoreQuery("posts", token);
    const actions: string[] = [];

    for (const post of posts) {
      if (post.isArchived || post.isOfficialPost) continue;

      // 1. Auto-archive posts flagged by 3+ users (if reportedBy field exists)
      const reportCount = (post.reportedBy || []).length;
      if (reportCount >= 3) {
        await firestorePatch("posts", post._id || post.postId, { isArchived: true }, token);
        await firestoreAdd("notifications", {
          notificationId: `notif_mod_${post.postId}_${Date.now()}`,
          recipientId: post.userId,
          senderId: "scoutme_official",
          type: "moderation",
          text: `⚠️ Your post was temporarily hidden after receiving multiple reports. Contact support if you believe this is an error.`,
          postId: post.postId,
          read: false,
          createdAt: now,
        }, token);
        actions.push(`archived:${post.postId}`);
        continue;
      }

      // 2. Boost new players — if a player's post has 0 views after 12 hours, give them an encouraging notification
      const twelveHoursAgo = new Date(Date.now() - 12 * 3600000).toISOString();
      if (
        (post.createdAt || "") < twelveHoursAgo &&
        (post.views || 0) === 0 &&
        !post.agentBoostedAt
      ) {
        await firestorePatch("posts", post._id || post.postId, { agentBoostedAt: now }, token);
        await firestoreAdd("notifications", {
          notificationId: `notif_boost_${post.postId}_${Date.now()}`,
          recipientId: post.userId,
          senderId: "scoutme_official",
          type: "boost_tip",
          text: `💡 Tip: Add more hashtags and share your post link to get more scouts viewing your content. Keep uploading — consistency is key!`,
          postId: post.postId,
          read: false,
          createdAt: now,
        }, token);
        actions.push(`boost_tip:${post.postId}`);
      }
    }

    res.status(200).json({ message: `Moderation complete. Actions: ${actions.length}`, actions });
  } catch (err: any) {
    console.error("[agent-moderation]", err);
    res.status(500).json({ error: err.message });
  }
}
