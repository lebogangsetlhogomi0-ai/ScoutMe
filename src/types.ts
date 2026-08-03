/**
 * ScoutMe Application Types
 */

export type UserRole = "player" | "scout" | "club" | "fan" | "platform";

export interface UserProfile {
  userId: string;
  name: string;
  email: string;
  role: UserRole;
  province: string;
  createdAt: string;

  // Verified Personality System Tiers / Statuses
  tier?: "player" | "community" | "professional";
  verifiedStatus?: boolean;
  verifiedBadgeType?: "community" | "professional";
  verificationApprovedAt?: string;
  scoutStampsAvailable?: number; // Reset to 5 on first day of each month for Tier 3
  scoutStampsGiven?: { playerId: string; timestamp: string }[];
  spotlightPostsThisWeek?: number; // Reset every Monday
  clinicUploadsCount?: number;
  spotlightedBy?: { creatorId: string; creatorName: string; expiresAt: string }[];
  
  // Player specific fields
  position?: string;
  age?: number;
  club?: string;
  agreementSigned?: boolean;
  agreementSignedAt?: string;
  votes?: number;
  views?: number;
  pace?: number;
  vision?: number;
  finishing?: number;
  rating?: number;
  bio?: string;
  avatarBase64?: string;
  endorsed?: boolean;

  // Scout/Club specific fields
  organisation?: string;
  scoutRole?: string; // Head Scout, Agent, etc.

  // New Club fields
  accountType?: "scout" | "club"; // "scout" = Individual Scout, "club" = Football Club or FC
  clubName?: string;
  clubBio?: string;
  leagueAffiliation?: string;
  founded?: number;
  clubColours?: string[]; // array of two hex strings
  website?: string;
  followersCount?: number;
  postsCount?: number;
  playersSigned?: number;
  verified?: boolean;
  squad?: SquadMember[]; // Club squad manager

  // Relationships
  followers?: string[]; // Array of userIds
  following?: string[]; // Array of userIds
  mySquad?: string[]; // Array of userIds for close friends mutual list

  // Community Rating & Badges
  communityRating?: number;
  totalRatings?: number;
  talentBadges?: TalentBadge[];

  // Virtual Trial Mode Results
  virtualTrial?: VirtualTrialResult;

  // Official account flags
  isOfficialAccount?: boolean;
  potwUntil?: string; // Player of the Week featured until ISO date
}

export interface VirtualTrialResult {
  drillName: string;
  score: number;
  paceScore: number;
  visionScore: number;
  finishingScore: number;
  ranking: string;
  assessment: string;
  completedAt: string;
}

export interface TalentBadge {
  badgeName: string;
  emoji: string;
  count: number;
  borderColour: string;
}

export interface RatingDoc {
  ratingId: string; // userId_playerId
  fanId: string;
  playerId: string;
  starRating: number;
  awardedBadges: string[]; // Badge names awarded
  createdAt: string;
  updatedAt: string;
}

export interface PostHighlight {
  postId: string;
  userId: string;
  playerName: string;
  position: string;
  club: string;
  province: string;
  videoUrl: string; // fallback base64 or relative url
  thumbnailUrl: string;
  caption: string;
  tags: string[];
  contentType: "highlight" | "match" | "training" | "full" | "player_of_week" | "signing" | "most_improved" | "platform_update" | "trial_challenge";
  isOfficialPost?: boolean;
  votes: number;
  views: number;
  commentsCount: number;
  timestamp: string;
  trending?: boolean;
  comments?: PostComment[];

  // New social features compatibility
  isArchived?: boolean;
  taggedUsers?: string[]; // array of userIds
  tagPositions?: { userId: string; x: number; y: number }[]; // coordinates on media
  postFormat?: "clip" | "shot" | "carousel"; // standard reel, static photo, carousel
  carouselUrls?: string[]; // list of images for Match Shot carousel
}

export interface PostComment {
  commentId: string;
  userId: string;
  userName: string;
  role: UserRole;
  text: string;
  timestamp: string;
}

export interface ScoutReport {
  reportId: string;
  scoutId: string;
  playerId: string;
  playerName: string;
  generatedReport: string;
  paceScore: number;
  visionScore: number;
  finishingScore: number;
  overallScore: number;
  confidence: "HIGH" | "MEDIUM" | "LOW";
  recommendation: "TRIAL RECOMMENDED" | "MONITOR" | "MORE DATA NEEDED";
  createdAt: string;
}

export interface NewsItem {
  newsId: string;
  tag: string;
  headline: string;
  subtitle: string;
  category: string;
  timestamp: string;
  hot: boolean;
}

export interface SquadMember {
  userId: string;
  name: string;
  position: string;
  age: number;
  aiScore: number;
  contractStatus: "Signed" | "Trial" | "Released";
}

export interface ClubPost {
  postId: string;
  clubId: string;
  postType: "matchday" | "signing" | "training" | "announcement" | "community";
  mediaUrl: string; // URL of the media file or fallback
  mediaType: "video" | "image";
  caption: string;
  tags?: string[]; // Tagged player userIds
  likes: number;
  comments: number;
  timestamp: string;
  pinned: boolean;
  likedBy?: string[]; // userIds who liked the post
  savedBy?: string[]; // userIds who saved the post
  commentsList?: ClubPostComment[]; // Sub-field for club post comments
  matchDetails?: {
    opponent: string;
    score?: string;
    location?: string;
  };
  signingDetails?: {
    playerName: string;
    position: string;
    taggedPlayerId?: string;
  };
}

export interface ClubPostComment {
  commentId: string;
  userId: string;
  userName: string;
  role: UserRole;
  text: string;
  timestamp: string;
}

export interface AppNotification {
  notificationId: string;
  recipientId: string;
  senderId?: string;
  type?: string; // tag, follow, like, comment, signing, trial_request, report_generated
  text: string;
  postId?: string;
  read: boolean;
  createdAt: string;
}

export interface PitchReport {
  reportId: string;
  userId: string;
  userName: string;
  userRole: UserRole;
  mediaUrl: string;
  mediaType: "video" | "image" | "text";
  textContent?: string;
  backgroundColour?: string; // dark green, pitch green, gold, black
  audience: "everyone" | "mysquad" | "scouts";
  expiresAt: string;
  createdAt: string;
  viewCount: number;
  savedToMoments: boolean;
  replies?: {
    replyId: string;
    userId: string;
    userName: string;
    text: string;
    reaction?: string; // ⚽, 🔥, ⭐, 💪, 👀
    timestamp: string;
  }[];
}

export interface CareerMoment {
  momentId: string;
  userId: string;
  title: string;
  coverUrl: string;
  contentIds: string[]; // List of post or report ids
  createdAt: string;
  order: number;
}

export interface LiveSession {
  sessionId: string;
  hostId: string;
  hostName: string;
  hostRole: UserRole;
  title: string;
  audience: "public" | "scouts" | "mysquad";
  startedAt: string;
  endedAt?: string;
  viewerCount: number;
  replayUrl?: string;
  postType?: "matchday" | "training";
  comments?: {
    commentId: string;
    userId: string;
    userName: string;
    text: string;
    timestamp: string;
    pinned?: boolean;
  }[];
  taggedPlayers?: {
    userId: string;
    name: string;
    timestamp: string;
  }[];
}

export interface ChallengePost {
  challengeId: string;
  creatorId: string;
  creatorName: string;
  creatorRole: string;
  title: string;
  description: string;
  hashtag: string;
  mediaUrl?: string;
  deadline?: string;
  responseCount: number;
  createdAt: string;
}

export interface ChallengeResponse {
  responseId: string;
  challengeId: string;
  playerId: string;
  playerName: string;
  playerAvatarEmoji?: string;
  mediaUrl: string;
  caption: string;
  votes: number;
  createdAt: string;
}

export interface SpotlightPost {
  spotlightId: string;
  creatorId: string;
  creatorName: string;
  creatorRole: string;
  featuredPlayerId: string;
  featuredPlayerName: string;
  endorsementText: string;
  reactionVideoUrl?: string;
  createdAt: string;
  viewCount: number;
  boostExpiresAt: string;
}

export interface VerificationApplication {
  applicationId: string;
  userId: string;
  name: string;
  email: string;
  role: string;
  organisation: string;
  socialLinks: string;
  description: string;
  reason: string;
  supportingLink?: string;
  status: "pending" | "approved" | "rejected";
  submittedAt: string;
  reviewedAt?: string;
}

export interface ScoutStamp {
  stampId: string;
  scoutId: string;
  scoutName: string;
  scoutOrganisation?: string;
  playerId: string;
  playerName: string;
  awardedAt: string;
  expiresAt: string;
  boostActive: boolean;
}


