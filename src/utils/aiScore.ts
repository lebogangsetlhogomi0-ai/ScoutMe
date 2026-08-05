import { UserProfile } from "../types";

/**
 * Dynamic AI aggregate score (0–100).
 *
 * Fluctuates based on two axes:
 *  - Own engagement:   how actively the player posts and gets seen
 *  - Community support: how fans/scouts rate, vote, and badge the player
 *
 * Because communityRating is an average (not a sum), it can drop when
 * lower ratings come in — pulling the score back down automatically.
 * Votes use log scale so the score doesn't just keep climbing forever.
 */
export function computeAiScore(player: UserProfile): number {
  if (player.role !== "player") return 0;

  const votes          = player.votes          || 0;
  const views          = player.views          || 0;
  const communityRating = player.communityRating || 0; // 0–5 avg, CAN decrease
  const totalRatings   = player.totalRatings   || 0;
  const badges         = player.talentBadges   || [];
  const badgeCount     = badges.reduce((sum, b) => sum + b.count, 0);

  // Nothing real has happened yet → stay at 0
  if (votes === 0 && totalRatings === 0 && badgeCount === 0) return 0;

  // ── Community support (65 pts max) ──────────────────────────────────
  // Rating: 0–5 avg × 8 = 0–40. Goes UP with good ratings, DOWN when bad
  // ratings lower the average.
  const ratingScore = communityRating * 8;

  // Votes: log scale — first votes matter most; diminishing returns after ~50
  // At 10 votes ≈ 12, at 50 votes ≈ 17, at 200 votes ≈ 21 (max 25)
  const voteScore = votes > 0 ? Math.min(Math.log10(votes + 1) * 14.5, 25) : 0;

  // Badges awarded by real users (not AI): each badge instance = 0.8 pts, max 20
  // More badges from community = higher signal of genuine skill recognition
  const badgeScore = Math.min(badgeCount * 0.8, 20);

  // ── Own engagement (35 pts max) ──────────────────────────────────────
  // Views proxy for content output + reach: log scale, max 15
  const viewScore = views > 0 ? Math.min(Math.log10(views + 1) * 6, 15) : 0;

  // Rater participation: having many raters (not just high avg) = active community
  // around this player. Max 10 extra points for 20+ raters.
  const raterScore = Math.min(totalRatings * 0.5, 10);

  const raw = ratingScore + voteScore + badgeScore + viewScore + raterScore;
  return Math.round(Math.min(raw, 100));
}
