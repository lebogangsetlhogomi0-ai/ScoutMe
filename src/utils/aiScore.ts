import { UserProfile } from "../types";

/**
 * Computes a player's AI score dynamically from real community activity.
 * Score ranges from 0–100 and improves as players earn votes, ratings, and badges.
 */
export function computeAiScore(player: UserProfile): number {
  if (player.role !== "player") return 0;

  const votes = player.votes || 0;
  const views = player.views || 0;
  const communityRating = player.communityRating || 0;
  const totalRatings = player.totalRatings || 0;
  const badgeCount = (player.talentBadges || []).reduce((sum, b) => sum + b.count, 0);

  // Only show a score once the player has some real activity
  if (votes === 0 && totalRatings === 0 && badgeCount === 0) return 0;

  // Weighted formula
  const ratingScore = communityRating * 8;           // max 40 (5 stars × 8)
  const voteScore = Math.min(votes / 5, 25);         // max 25 (at 125 votes)
  const badgeScore = Math.min(badgeCount * 0.5, 20); // max 20
  const viewScore = Math.min(views / 200, 15);       // max 15

  return Math.round(Math.min(ratingScore + voteScore + badgeScore + viewScore, 100));
}
