import React, { createContext, useContext, useState, useEffect } from "react";
import { UserProfile, PostHighlight, ScoutReport, NewsItem, UserRole, PostComment, RatingDoc, ClubPost, AppNotification, ClubPostComment, SquadMember, PitchReport, CareerMoment, LiveSession, ChallengePost, ChallengeResponse, SpotlightPost, VerificationApplication, ScoutStamp, TrialEvent, TrialEventApplication } from "../types";
import { db, auth, isDemoMode } from "../firebase";
import { collection, doc, setDoc, getDoc, updateDoc, onSnapshot, query, orderBy, limit, addDoc, serverTimestamp, increment, where } from "firebase/firestore";
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, sendEmailVerification } from "firebase/auth";
import { triggerGlobalToast } from "../components/Toast";

const OFFICIAL_ACCOUNT_EMAIL = "lebosetlhogomi.scoutme@gmail.com";

// Error codes that are genuinely actionable by the user — safe to show as a friendly message.
// Anything NOT in these maps (including auth/configuration-not-found, network issues, or any
// other Firebase/Auth infrastructure problem) is treated as an outage: we never surface the raw
// Firebase error, and instead fall back to local/offline behaviour silently.
const SIGNUP_USER_ACTIONABLE_ERRORS: Record<string, string> = {
  "auth/email-already-in-use": "An account with this email already exists. Please sign in instead.",
  "auth/weak-password": "Password must be at least 6 characters.",
  "auth/invalid-email": "Please enter a valid email address.",
  "auth/network-request-failed": "Connection failed. Please check your internet and try again.",
};

const SIGNIN_USER_ACTIONABLE_ERRORS: Record<string, string> = {
  "auth/wrong-password": "Incorrect password. Please try again.",
  "auth/invalid-credential": "Incorrect password. Please try again.",
  "auth/user-not-found": "No account found with this email. Please register.",
  "auth/invalid-email": "Please enter a valid email address.",
  "auth/too-many-requests": "Too many attempts. Please wait a few minutes and try again.",
  "auth/network-request-failed": "Connection failed. Please check your internet and try again.",
};

// Safe mock storage fallback to prevent iframe security/sandbox crashes
const localStorageShadow = {
  getItem: (key: string): string | null => {
    try {
      return window.localStorage.getItem(key);
    } catch {
      const store = (window as any).__memStore || {};
      return store[key] || null;
    }
  },
  setItem: (key: string, val: string): void => {
    try {
      window.localStorage.setItem(key, val);
    } catch {
      if (!(window as any).__memStore) (window as any).__memStore = {};
      (window as any).__memStore[key] = val;
    }
  },
  removeItem: (key: string): void => {
    try {
      window.localStorage.removeItem(key);
    } catch {
      if ((window as any).__memStore) delete (window as any).__memStore[key];
    }
  }
};

const sessionStorageShadow = {
  getItem: (key: string): string | null => {
    try {
      return window.sessionStorage.getItem(key);
    } catch {
      const store = (window as any).__sessionMemStore || {};
      return store[key] || null;
    }
  },
  setItem: (key: string, val: string): void => {
    try {
      window.sessionStorage.setItem(key, val);
    } catch {
      if (!(window as any).__sessionMemStore) (window as any).__sessionMemStore = {};
      (window as any).__sessionMemStore[key] = val;
    }
  },
  removeItem: (key: string): void => {
    try {
      window.sessionStorage.removeItem(key);
    } catch {
      if ((window as any).__sessionMemStore) delete (window as any).__sessionMemStore[key];
    }
  }
};

const localStorage = localStorageShadow;
const sessionStorage = sessionStorageShadow;

interface AppContextType {
  isDemoMode: boolean;
  currentUser: UserProfile | null;
  users: UserProfile[];
  posts: PostHighlight[];
  scoutReports: ScoutReport[];
  news: NewsItem[];
  shortlist: string[]; // List of player userIds
  onboardingStep: number;
  selectedOnboardingRole: UserRole | null;
  loading: boolean;
  error: string | null;
  offlineMode: boolean;
  ratings: RatingDoc[];
  clubPosts: ClubPost[];
  notifications: AppNotification[];
  pitchReports: PitchReport[];
  careerMoments: CareerMoment[];
  liveSessions: LiveSession[];
  challengePosts: ChallengePost[];
  challengeResponses: ChallengeResponse[];
  spotlightPosts: SpotlightPost[];
  verificationApplications: VerificationApplication[];
  scoutStamps: ScoutStamp[];
  
  postsLoading: boolean;
  createPost: (data: { videoUrl: string; thumbnailUrl?: string; caption: string; tags: string[]; contentType: string; position: string; league?: string; province: string; visibility?: string; featuredPlayerId?: string; featuredPlayerName?: string; submissionType?: "weekly_challenge" | "club_trial" | "both"; clubTrialClubName?: string; }) => Promise<void>;
  checkAutoPost: () => Promise<void>;

  // Actions
  setOfflineMode: (active: boolean) => void;
  setOnboardingStep: (step: number) => void;
  setSelectedOnboardingRole: (role: UserRole | null) => void;
  signUpUser: (profile: Partial<UserProfile>, password?: string) => Promise<boolean>;
  signInUser: (email: string, role: UserRole, password?: string) => Promise<boolean>;
  signOutUser: () => Promise<void>;
  resendVerificationEmail: () => Promise<void>;
  updateBio: (bio: string, extraFields?: Partial<UserProfile>) => void;
  updateAvatar: (avatarBase64: string) => Promise<void>;
  signDigitalAgreement: () => void;
  votePost: (postId: string) => void;
  addComment: (postId: string, commentText: string) => void;
  toggleShortlist: (playerId: string) => void;
  generateReport: (playerId: string, scores: { pace: number; vision: number; finishing: number }) => Promise<ScoutReport | null>;
  addNewPost: (postData: Partial<PostHighlight>) => void;
  submitRating: (playerId: string, starRating: number) => Promise<void>;
  awardTalentBadge: (playerId: string, badgeName: string, emoji: string, borderColour: string) => Promise<void>;
  toggleFollow: (targetUserId: string) => void;
  // Club FC Specific Actions
  addClubPost: (postData: Partial<ClubPost>) => Promise<void>;
  toggleLikeClubPost: (postId: string) => Promise<void>;
  toggleSaveClubPost: (postId: string) => Promise<void>;
  addClubPostComment: (postId: string, commentText: string) => Promise<void>;
  pinClubPost: (postId: string) => Promise<void>;
  deleteClubPost: (postId: string) => Promise<void>;
  addPlayerToSquad: (playerId: string, contractStatus: "Signed" | "Trial" | "Released") => Promise<void>;
  removeFromSquad: (playerId: string) => Promise<void>;
  addSystemNotification: (recipientId: string, text: string, options?: { senderId?: string; type?: string; postId?: string }) => Promise<void>;
  markNotificationRead: (notificationId: string) => Promise<void>;
  markAllNotificationsRead: () => Promise<void>;
  unreadNotificationsCount: number;

  // Custom Social Layer Actions
  addPitchReport: (reportData: Partial<PitchReport>) => Promise<void>;
  replyToPitchReport: (reportId: string, text: string, reaction?: string) => Promise<void>;
  addCareerMoment: (title: string, coverUrl: string, contentIds: string[]) => Promise<void>;
  saveToCareerMoments: (contentId: string, momentId: string) => Promise<void>;
  updateCareerMoment: (momentId: string, updates: Partial<CareerMoment>) => Promise<void>;
  deleteCareerMoment: (momentId: string) => Promise<void>;
  createLiveSession: (title: string, audience: "public" | "scouts" | "mysquad", postType?: "matchday" | "training") => Promise<string>;
  endLiveSession: (sessionId: string, saveReplay: boolean) => Promise<void>;
  addLiveComment: (sessionId: string, text: string) => Promise<void>;
  pinLiveComment: (sessionId: string, commentId: string) => Promise<void>;
  tagPlayerLive: (sessionId: string, playerId: string, playerName: string) => Promise<void>;
  toggleMySquad: (userId: string) => Promise<void>;
  archivePost: (postId: string) => Promise<void>;
  restorePost: (postId: string) => Promise<void>;
  deletePostPermanently: (postId: string) => Promise<void>;
  
  // Verified Personality Actions
  addChallengePost: (title: string, description: string, hashtag: string, mediaUrl?: string, deadline?: string) => Promise<void>;
  submitChallengeResponse: (challengeId: string, caption: string, mediaUrl: string) => Promise<void>;
  createSpotlightPost: (featuredPlayerId: string, endorsementText: string, reactionVideoUrl?: string) => Promise<void>;
  submitVerificationApplication: (applicationData: { role: string; organisation: string; socialLinks: string; description: string; reason: string; supportingLink?: string }) => Promise<void>;
  reviewVerification: (applicationId: string, status: "approved" | "rejected") => Promise<void>;
  awardScoutStamp: (playerId: string) => Promise<void>;
  addClinicUpload: (contextLabel: string, taggedPlayerIds: string[], mediaUrl: string) => Promise<void>;
  voteChallengeResponse: (responseId: string) => Promise<void>;
  upgradeUserTier: (tier: string) => Promise<void>;
  addVirtualTrialResult: (playerId: string, result: any) => Promise<void>;
  trialEvents: TrialEvent[];
  trialEventApplications: TrialEventApplication[];
  applyToTrialEvent: (trialEventId: string, result: { drillName: string; score: number }) => Promise<void>;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

// Initial Seed Data for Players (Users)
const initialSeedPlayers: UserProfile[] = [
  {
    userId: "player_1",
    name: "Sipho Dlamini",
    email: "sipho@scoutme.org",
    role: "player",
    province: "Gauteng",
    position: "CAM",
    age: 18,
    club: "ABC Motsepe - Soweto Owls",
    agreementSigned: true,
    agreementSignedAt: new Date().toISOString(),
    createdAt: new Date().toISOString(),
    votes: 847,
    views: 12400,
    pace: 92,
    vision: 85,
    finishing: 79,
    rating: 87,
    bio: "Attacking midfielder with lethal speed and pinpoint vision. Refusing to let circumstances block my career dreams.",
    endorsed: true,
    followers: ["scout_1"],
    following: [],
    communityRating: 4.2,
    totalRatings: 184,
    talentBadges: [
      { badgeName: "Pace Monster", emoji: "⚡", count: 124, borderColour: "#00e56b" },
      { badgeName: "Vision King", emoji: "👁", count: 85, borderColour: "#4da6ff" },
      { badgeName: "Leader", emoji: "📣", count: 54, borderColour: "#4da6ff" }
    ]
  },
  {
    userId: "player_2",
    name: "Thabo Nkosi",
    email: "thabo@scoutme.org",
    role: "player",
    province: "Gauteng",
    position: "ST",
    age: 19,
    club: "SAB League - Tembisa Gunners",
    agreementSigned: true,
    agreementSignedAt: new Date().toISOString(),
    createdAt: new Date().toISOString(),
    votes: 612,
    views: 9800,
    pace: 88,
    vision: 74,
    finishing: 91,
    rating: 83,
    bio: "Clinical goalscorer. Confident with both feet. Looking for opportunities in national or international professional setups.",
    endorsed: false,
    followers: [],
    following: [],
    communityRating: 4.6,
    totalRatings: 98,
    talentBadges: [
      { badgeName: "Clinical Finisher", emoji: "🎯", count: 80, borderColour: "#f5c518" },
      { badgeName: "Street Footballer", emoji: "🏘️", count: 42, borderColour: "#f5c518" }
    ]
  },
  {
    userId: "player_3",
    name: "Kagiso Sithole",
    email: "kagiso@scoutme.org",
    role: "player",
    province: "Western Cape",
    position: "LB",
    age: 17,
    club: "Community League - Khayelitsha City",
    agreementSigned: true,
    agreementSignedAt: new Date().toISOString(),
    createdAt: new Date().toISOString(),
    votes: 1204,
    views: 18900,
    pace: 89,
    vision: 78,
    finishing: 62,
    rating: 81,
    bio: "Aggressive full-back. Love overlapping cross-opportunities. Absolute tactical disciplinarian on defense.",
    endorsed: true,
    followers: ["scout_1"],
    following: [],
    communityRating: 4.1,
    totalRatings: 114,
    talentBadges: [
      { badgeName: "Pace Monster", emoji: "⚡", count: 74, borderColour: "#00e56b" },
      { badgeName: "Wall", emoji: "🧱", count: 42, borderColour: "#8B4513" }
    ]
  },
  {
    userId: "player_4",
    name: "Bongani Zulu",
    email: "bongani@scoutme.org",
    role: "player",
    province: "Limpopo",
    position: "GK",
    age: 20,
    club: "NFD - Polokwane Stars",
    agreementSigned: false,
    createdAt: new Date().toISOString(),
    votes: 434,
    views: 7200,
    pace: 71,
    vision: 83,
    finishing: 45,
    rating: 84,
    bio: "Unshakeable shot-stopper. High commanding presence in the box. Dedicated to securing direct trials with top elite clubs.",
    endorsed: false,
    followers: [],
    following: [],
    communityRating: 4.3,
    totalRatings: 32,
    talentBadges: [
      { badgeName: "Safe Hands", emoji: "🧤", count: 28, borderColour: "#4da6ff" }
    ]
  },
  {
    userId: "player_5",
    name: "Ayanda Mkhize",
    email: "ayanda@scoutme.org",
    role: "player",
    province: "KwaZulu-Natal",
    position: "CM",
    age: 16,
    club: "School League - Durban Academy",
    agreementSigned: true,
    agreementSignedAt: new Date().toISOString(),
    createdAt: new Date().toISOString(),
    votes: 2341,
    views: 31000,
    pace: 86,
    vision: 91,
    finishing: 77,
    rating: 89,
    bio: "Central midfield anchor with exceptional spatial awareness. Playing above my age of 16 years. Fast tracker.",
    endorsed: true,
    followers: ["scout_1"],
    following: [],
    communityRating: 4.8,
    totalRatings: 420,
    talentBadges: [
      { badgeName: "Game Changer", emoji: "🌟", count: 215, borderColour: "#f5c518" },
      { badgeName: "Vision King", emoji: "👁", count: 180, borderColour: "#4da6ff" },
      { badgeName: "Silky", emoji: "🪄", count: 104, borderColour: "#00e56b" }
    ]
  },
  {
    userId: "cellular_maake",
    name: "Cellular Maake",
    email: "cellular@scoutme.org",
    role: "scout",
    province: "Gauteng",
    createdAt: new Date().toISOString(),
    tier: "professional",
    verifiedStatus: true,
    verifiedBadgeType: "professional",
    verificationApprovedAt: new Date().toISOString(),
    scoutStampsAvailable: 5,
    scoutStampsGiven: [],
    spotlightPostsThisWeek: 0,
    clinicUploadsCount: 2,
    organisation: "Stars of Africa Football Academy",
    scoutRole: "Technical Scout",
    accountType: "scout",
    bio: "Technical scout at Stars of Africa. Son of Freddie Saddam Maake. Connecting SA grassroots talent to the world.",
    followers: [],
    following: ["player_1", "player_2"],
    communityRating: 5.0,
    totalRatings: 10,
    talentBadges: []
  },
  {
    userId: "vino_snap",
    name: "Vino Snap",
    email: "vino@scoutme.org",
    role: "fan",
    province: "Gauteng",
    createdAt: new Date().toISOString(),
    tier: "community",
    verifiedStatus: true,
    verifiedBadgeType: "community",
    verificationApprovedAt: new Date().toISOString(),
    spotlightPostsThisWeek: 0,
    bio: "South African football culture. Kasi to the world.",
    followers: [],
    following: ["player_1"],
    communityRating: 5.0,
    totalRatings: 15,
    talentBadges: []
  },
  {
    userId: "club_1",
    name: "Diepkloof United FC",
    clubName: "Diepkloof United FC",
    email: "diepkloof@scoutme.org",
    role: "club",
    accountType: "club",
    province: "Gauteng",
    leagueAffiliation: "ABC Motsepe League",
    founded: 2008,
    bio: "Building future Bafana stars from the heart of Soweto since 2008",
    clubColours: ["#00e56b", "#f5c518"], // green and gold
    followersCount: 1204,
    postsCount: 23,
    playersSigned: 7,
    verified: true,
    followers: ["player_1", "player_2"],
    following: ["player_1"],
    createdAt: new Date().toISOString(),
    squad: [
      {
        userId: "player_1",
        name: "Sipho Dlamini",
        position: "CAM",
        age: 18,
        aiScore: 87,
        contractStatus: "Trial"
      },
      {
        userId: "player_2",
        name: "Thabo Nkosi",
        position: "ST",
        age: 19,
        aiScore: 83,
        contractStatus: "Signed"
      }
    ]
  },
  {
    userId: "club_2",
    name: "Khayelitsha City FC",
    clubName: "Khayelitsha City FC",
    email: "khayelitsha@scoutme.org",
    role: "club",
    accountType: "club",
    province: "Western Cape",
    leagueAffiliation: "SAB League",
    founded: 2012,
    bio: "Western Cape's most exciting youth development club",
    clubColours: ["#4da6ff", "#ffffff"], // blue and white
    followersCount: 876,
    postsCount: 17,
    playersSigned: 4,
    verified: false,
    followers: ["player_2", "player_3"],
    following: [],
    createdAt: new Date().toISOString(),
    squad: [
      {
        userId: "player_3",
        name: "Kagiso Sithole",
        position: "LB",
        age: 17,
        aiScore: 81,
        contractStatus: "Signed"
      }
    ]
  }
];

// Seed Post Highlights
const initialSeedPosts: PostHighlight[] = [
  {
    postId: "post_1",
    userId: "player_1",
    playerName: "Sipho Dlamini",
    position: "CAM",
    club: "ABC Motsepe- Soweto Owls",
    province: "Gauteng",
    videoUrl: "https://assets.mixkit.co/videos/preview/mixkit-player-kicking-a-soccer-ball-in-the-grass-32860-large.mp4",
    thumbnailUrl: "⚽ Strike Assist",
    caption: "Setting up our striker on a beautiful counter-attack drill from this Sunday match in eKasi. Team coordination is key! 🔥",
    tags: ["ScoutMe", "KasiFootball", "AthleteDiscovery", "BeingSeen"],
    contentType: "highlight",
    votes: 847,
    views: 12400,
    commentsCount: 3,
    timestamp: "2 hours ago",
    trending: false,
    comments: [
      {
        commentId: "c1",
        userId: "scout_1",
        userName: "Coach Lebo",
        role: "scout",
        text: "Exceptional weight on that touch, Sipho! Your transitional awareness is outstanding.",
        timestamp: "1 hour ago"
      },
      {
        commentId: "c2",
        userId: "player_2",
        userName: "Thabo Nkosi",
        role: "player",
        text: "Clean cross, my brother! Keep shining class.",
        timestamp: "30 mins ago"
      }
    ]
  },
  {
    postId: "post_2",
    userId: "player_5",
    playerName: "Ayanda Mkhize",
    position: "CM",
    club: "School League - Durban Academy",
    province: "KwaZulu-Natal",
    videoUrl: "https://assets.mixkit.co/videos/preview/mixkit-soccer-player-controlling-the-ball-on-the-field-32857-large.mp4",
    thumbnailUrl: "💎 Central Pivot Control",
    caption: "Controlling pressure in local tournament. High tempo, fast transitions. Ready to be tested in PSL standard.",
    tags: ["ScoutMe", "KasiFootball", "AthleteDiscovery"],
    contentType: "match",
    votes: 2341,
    views: 31000,
    commentsCount: 47,
    timestamp: "1 hour ago",
    trending: true,
    comments: [
      {
        commentId: "c3",
        userId: "scout_2",
        userName: "Professional Club Scout",
        role: "scout",
        text: "I am adding this boy to our watch list. Very composed at 16.",
        timestamp: "45 mins ago"
      }
    ]
  },
  {
    postId: "post_3",
    userId: "player_3",
    playerName: "Kagiso Sithole",
    position: "LB",
    club: "Community League- Khayelitsha City",
    province: "Western Cape",
    videoUrl: "https://assets.mixkit.co/videos/preview/mixkit-soccer-ball-hits-the-net-during-a-match-40501-large.mp4",
    thumbnailUrl: "🥅 Left-foot Free-kick",
    caption: "Decisive left-foot curve set piece into the upper corner. Train hard, play easy. Let me know what you think!",
    tags: ["ScoutMe", "BeingSeen", "AthleteDiscovery"],
    contentType: "training",
    votes: 1204,
    views: 18900,
    commentsCount: 12,
    timestamp: "1 day ago",
    trending: true,
    comments: []
  },
  {
    postId: "post_4",
    userId: "player_2",
    playerName: "Thabo Nkosi",
    position: "ST",
    club: "SAB League - Tembisa Gunners",
    province: "Gauteng",
    videoUrl: "https://assets.mixkit.co/videos/preview/mixkit-young-man-playing-soccer-on-a-clay-field-23005-large.mp4",
    thumbnailUrl: "🎯 Direct Volley",
    caption: "Quick control and direct strike on the clay field. eKasi streets build different players. 🇿🇦⚽",
    tags: ["ScoutMe", "KasiFootball", "AthleteDiscovery"],
    contentType: "highlight",
    votes: 612,
    views: 9800,
    commentsCount: 5,
    timestamp: "2 days ago",
    comments: []
  },
  {
    postId: "post_5",
    userId: "player_4",
    playerName: "Bongani Zulu",
    position: "GK",
    club: "NFD - Polokwane Stars",
    province: "Limpopo",
    videoUrl: "https://assets.mixkit.co/videos/preview/mixkit-goalkeeper-catching-the-soccer-ball-in-air-32863-large.mp4",
    thumbnailUrl: "🧤 Diving Double Save",
    caption: "Full intensity training drill. Keeping the concentration levels high matters every single second.",
    tags: ["ScoutMe", "AthleteDiscovery"],
    contentType: "training",
    votes: 434,
    views: 7200,
    commentsCount: 4,
    timestamp: "3 days ago",
    comments: []
  }
];

// Seed News Items
const initialSeedNews: NewsItem[] = [
  {
    newsId: "news_1",
    tag: "PSL",
    headline: "Bafana Bafana squad announced for COSAFA Cup",
    subtitle: "Coach Hugo Broos introduces local stars and young premier division prospects.",
    category: "PSL",
    timestamp: "10 mins ago",
    hot: true
  },
  {
    newsId: "news_2",
    tag: "ScoutMe",
    headline: "Ayanda Mkhize trending — 31K views in 48 hours",
    subtitle: "The 16-year-old midfield marvel is sparking major scout inquiries on ScoutMe.",
    category: "ScoutMe",
    timestamp: "1 hour ago",
    hot: true
  },
  {
    newsId: "news_3",
    tag: "Transfer",
    headline: "NFD side scouts 3 players from ScoutMe this week",
    subtitle: "Two wingers and a central defense anchor have secured direct trials based on app footage.",
    category: "Transfer",
    timestamp: "4 hours ago",
    hot: false
  },
  {
    newsId: "news_4",
    tag: "ABC Motsepe",
    headline: "Soweto Derby highlights — top performers rated",
    subtitle: "A professional analysis of tactical systems on the amateur and development divisions.",
    category: "ABC Motsepe",
    timestamp: "1 day ago",
    hot: false
  },
  {
    newsId: "news_5",
    tag: "AFCON",
    headline: "CAF announces 2026 qualifying fixtures",
    subtitle: "Matches slated for late October, with South Africa starting defense plans.",
    category: "AFCON",
    timestamp: "2 days ago",
    hot: false
  }
];

const initialSeedClubPosts: ClubPost[] = [
  {
    postId: "club_post_1",
    clubId: "club_1",
    postType: "matchday",
    mediaUrl: "https://assets.mixkit.co/videos/preview/mixkit-player-kicking-a-soccer-ball-in-the-grass-32860-large.mp4",
    mediaType: "video",
    caption: "Great victory today boys! A tactical masterclass against Orlando Pirates Dev. Proud of our squad. #ScoutMe #KasiFootball #SowetoFootball",
    likes: 154,
    comments: 2,
    timestamp: new Date(Date.now() - 3600000 * 5).toISOString(),
    pinned: true,
    tags: ["player_1"],
    likedBy: [],
    savedBy: [],
    commentsList: [
      {
        commentId: "cc_1",
        userId: "player_1",
        userName: "Sipho Dlamini",
        role: "player",
        text: "What a performance indeed! Hard work pays off.",
        timestamp: new Date(Date.now() - 3600000 * 4).toISOString()
      },
      {
        commentId: "cc_2",
        userId: "fan_1",
        userName: "Lehlohonolo",
        role: "fan",
        text: "Diepkloof to the world! 🔥",
        timestamp: new Date(Date.now() - 3600000 * 3).toISOString()
      }
    ],
    matchDetails: {
      opponent: "Orlando Pirates Dev",
      score: "3 - 1",
      location: "Soweto High Grounds"
    }
  },
  {
    postId: "club_post_2",
    clubId: "club_1",
    postType: "signing",
    mediaUrl: "https://images.unsplash.com/photo-1543351611-58f69d7c1781?w=800&auto=format&fit=cover&q=60",
    mediaType: "image",
    caption: "CONFIRMED: We are thrilled to announce the official signing of clinical goalscorer Thabo Nkosi to our u20 developmental roster. Welcome Thabo! #NewSigning #SowetoStars #KasiPower",
    likes: 284,
    comments: 1,
    timestamp: new Date(Date.now() - 3600000 * 24).toISOString(),
    pinned: false,
    tags: ["player_2"],
    likedBy: [],
    savedBy: [],
    commentsList: [
      {
        commentId: "cc_3",
        userId: "player_2",
        userName: "Thabo Nkosi",
        role: "player",
        text: "Grateful and excited to start this new chapter! Let's go!",
        timestamp: new Date(Date.now() - 3600000 * 23).toISOString()
      }
    ],
    signingDetails: {
      playerName: "Thabo Nkosi",
      position: "ST",
      taggedPlayerId: "player_2"
    }
  },
  {
    postId: "club_post_3",
    clubId: "club_2",
    postType: "training",
    mediaUrl: "https://images.unsplash.com/photo-1508098682722-e99c43a406b2?w=800&auto=format&fit=cover&q=60",
    mediaType: "image",
    caption: "Sharp tactics in the morning dew today. Preparing for South Africa's SAB promotion series. Focusing on high-pressing drills. #KhayelitshaRising #Tactics #KasiStrong",
    likes: 98,
    comments: 0,
    timestamp: new Date(Date.now() - 3600000 * 8).toISOString(),
    pinned: false,
    tags: ["player_3"],
    likedBy: [],
    savedBy: []
  }
];

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Load initial local states with localStorage backup
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(() => {
    const saved = localStorage.getItem("scoutme_current_user");
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        // Fallback
      }
    }
    const loggedOut = localStorage.getItem("scoutme_logged_out");
    if (loggedOut === "true") {
      return null;
    }
    return initialSeedPlayers[0];
  });

  const [users, setUsers] = useState<UserProfile[]>(() => {
    const saved = localStorage.getItem("scoutme_users");
    return saved ? JSON.parse(saved) : initialSeedPlayers;
  });

  const [posts, setPosts] = useState<PostHighlight[]>(() => {
    const saved = localStorage.getItem("scoutme_posts");
    return saved ? JSON.parse(saved) : initialSeedPosts;
  });

  const [clubPosts, setClubPosts] = useState<ClubPost[]>(() => {
    const saved = localStorage.getItem("scoutme_club_posts");
    return saved ? JSON.parse(saved) : initialSeedClubPosts;
  });

  const [notifications, setNotifications] = useState<AppNotification[]>(() => {
    const saved = localStorage.getItem("scoutme_notifications");
    return saved ? JSON.parse(saved) : [];
  });

  const [scoutReports, setScoutReports] = useState<ScoutReport[]>(() => {
    const saved = localStorage.getItem("scoutme_reports");
    return saved ? JSON.parse(saved) : [];
  });

  const [news, setNews] = useState<NewsItem[]>(() => {
    const saved = localStorage.getItem("scoutme_news");
    return saved ? JSON.parse(saved) : initialSeedNews;
  });

  const [shortlist, setShortlist] = useState<string[]>(() => {
    const saved = localStorage.getItem("scoutme_shortlist");
    return saved ? JSON.parse(saved) : [];
  });

  const [ratings, setRatings] = useState<RatingDoc[]>(() => {
    const saved = localStorage.getItem("scoutme_ratings");
    return saved ? JSON.parse(saved) : [];
  });

  const [pitchReports, setPitchReports] = useState<PitchReport[]>(() => {
    const saved = localStorage.getItem("scoutme_pitch_reports");
    const parsed = saved ? JSON.parse(saved) : [];
    if (parsed.length === 0) {
      return [
        {
          reportId: "report_seed_1",
          userId: "player_1",
          userName: "Sipho Dlamini",
          userRole: "player",
          mediaUrl: "https://images.unsplash.com/photo-1543351611-58f69d7c1781?w=800&auto=format&fit=cover&q=60",
          mediaType: "image",
          caption: "Match day focus! Let's go Owls 🦉🔥",
          textContent: "Match day focus! Let's go Owls 🦉🔥",
          backgroundColour: "pitch_green",
          audience: "everyone",
          expiresAt: new Date(Date.now() + 12 * 3600000).toISOString(),
          createdAt: new Date(Date.now() - 12 * 3600000).toISOString(),
          viewCount: 147,
          savedToMoments: false,
          replies: []
        },
        {
          reportId: "report_seed_2",
          userId: "player_2",
          userName: "Thabo Nkosi",
          userRole: "player",
          mediaUrl: "",
          mediaType: "text",
          textContent: "Morning training done. Shooting drills were clinical! ⚽🥅",
          backgroundColour: "dark_green",
          audience: "everyone",
          expiresAt: new Date(Date.now() + 23 * 3600000).toISOString(),
          createdAt: new Date(Date.now() - 1 * 3600000).toISOString(),
          viewCount: 201,
          savedToMoments: false,
          replies: []
        },
        {
          reportId: "report_seed_3",
          userId: "player_3",
          userName: "Kagiso Sithole",
          userRole: "player",
          mediaUrl: "https://images.unsplash.com/photo-1517466787929-bc90951d0974?w=800&auto=format&fit=cover&q=60",
          mediaType: "image",
          caption: "Chasing dreams out on the turf ⚡",
          textContent: "Chasing dreams out on the turf ⚡",
          backgroundColour: "gold",
          audience: "everyone",
          expiresAt: new Date(Date.now() + 2 * 3600000).toISOString(), // expires in 2 hours
          createdAt: new Date(Date.now() - 22 * 3600000).toISOString(),
          viewCount: 39,
          savedToMoments: false,
          replies: []
        }
      ];
    }
    return parsed;
  });

  const [careerMoments, setCareerMoments] = useState<CareerMoment[]>(() => {
    const saved = localStorage.getItem("scoutme_career_moments");
    const parsed = saved ? JSON.parse(saved) : [];
    if (parsed.length === 0) {
      return [
        {
          momentId: "moment_seed_1",
          userId: "player_1",
          title: "Best Goals",
          coverUrl: "https://images.unsplash.com/photo-1508098682722-e99c43a406b2?w=300&auto=format&fit=cover&q=60",
          contentIds: ["post_1"],
          createdAt: new Date().toISOString(),
          order: 1
        },
        {
          momentId: "moment_seed_2",
          userId: "player_1",
          title: "Top Skills",
          coverUrl: "https://images.unsplash.com/photo-1517466787929-bc90951d0974?w=300&auto=format&fit=cover&q=60",
          contentIds: ["post_2"],
          createdAt: new Date().toISOString(),
          order: 2
        }
      ];
    }
    return parsed;
  });

  const [liveSessions, setLiveSessions] = useState<LiveSession[]>(() => {
    const saved = localStorage.getItem("scoutme_live_sessions");
    return saved ? JSON.parse(saved) : [];
  });

  const [challengePosts, setChallengePosts] = useState<ChallengePost[]>(() => {
    const saved = localStorage.getItem("scoutme_challenge_posts");
    const parsed = saved ? JSON.parse(saved) : [];
    if (parsed.length === 0) {
      return [
        {
          challengeId: "challenge_1",
          creatorId: "vino_snap",
          creatorName: "Vino Snap",
          creatorRole: "Football Content Creator",
          title: "Show me your best first touch",
          description: "Grassroots ballers, upload your cleanest first touch control and dynamic turn. I'll spotlight the absolute best response to my 50K followers on eKasi!",
          hashtag: "#FirstTouchChallenge #ScoutMe",
          responseCount: 1,
          createdAt: new Date(Date.now() - 3600000 * 48).toISOString()
        }
      ];
    }
    return parsed;
  });

  const [challengeResponses, setChallengeResponses] = useState<ChallengeResponse[]>(() => {
    const saved = localStorage.getItem("scoutme_challenge_responses");
    const parsed = saved ? JSON.parse(saved) : [];
    if (parsed.length === 0) {
      return [
        {
          responseId: "resp_1",
          challengeId: "challenge_1",
          playerId: "player_1",
          playerName: "Sipho Dlamini",
          playerAvatarEmoji: "⚽",
          mediaUrl: "https://assets.mixkit.co/videos/preview/mixkit-player-kicking-a-soccer-ball-in-the-grass-32860-large.mp4",
          caption: "My entry for the Vino Snap #FirstTouchChallenge ! Composed turn & clean release. Let's grow! ⚡",
          votes: 142,
          createdAt: new Date(Date.now() - 3600000 * 24).toISOString()
        }
      ];
    }
    return parsed;
  });

  const [trialEvents] = useState<TrialEvent[]>([
    {
      trialEventId: "trial_event_1",
      clubId: "club_kaizer",
      clubName: "Kaizer Chiefs FC",
      drillId: "cone_slalom",
      drillName: "Cone Slalom",
      deadline: new Date(Date.now() + 7 * 24 * 3600000).toISOString(),
      createdAt: new Date(Date.now() - 2 * 24 * 3600000).toISOString(),
      isActive: true,
    },
    {
      trialEventId: "trial_event_2",
      clubId: "club_pirates",
      clubName: "Orlando Pirates Academy",
      drillId: "sprint_30m",
      drillName: "30M Sprint",
      deadline: new Date(Date.now() + 5 * 24 * 3600000).toISOString(),
      createdAt: new Date(Date.now() - 1 * 24 * 3600000).toISOString(),
      isActive: true,
    },
  ]);

  const [trialEventApplications, setTrialEventApplications] = useState<TrialEventApplication[]>([]);

  const [spotlightPosts, setSpotlightPosts] = useState<SpotlightPost[]>(() => {
    const saved = localStorage.getItem("scoutme_spotlight_posts");
    const parsed = saved ? JSON.parse(saved) : [];
    if (parsed.length === 0) {
      return [
        {
          spotlightId: "spot_1",
          creatorId: "cellular_maake",
          creatorName: "Cellular Maake",
          creatorRole: "Technical Scout",
          featuredPlayerId: "player_1",
          featuredPlayerName: "Sipho Dlamini",
          endorsementText: "Watching Sipho Dlamini in Soweto is pure joy. Outstanding scan rate, high football IQ, and absolute speed transitional stability. PSL scouts, pay close attention to this u18 CAM!",
          createdAt: new Date(Date.now() - 3600000 * 12).toISOString(),
          viewCount: 489,
          boostExpiresAt: new Date(Date.now() + 3600000 * 60).toISOString()
        }
      ];
    }
    return parsed;
  });

  const [verificationApplications, setVerificationApplications] = useState<VerificationApplication[]>(() => {
    const saved = localStorage.getItem("scoutme_verification_apps");
    return saved ? JSON.parse(saved) : [];
  });

  const [scoutStamps, setScoutStamps] = useState<ScoutStamp[]>(() => {
    const saved = localStorage.getItem("scoutme_scout_stamps");
    return saved ? JSON.parse(saved) : [];
  });

  // Listen to Firestore changes if db is available
  useEffect(() => {
    if (!db) return;
    
    // Listen to ratings real-time syncing
    const unsubscribeRatings = onSnapshot(collection(db, "ratings"), (snapshot) => {
      const liveRatings: RatingDoc[] = [];
      snapshot.forEach(doc => {
        liveRatings.push({ ratingId: doc.id, ...doc.data() } as RatingDoc);
      });
      setRatings(liveRatings);
      localStorage.setItem("scoutme_ratings", JSON.stringify(liveRatings));
    }, (err) => {
      console.warn("Firestore real-time ratings monitoring failed, falling back to local simulation:", err);
    });

    // Listen to users real-time syncing
    const unsubscribeUsers = onSnapshot(collection(db, "users"), (snapshot) => {
      const liveUsers: UserProfile[] = [];
      snapshot.forEach(doc => {
        liveUsers.push({ userId: doc.id, ...doc.data() } as UserProfile);
      });
      if (liveUsers.length > 0) {
        setUsers(prev => {
          // Merge live users into state safely to live sync
          const merged = [...liveUsers];
          prev.forEach(u => {
            if (!merged.some(lu => lu.userId === u.userId)) {
              merged.push(u);
            }
          });
          return merged;
        });
      }
    }, (err) => {
      console.warn("Firestore real-time users monitoring failed, falling back to local simulation:", err);
    });

    // Listen to ClubPosts real-time syncing
    const unsubscribeClubPosts = onSnapshot(collection(db, "ClubPosts"), (snapshot) => {
      const liveClubPosts: ClubPost[] = [];
      snapshot.forEach(doc => {
        liveClubPosts.push({ postId: doc.id, ...doc.data() } as ClubPost);
      });
      if (liveClubPosts.length > 0) {
        setClubPosts(liveClubPosts);
      }
    }, (err) => {
      console.warn("Firestore real-time ClubPosts monitoring failed:", err);
    });

    // Listen to posts real-time syncing (live feed)
    const unsubscribePosts = onSnapshot(
      query(collection(db, "posts"), orderBy("createdAt", "desc"), limit(20)),
      (snapshot) => {
        if (snapshot.docs.length > 0) {
          const livePosts: PostHighlight[] = snapshot.docs.map(d => ({
            postId: d.id,
            votes: 0,
            views: 0,
            commentsCount: 0,
            comments: [],
            timestamp: "Recently",
            trending: false,
            isArchived: false,
            ...d.data(),
          } as PostHighlight));
          setPosts(livePosts);
        }
        setPostsLoading(false);
      },
      (err) => {
        console.warn("Firestore posts listener failed:", err);
        setPostsLoading(false);
      }
    );

    // Notifications are re-subscribed per-user in a separate useEffect below
    const unsubscribeNotifications = () => {};

    return () => {
      unsubscribeRatings();
      unsubscribeUsers();
      unsubscribeClubPosts();
      unsubscribeNotifications();
      unsubscribePosts();
    };
  }, []);

  // Re-subscribe notifications when currentUser changes (login/logout)
  useEffect(() => {
    if (!db || !currentUser?.userId) return;
    const notifQuery = query(
      collection(db, "notifications"),
      where("recipientId", "==", currentUser.userId),
      orderBy("createdAt", "desc"),
      limit(30)
    );
    const unsub = onSnapshot(notifQuery, (snapshot) => {
      const live: AppNotification[] = snapshot.docs.map(d => ({
        notificationId: d.id, ...d.data()
      } as AppNotification));
      setNotifications(live);
    }, (err) => {
      console.warn("Notifications listener failed:", err);
    });
    return () => unsub();
  }, [currentUser?.userId]);

  const [onboardingStep, setOnboardingStep] = useState<number>(() => {
    const loggedOut = localStorage.getItem("scoutme_logged_out");
    const savedUser = localStorage.getItem("scoutme_current_user");
    if (loggedOut === "true" || !savedUser) {
      return 1;
    }
    const saved = sessionStorage.getItem("scoutme_onboarding_step");
    return saved ? parseInt(saved) : 5;
  });

  const [selectedOnboardingRole, setSelectedOnboardingRole] = useState<UserRole | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [offlineMode, setOfflineMode] = useState<boolean>(true);
  const [postsLoading, setPostsLoading] = useState<boolean>(!isDemoMode && !!db); // default true for immediate local simulation

  // Persists states in localStorage
  useEffect(() => {
    localStorage.setItem("scoutme_users", JSON.stringify(users));
  }, [users]);

  useEffect(() => {
    localStorage.setItem("scoutme_posts", JSON.stringify(posts));
  }, [posts]);

  useEffect(() => {
    localStorage.setItem("scoutme_reports", JSON.stringify(scoutReports));
  }, [scoutReports]);

  useEffect(() => {
    localStorage.setItem("scoutme_shortlist", JSON.stringify(shortlist));
  }, [shortlist]);

  useEffect(() => {
    localStorage.setItem("scoutme_news", JSON.stringify(news));
  }, [news]);

  useEffect(() => {
    localStorage.setItem("scoutme_club_posts", JSON.stringify(clubPosts));
  }, [clubPosts]);

  useEffect(() => {
    localStorage.setItem("scoutme_notifications", JSON.stringify(notifications));
  }, [notifications]);

  useEffect(() => {
    localStorage.setItem("scoutme_pitch_reports", JSON.stringify(pitchReports));
  }, [pitchReports]);

  useEffect(() => {
    localStorage.setItem("scoutme_career_moments", JSON.stringify(careerMoments));
  }, [careerMoments]);

  useEffect(() => {
    localStorage.setItem("scoutme_live_sessions", JSON.stringify(liveSessions));
  }, [liveSessions]);

  useEffect(() => {
    localStorage.setItem("scoutme_challenge_posts", JSON.stringify(challengePosts));
  }, [challengePosts]);

  useEffect(() => {
    localStorage.setItem("scoutme_challenge_responses", JSON.stringify(challengeResponses));
  }, [challengeResponses]);

  useEffect(() => {
    localStorage.setItem("scoutme_spotlight_posts", JSON.stringify(spotlightPosts));
  }, [spotlightPosts]);

  useEffect(() => {
    localStorage.setItem("scoutme_verification_apps", JSON.stringify(verificationApplications));
  }, [verificationApplications]);

  useEffect(() => {
    localStorage.setItem("scoutme_scout_stamps", JSON.stringify(scoutStamps));
  }, [scoutStamps]);

  useEffect(() => {
    if (currentUser) {
      localStorage.setItem("scoutme_current_user", JSON.stringify(currentUser));
      localStorage.removeItem("scoutme_logged_out");
    } else {
      localStorage.removeItem("scoutme_current_user");
    }
  }, [currentUser]);

  useEffect(() => {
    sessionStorage.setItem("scoutme_onboarding_step", onboardingStep.toString());
  }, [onboardingStep]);

  // Utility helper for wrapping Firebase operations in a timeout
  const withTimeout = async <T,>(promise: Promise<T>, ms: number, errorMsg: string): Promise<T> => {
    let timeoutId: any;
    const timeoutPromise = new Promise<never>((_, reject) => {
      timeoutId = setTimeout(() => {
        reject(new Error(errorMsg));
      }, ms);
    });
    return Promise.race([promise, timeoutPromise]).finally(() => {
      clearTimeout(timeoutId);
    });
  };

  // Account creation handling
  const signUpUser = async (profile: Partial<UserProfile>, password?: string): Promise<boolean> => {
    setLoading(true);
    setError(null);

    try {
      if (!auth || !profile.email || !password) {
        setLoading(false);
        triggerGlobalToast("Please provide a valid email and password.", "error");
        return false;
      }

      let authUserId: string;

      try {
        const authResult = await createUserWithEmailAndPassword(auth, profile.email, password);
        authUserId = authResult.user.uid;
        sendEmailVerification(authResult.user)
          .then(() => triggerGlobalToast("Verification email sent ✦ Please check your inbox.", "success"))
          .catch(e => console.warn("[Auth] sendEmailVerification failed:", e));
      } catch (authErr: any) {
        const code = authErr?.code || "";
        const friendlyMessage = SIGNUP_USER_ACTIONABLE_ERRORS[code];
        setLoading(false);
        triggerGlobalToast(friendlyMessage || "Something went wrong. Please try again.", "error");
        return false;
      }

      const newProfile: UserProfile = {
        userId: authUserId,
        name: profile.name || "",
        email: profile.email || "",
        role: profile.role || "player",
        province: profile.province || "Gauteng",
        createdAt: new Date().toISOString(),
        followers: [],
        following: [],
        bio: profile.bio || "Grassroots football enthusiast.",
        ...(profile.role === "player" && {
          position: profile.position || "CAM",
          age: profile.age || 18,
          club: profile.club || "Unattached",
          agreementSigned: false,
          votes: 0,
          views: 0,
          pace: Math.floor(Math.random() * 25) + 70,
          vision: Math.floor(Math.random() * 25) + 70,
          finishing: Math.floor(Math.random() * 25) + 70,
          rating: 75,
          endorsed: false
        }),
        ...((profile.role === "scout" || profile.role === "club") && {
          organisation: profile.organisation || "Amateur Scout Network",
          scoutRole: profile.scoutRole || "Independent Scout",
          accountType: profile.accountType || (profile.role === "club" ? "club" : "scout"),
          ...(profile.accountType === "club" && {
            clubName: profile.clubName || profile.name || "",
            leagueAffiliation: profile.leagueAffiliation || "SAB League",
            founded: profile.founded || 2026,
            clubBio: profile.clubBio || profile.bio || "Grassroots football organization.",
            clubColours: profile.clubColours || ["#00e56b", "#f5c518"],
            website: profile.website || "",
            followersCount: 0,
            postsCount: 0,
            playersSigned: 0,
            verified: false,
            squad: []
          })
        })
      };

      // Write to Firestore (non-blocking — don't fail registration if Firestore is slow)
      if (!isDemoMode && db) {
        setDoc(doc(db, "users", newProfile.userId), newProfile).catch(e =>
          console.warn("[Firestore] User write failed:", e)
        );
      }

      setUsers(prev =>
        prev.some(u => u.userId === newProfile.userId)
          ? prev.map(u => u.userId === newProfile.userId ? newProfile : u)
          : [...prev, newProfile]
      );
      setCurrentUser(newProfile);
      setLoading(false);
      // Request FCM permission after signup (non-blocking)
      requestNotificationPermission(newProfile.userId);

      // Queue welcome email
      if (newProfile.email) {
        fetch("/api/queue-waiting-list", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: newProfile.email, name: newProfile.name, role: newProfile.role })
        }).catch(() => {});
      }

      return true;
    } catch (err: any) {
      console.error("[Auth] Unexpected sign-up error:", err);
      setLoading(false);
      triggerGlobalToast("Something went wrong. Please try again.", "error");
      return false;
    }
  };

  const signInUser = async (email: string, role: UserRole, password?: string): Promise<boolean> => {
    setLoading(true);
    setError(null);

    try {
      if (!auth || !password) {
        setLoading(false);
        triggerGlobalToast("Please enter your password.", "error");
        return false;
      }

      let targetUserId: string;

      try {
        const authResult = await signInWithEmailAndPassword(auth, email, password);
        targetUserId = authResult.user.uid;
      } catch (authErr: any) {
        const code = authErr?.code || "";
        const friendlyMessage = SIGNIN_USER_ACTIONABLE_ERRORS[code];
        setLoading(false);
        triggerGlobalToast(friendlyMessage || "Unable to connect. Please check your internet and try again.", "error");
        return false;
      }

      // Official account: skip onboarding, assign platform role
      if (email.toLowerCase() === OFFICIAL_ACCOUNT_EMAIL.toLowerCase()) {
        const officialProfile: UserProfile = {
          userId: targetUserId,
          name: "ScoutMe Official",
          email: OFFICIAL_ACCOUNT_EMAIL,
          role: "platform",
          province: "South Africa",
          createdAt: new Date().toISOString(),
          isOfficialAccount: true,
          bio: "Discovering Africa's football talent. Player of the Week every Monday. Signing announcements. Platform updates. 🇿🇦⚽",
          followers: [],
          following: [],
        };
        if (db) {
          setDoc(doc(db, "users", targetUserId), officialProfile, { merge: true }).catch(() => {});
        }
        setCurrentUser(officialProfile);
        setUsers(prev => prev.some(u => u.userId === targetUserId) ? prev.map(u => u.userId === targetUserId ? officialProfile : u) : [...prev, officialProfile]);
        setOnboardingStep(6);
        setLoading(false);
        return true;
      }

      // Load profile from local cache first, then Firestore
      let user: UserProfile | undefined = users.find(u => u.userId === targetUserId);

      if (!user && db) {
        try {
          const userSnap = await getDoc(doc(db, "users", targetUserId));
          if (userSnap.exists()) {
            user = { userId: userSnap.id, ...userSnap.data() } as UserProfile;
            setUsers(prev => [...prev.filter(u => u.userId !== user!.userId), user!]);
          }
        } catch (e) {
          console.warn("[Firestore] Profile fetch failed:", e);
        }
      }

      if (user) {
        setCurrentUser(user);
        setLoading(false);
        // Request FCM permission after login (non-blocking)
        requestNotificationPermission(user.userId);
        return true;
      }

      // Auth succeeded but no Firestore profile yet — create one
      const newProfile: Partial<UserProfile> = {
        email,
        role,
        name: email.split("@")[0].toUpperCase(),
        province: "Gauteng",
      };
      const created = await signUpUser({ ...newProfile, userId: targetUserId } as any, undefined);
      setLoading(false);
      return created;
    } catch (err: any) {
      console.error("[Auth] Unexpected sign-in error:", err);
      setLoading(false);
      triggerGlobalToast("Something went wrong. Please try again.", "error");
      return false;
    }
  };

  const signOutUser = async () => {
    try {
      await auth?.signOut();
    } catch (e) {
      console.log("Auth signOut error:", e);
    }
    localStorage.removeItem("scoutme_current_user");
    localStorage.removeItem("scoutme_session");
    localStorage.removeItem("scoutme_logged_out");
    setCurrentUser(null);
    setOnboardingStep(1);
    setSelectedOnboardingRole(null);
  };

  const resendVerificationEmail = async () => {
    const user = auth?.currentUser;
    if (user) {
      try {
        await sendEmailVerification(user);
      } catch (e) {
        console.warn("[Auth] Failed to resend verification email:", e);
      }
    }
  };

  const updateBio = (bio: string, extraFields?: Partial<UserProfile>) => {
    if (!currentUser) return;
    const updated = { ...currentUser, bio, ...extraFields };
    setCurrentUser(updated);
    setUsers(prev => {
      const nextUsers = prev.map(u => u.userId === currentUser.userId ? updated : u);
      localStorage.setItem("scoutme_users", JSON.stringify(nextUsers));
      return nextUsers;
    });
    localStorage.setItem("scoutme_current_user", JSON.stringify(updated));
  };

  const updateAvatar = async (avatarBase64: string) => {
    if (!currentUser) return;
    const updated = { ...currentUser, avatarBase64 };
    setCurrentUser(updated);
    setUsers(prev => {
      const nextUsers = prev.map(u => u.userId === currentUser.userId ? updated : u);
      localStorage.setItem("scoutme_users", JSON.stringify(nextUsers));
      return nextUsers;
    });
    localStorage.setItem("scoutme_current_user", JSON.stringify(updated));
    if (!isDemoMode && db) {
      try {
        const { doc, updateDoc } = await import("firebase/firestore");
        await updateDoc(doc(db, "users", currentUser.userId), { avatarBase64 });
      } catch (e) {
        console.log("Firestore avatar update failed:", e);
      }
    }
  };

  const signDigitalAgreement = () => {
    if (!currentUser) return;
    const updated: UserProfile = {
      ...currentUser,
      agreementSigned: true,
      agreementSignedAt: new Date().toISOString()
    };
    setCurrentUser(updated);
    setUsers(prev => prev.map(u => u.userId === currentUser.userId ? updated : u));
  };

  const votePost = (postId: string) => {
    let targetPost: PostHighlight | undefined;
    setPosts(prev => prev.map(p => {
      if (p.postId === postId) {
        targetPost = p;
        setUsers(prevUsers => prevUsers.map(u => {
          if (u.name === p.playerName) return { ...u, votes: (u.votes || 0) + 1 };
          return u;
        }));
        return { ...p, votes: p.votes + 1 };
      }
      return p;
    }));
    if (!isDemoMode && db) {
      updateDoc(doc(db, "posts", postId), { votes: increment(1) }).catch(e =>
        console.warn("[Firestore] Vote update failed:", e)
      );
    }
    // Notify post owner — rate-limit to once per hour per post
    setTimeout(() => {
      if (!targetPost || !currentUser) return;
      const owner = users.find(u => u.name === targetPost!.playerName);
      if (!owner || owner.userId === currentUser.userId) return;
      const rateLimitKey = `vote_notif_${postId}`;
      const lastSent = parseInt(localStorage.getItem(rateLimitKey) || "0");
      if (Date.now() - lastSent < 3600000) return;
      localStorage.setItem(rateLimitKey, String(Date.now()));
      addSystemNotification(owner.userId,
        `▲ ${currentUser.name} voted for your highlight. Keep posting! 🔥`
      );
    }, 500);
  };

  const addComment = (postId: string, commentText: string) => {
    if (!currentUser) return;
    const newComment: PostComment = {
      commentId: `c_${Date.now()}`,
      userId: currentUser.userId,
      userName: currentUser.name,
      role: currentUser.role,
      text: commentText,
      timestamp: "Just now"
    };

    setPosts(prev => prev.map(p => {
      if (p.postId === postId) {
        return {
          ...p,
          commentsCount: p.commentsCount + 1,
          comments: [...(p.comments || []), newComment]
        };
      }
      return p;
    }));
  };

  const toggleShortlist = (playerId: string) => {
    setShortlist(prev => {
      if (prev.includes(playerId)) {
        return prev.filter(id => id !== playerId);
      } else {
        return [...prev, playerId];
      }
    });
  };

  // Generate Neural Scout report via backend API with elegant fallback
  const generateReport = async (playerId: string, scores: { pace: number; vision: number; finishing: number }): Promise<ScoutReport | null> => {
    if (!currentUser) return null;
    setLoading(true);
    setError(null);
    try {
      const playerProfile = users.find(u => u.userId === playerId);
      if (!playerProfile) throw new Error("Player profile not found");

      // Set default weights or computed attributes
      const overall = Math.round((scores.pace + scores.vision + scores.finishing) / 3);
      const confLevel = overall > 85 ? "HIGH" : overall > 75 ? "MEDIUM" : "LOW";
      const rec = overall > 85 ? "TRIAL RECOMMENDED" : overall > 72 ? "MONITOR" : "MORE DATA NEEDED";

      // Call our API endpoint
      const res = await fetch("/api/gemini/report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: playerProfile.name,
          position: playerProfile.position,
          age: playerProfile.age,
          league: playerProfile.club,
          province: playerProfile.province,
          pace: scores.pace,
          vision: scores.vision,
          finishing: scores.finishing,
          votes: playerProfile.votes || 0,
          views: playerProfile.views || 0
        })
      });

      const data = await res.json();
      const generatedReport = data.report || "Simulation: Standard evaluation recorded successfully.";

      const newReport: ScoutReport = {
        reportId: `rep_${Date.now()}`,
        scoutId: currentUser.userId,
        playerId: playerProfile.userId,
        playerName: playerProfile.name,
        generatedReport,
        paceScore: scores.pace,
        visionScore: scores.vision,
        finishingScore: scores.finishing,
        overallScore: overall,
        confidence: confLevel as any,
        recommendation: rec as any,
        createdAt: new Date().toLocaleDateString() + " · " + new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };

      setScoutReports(prev => [newReport, ...prev]);
      setLoading(false);
      return newReport;
    } catch (err: any) {
      console.warn("Express backend report API error, generating mock report with high-fidelity local text.", err);
      // Fallback local report generation
      const playerProfile = users.find(u => u.userId === playerId)!;
      const overall = Math.round((scores.pace + scores.vision + scores.finishing) / 3);
      const confLevel = overall > 85 ? "HIGH" : "MEDIUM";
      const rec = overall > 85 ? "TRIAL RECOMMENDED" : "MONITOR";
      
      const newReport: ScoutReport = {
        reportId: `rep_${Date.now()}`,
        scoutId: currentUser?.userId || "scout_1",
        playerId: playerId,
        playerName: playerProfile?.name || "Player",
        generatedReport: `[Local Simulation] ${playerProfile?.name} demonstrates deep technical maturity playing in the ${playerProfile?.position} position. With physical scores showcasing ${scores.pace}/100 pace and ${scores.vision}/100 vision, their awareness and execution under pressure are remarkable for age ${playerProfile?.age}. Highly recommended for direct academy assessment.`,
        paceScore: scores.pace,
        visionScore: scores.vision,
        finishingScore: scores.finishing,
        overallScore: overall,
        confidence: confLevel as any,
        recommendation: rec as any,
        createdAt: new Date().toLocaleDateString()
      };

      setScoutReports(prev => [newReport, ...prev]);
      setLoading(false);
      return newReport;
    }
  };

  const addNewPost = (postData: Partial<PostHighlight>) => {
    if (!currentUser) return;
    const newPost: PostHighlight = {
      postId: `post_${Date.now()}`,
      userId: currentUser.userId,
      playerName: currentUser.name,
      position: currentUser.position || "CAM",
      club: currentUser.club || "Unattached",
      province: currentUser.province,
      videoUrl: postData.videoUrl || "https://assets.mixkit.co/videos/preview/mixkit-soccer-ball-hits-the-net-during-a-match-40501-large.mp4",
      thumbnailUrl: postData.thumbnailUrl || "⚽ Training Drill Highlights",
      caption: postData.caption || "Hard work and dedication on and off the pitch.",
      tags: postData.tags || ["ScoutMe", "KasiFootball", "AthleteDiscovery"],
      contentType: (postData.contentType || "highlight") as any,
      votes: 0,
      views: 1,
      commentsCount: 0,
      timestamp: "Just now",
      comments: []
    };

    setPosts(prev => [newPost, ...prev]);
  };

  const submitRating = async (playerId: string, starRating: number) => {
    if (!currentUser) return;
    if (currentUser.userId === playerId) {
      alert("Players cannot rate themselves!");
      return;
    }
    if (currentUser.role === "scout" || currentUser.role === "club") {
      alert("Scouts and clubs cannot submit community ratings!");
      return;
    }

    const ratingId = `${currentUser.userId}_${playerId}`;
    
    // Find if there is an existing ratingDoc
    const existingRating = ratings.find(r => r.ratingId === ratingId);
    
    const newRatingDoc: RatingDoc = {
      ratingId,
      fanId: currentUser.userId,
      playerId,
      starRating,
      awardedBadges: existingRating?.awardedBadges || [],
      createdAt: existingRating?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    // Update state & localStorage
    const updatedRatings = ratings.some(r => r.ratingId === ratingId)
      ? ratings.map(r => r.ratingId === ratingId ? newRatingDoc : r)
      : [...ratings, newRatingDoc];
      
    setRatings(updatedRatings);
    localStorage.setItem("scoutme_ratings", JSON.stringify(updatedRatings));

    // Calculate details for player doc updates
    // Filter ratings for this player (using the updated ratings array)
    const playerRatings = updatedRatings.filter(r => r.playerId === playerId);
    const sum = playerRatings.reduce((acc, curr) => acc + curr.starRating, 0);
    const total = playerRatings.length;
    const average = parseFloat((sum / total).toFixed(1));

    // Update player profile doc in state
    setUsers(prev => prev.map(u => {
      if (u.userId === playerId) {
        return {
          ...u,
          communityRating: average,
          totalRatings: total
        };
      }
      return u;
    }));

    // If Firestore is available, write to Firestore
    if (db) {
      try {
        await setDoc(doc(db, "ratings", ratingId), {
          fanId: newRatingDoc.fanId,
          playerId: newRatingDoc.playerId,
          starRating: newRatingDoc.starRating,
          awardedBadges: newRatingDoc.awardedBadges,
          createdAt: newRatingDoc.createdAt,
          updatedAt: newRatingDoc.updatedAt
        });

        // Also update player profile doc in firestore
        const playerDocRef = doc(db, "users", playerId);
        const playerSnap = await getDoc(playerDocRef);
        if (playerSnap.exists()) {
          await updateDoc(playerDocRef, {
            communityRating: average,
            totalRatings: total
          });
        } else {
          // If player is not yet in the DB's users collection (e.g. they exist locally), set them
          const p = users.find(u => u.userId === playerId);
          if (p) {
            await setDoc(playerDocRef, {
              ...p,
              communityRating: average,
              totalRatings: total
            });
          }
        }
      } catch (err) {
        console.error("Error writing to Firestore ratings: ", err);
      }
    }
  };

  const awardTalentBadge = async (playerId: string, badgeName: string, emoji: string, borderColour: string) => {
    if (!currentUser) return;
    if (currentUser.userId === playerId) {
      alert("Players cannot award badges to themselves!");
      return;
    }
    if (currentUser.role === "scout" || currentUser.role === "club") {
      alert("Scouts and clubs cannot award community badges!");
      return;
    }

    const ratingId = `${currentUser.userId}_${playerId}`;
    const existingRating = ratings.find(r => r.ratingId === ratingId);

    // One badge award per fan per badge per player — once awarded a badge cannot be unawarded
    if (existingRating?.awardedBadges?.includes(badgeName)) {
      alert("You have already awarded this badge to this player!");
      return;
    }

    const updatedBadges = [...(existingRating?.awardedBadges || []), badgeName];

    const newRatingDoc: RatingDoc = {
      ratingId,
      fanId: currentUser.userId,
      playerId,
      starRating: existingRating?.starRating || 0, // Keep existing or 0 if they haven't rated stars yet
      awardedBadges: updatedBadges,
      createdAt: existingRating?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    // Update state & localStorage
    const updatedRatings = ratings.some(r => r.ratingId === ratingId)
      ? ratings.map(r => r.ratingId === ratingId ? newRatingDoc : r)
      : [...ratings, newRatingDoc];

    setRatings(updatedRatings);
    localStorage.setItem("scoutme_ratings", JSON.stringify(updatedRatings));

    // Recalculate talentBadges count for target player profile
    setUsers(prev => prev.map(u => {
      if (u.userId === playerId) {
        const curBadges = u.talentBadges ? [...u.talentBadges] : [];
        const targetBadgeIdx = curBadges.findIndex(b => b.badgeName === badgeName);
        if (targetBadgeIdx > -1) {
          curBadges[targetBadgeIdx] = {
            ...curBadges[targetBadgeIdx],
            count: curBadges[targetBadgeIdx].count + 1
          };
        } else {
          curBadges.push({
            badgeName,
            emoji,
            count: 1,
            borderColour
          });
        }
        
        // Sort descending by count
        curBadges.sort((a, b) => b.count - a.count);

        return {
          ...u,
          talentBadges: curBadges
        };
      }
      return u;
    }));

    // If Firestore is available, write to Firestore
    if (db) {
      try {
        await setDoc(doc(db, "ratings", ratingId), {
          fanId: newRatingDoc.fanId,
          playerId: newRatingDoc.playerId,
          starRating: newRatingDoc.starRating,
          awardedBadges: newRatingDoc.awardedBadges,
          createdAt: newRatingDoc.createdAt,
          updatedAt: newRatingDoc.updatedAt
        });

        // Update player document badges
        const playerDocRef = doc(db, "users", playerId);
        const playerSnap = await getDoc(playerDocRef);
        
        // Find existing or create
        let liveBadges: any[] = [];
        if (playerSnap.exists()) {
          const data = playerSnap.data();
          liveBadges = data.talentBadges ? [...data.talentBadges] : [];
        } else {
          const p = users.find(u => u.userId === playerId);
          if (p && p.talentBadges) {
            liveBadges = [...p.talentBadges];
          }
        }

        const bIdx = liveBadges.findIndex(b => b.badgeName === badgeName);
        if (bIdx > -1) {
          liveBadges[bIdx].count += 1;
        } else {
          liveBadges.push({ badgeName, emoji, count: 1, borderColour });
        }
        liveBadges.sort((a, b) => b.count - a.count);

        if (playerSnap.exists()) {
          await updateDoc(playerDocRef, {
            talentBadges: liveBadges
          });
        } else {
          const p = users.find(u => u.userId === playerId);
          if (p) {
            await setDoc(playerDocRef, {
              ...p,
              talentBadges: liveBadges
            });
          }
        }
      } catch (err) {
        console.error("Error updating badges in Firestore: ", err);
      }
    }
  };

  const toggleFollow = (targetUserId: string) => {
    if (!currentUser) return;
    if (currentUser.userId === targetUserId) {
      alert("You cannot follow yourself!");
      return;
    }

    const currentFollowing = currentUser.following || [];
    const isNowFollowing = currentFollowing.includes(targetUserId);
    const updatedFollowing = isNowFollowing
      ? currentFollowing.filter(id => id !== targetUserId)
      : [...currentFollowing, targetUserId];

    const updatedCurrentUser = {
      ...currentUser,
      following: updatedFollowing
    };

    setCurrentUser(updatedCurrentUser);

    setUsers(prev => prev.map(u => {
      if (u.userId === currentUser.userId) {
        return updatedCurrentUser;
      }
      if (u.userId === targetUserId) {
        const targetFollowers = u.followers || [];
        const updatedFollowers = isNowFollowing
          ? targetFollowers.filter(id => id !== currentUser.userId)
          : [...targetFollowers, currentUser.userId];
        return {
          ...u,
          followers: updatedFollowers
        };
      }
      return u;
    }));

    if (db) {
      const currentUserRef = doc(db, "users", currentUser.userId);
      updateDoc(currentUserRef, { following: updatedFollowing }).catch(err => {
        console.error("Error updating following list in Firestore: ", err);
      });

      const targetUserRef = doc(db, "users", targetUserId);
      const targetUser = users.find(u => u.userId === targetUserId);
      if (targetUser) {
        const targetFollowers = targetUser.followers || [];
        const updatedFollowers = isNowFollowing
          ? targetFollowers.filter(id => id !== currentUser.userId)
          : [...targetFollowers, currentUser.userId];
        updateDoc(targetUserRef, { followers: updatedFollowers }).catch(err => {
          console.error("Error updating followers list in Firestore: ", err);
        });

        // Add ClubFollowers collection record
        if (targetUser.role === "club" || targetUser.accountType === "club") {
          const followDocId = `${currentUser.userId}_${targetUserId}`;
          if (!isNowFollowing) {
            setDoc(doc(db, "ClubFollowers", followDocId), {
              followerId: currentUser.userId,
              clubId: targetUserId,
              createdAt: new Date().toISOString()
            }).catch(err => console.error("Error writing ClubFollower:", err));
          }
        }
      }
    }
  };

  // ── FCM Token Registration ─────────────────────────────────────────────────
  const requestNotificationPermission = async (userId: string) => {
    if (!db || typeof Notification === "undefined") return;
    try {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") return;
      const vapidKey = (import.meta as any).env?.VITE_FIREBASE_VAPID_KEY;
      if (!vapidKey || vapidKey === "your_vapid_key_here") return;
      const { getFirebaseMessaging } = await import("../firebase");
      const { getToken, onMessage } = await import("firebase/messaging");
      const msg = await getFirebaseMessaging();
      if (!msg) return;
      const token = await getToken(msg, { vapidKey });
      if (token) {
        await updateDoc(doc(db, "users", userId), { fcmToken: token, notificationsEnabled: true });
        // Foreground push display
        onMessage(msg, (payload) => {
          const title = payload.notification?.title || "ScoutMe";
          const body = payload.notification?.body || "";
          if (Notification.permission === "granted") {
            new Notification(title, {
              body,
              icon: "/scoutme_logo.png",
              badge: "/icon-192.png",
            });
          }
        });
      }
    } catch (err) {
      console.warn("[FCM] Token registration failed:", err);
    }
  };

  // ── Notification Read/Unread ───────────────────────────────────────────────
  const markNotificationRead = async (notificationId: string) => {
    setNotifications(prev => prev.map(n =>
      n.notificationId === notificationId ? { ...n, read: true } : n
    ));
    if (db) {
      updateDoc(doc(db, "notifications", notificationId), { read: true }).catch(() => {});
    }
  };

  const markAllNotificationsRead = async () => {
    const unread = notifications.filter(n => !n.read && n.recipientId === currentUser?.userId);
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    if (db) {
      await Promise.all(unread.map(n =>
        updateDoc(doc(db, "notifications", n.notificationId), { read: true }).catch(() => {})
      ));
    }
  };

  const unreadNotificationsCount = notifications.filter(
    n => !n.read && n.recipientId === currentUser?.userId
  ).length;

  const addSystemNotification = async (recipientId: string, text: string) => {
    const newNotif: AppNotification = {
      notificationId: `notif_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
      recipientId,
      text,
      createdAt: new Date().toISOString(),
      read: false
    };

    setNotifications(prev => [newNotif, ...prev]);

    if (db) {
      setDoc(doc(db, "notifications", newNotif.notificationId), newNotif).catch(err =>
        console.error("Error writing notification in Firestore:", err)
      );
    }
  };

  const addClubPost = async (postData: Partial<ClubPost>) => {
    if (!currentUser) return;
    const newPost: ClubPost = {
      postId: `club_post_${Date.now()}`,
      clubId: currentUser.userId,
      postType: postData.postType || "announcement",
      mediaUrl: postData.mediaUrl || "",
      mediaType: postData.mediaType || "image",
      caption: postData.caption || "",
      tags: postData.tags || [],
      likes: 0,
      comments: 0,
      timestamp: new Date().toISOString(),
      pinned: false,
      likedBy: [],
      savedBy: [],
      commentsList: [],
      matchDetails: postData.matchDetails,
      signingDetails: postData.signingDetails
    };

    setClubPosts(prev => [newPost, ...prev]);

    // Update postsCount on club profile
    const updatedUser = {
      ...currentUser,
      postsCount: (currentUser.postsCount || 0) + 1
    };
    setCurrentUser(updatedUser);
    setUsers(prev => prev.map(u => u.userId === currentUser.userId ? updatedUser : u));

    if (db) {
      try {
        await setDoc(doc(db, "ClubPosts", newPost.postId), newPost);
        await updateDoc(doc(db, "users", currentUser.userId), { postsCount: updatedUser.postsCount });
      } catch (err) {
        console.error("Error writing ClubPost to Firestore:", err);
      }
    }

    // Tag alerts notifications
    if (newPost.tags && newPost.tags.length > 0) {
      const clubDisplayName = currentUser.clubName || currentUser.name;
      for (const taggedPlayerId of newPost.tags) {
        if (newPost.postType === "signing") {
          await addSystemNotification(taggedPlayerId, `Congratulations — ${clubDisplayName} has announced your signing ✦`);
        } else {
          await addSystemNotification(taggedPlayerId, `${clubDisplayName} tagged you in a post`);
        }
      }
    }
  };

  const toggleLikeClubPost = async (postId: string) => {
    if (!currentUser) return;
    setClubPosts(prev => prev.map(post => {
      if (post.postId === postId) {
        const likedBy = post.likedBy || [];
        const isLiked = likedBy.includes(currentUser.userId);
        const updatedLikedBy = isLiked
          ? likedBy.filter(id => id !== currentUser.userId)
          : [...likedBy, currentUser.userId];
        const updatedPost = {
          ...post,
          likes: updatedLikedBy.length,
          likedBy: updatedLikedBy
        };

        if (db) {
          updateDoc(doc(db, "ClubPosts", postId), {
            likes: updatedPost.likes,
            likedBy: updatedPost.likedBy
          }).catch(err => console.error("Error liking post in Firestore:", err));
        }
        return updatedPost;
      }
      return post;
    }));
  };

  const toggleSaveClubPost = async (postId: string) => {
    if (!currentUser) return;
    setClubPosts(prev => prev.map(post => {
      if (post.postId === postId) {
        const savedBy = post.savedBy || [];
        const isSaved = savedBy.includes(currentUser.userId);
        const updatedSavedBy = isSaved
          ? savedBy.filter(id => id !== currentUser.userId)
          : [...savedBy, currentUser.userId];
        const updatedPost = {
          ...post,
          savedBy: updatedSavedBy
        };

        if (db) {
          updateDoc(doc(db, "ClubPosts", postId), {
            savedBy: updatedPost.savedBy
          }).catch(err => console.error("Error saving post in Firestore:", err));
        }
        return updatedPost;
      }
      return post;
    }));
  };

  const addClubPostComment = async (postId: string, commentText: string) => {
    if (!currentUser) return;
    const newComment: ClubPostComment = {
      commentId: `club_comment_${Date.now()}`,
      userId: currentUser.userId,
      userName: currentUser.name,
      role: currentUser.role,
      text: commentText,
      timestamp: new Date().toISOString()
    };

    setClubPosts(prev => prev.map(post => {
      if (post.postId === postId) {
        const commentsList = post.commentsList || [];
        const updatedComments = [...commentsList, newComment];
        const updatedPost = {
          ...post,
          comments: updatedComments.length,
          commentsList: updatedComments
        };

        if (db) {
          updateDoc(doc(db, "ClubPosts", postId), {
            comments: updatedPost.comments,
            commentsList: updatedPost.commentsList
          }).catch(err => console.error("Error commenting in Firestore:", err));
        }
        return updatedPost;
      }
      return post;
    }));
  };

  const pinClubPost = async (postId: string) => {
    if (!currentUser) return;
    setClubPosts(prev => prev.map(post => {
      if (post.clubId === currentUser.userId) {
        const isTarget = post.postId === postId;
        const updatedPost = {
          ...post,
          pinned: isTarget ? !post.pinned : false
        };
        if (db) {
          updateDoc(doc(db, "ClubPosts", post.postId), {
            pinned: updatedPost.pinned
          }).catch(err => console.error("Error pinning in Firestore:", err));
        }
        return updatedPost;
      }
      return post;
    }));
  };

  const deleteClubPost = async (postId: string) => {
    setClubPosts(prev => prev.filter(post => post.postId !== postId));

    if (currentUser) {
      const updatedUser = {
        ...currentUser,
        postsCount: Math.max(0, (currentUser.postsCount || 0) - 1)
      };
      setCurrentUser(updatedUser);
      setUsers(prev => prev.map(u => u.userId === currentUser.userId ? updatedUser : u));

      if (db) {
        try {
          await updateDoc(doc(db, "users", currentUser.userId), { postsCount: updatedUser.postsCount });
        } catch (err) {}
      }
    }
  };

  const addPlayerToSquad = async (playerId: string, contractStatus: "Signed" | "Trial" | "Released") => {
    if (!currentUser) return;
    const targetPlayer = users.find(u => u.userId === playerId);
    if (!targetPlayer) return;

    const newSquadMember: SquadMember = {
      userId: targetPlayer.userId,
      name: targetPlayer.name,
      position: targetPlayer.position || "CAM",
      age: targetPlayer.age || 18,
      aiScore: targetPlayer.rating || 75,
      contractStatus
    };

    const currentSquad = currentUser.squad || [];
    const exists = currentSquad.some(m => m.userId === playerId);
    
    const updatedSquad = exists
      ? currentSquad.map(m => m.userId === playerId ? { ...m, contractStatus } : m)
      : [...currentSquad, newSquadMember];

    const updatedUser = {
      ...currentUser,
      squad: updatedSquad,
      playersSigned: contractStatus === "Signed" && !exists ? (currentUser.playersSigned || 0) + 1 : (currentUser.playersSigned || 0)
    };

    setCurrentUser(updatedUser);
    setUsers(prev => prev.map(u => u.userId === currentUser.userId ? updatedUser : u));

    if (db) {
      updateDoc(doc(db, "users", currentUser.userId), {
        squad: updatedSquad,
        playersSigned: updatedUser.playersSigned
      }).catch(err => console.error("Error updating squad in Firestore:", err));
    }
  };

  const removeFromSquad = async (playerId: string) => {
    if (!currentUser) return;
    const currentSquad = currentUser.squad || [];
    const updatedSquad = currentSquad.filter(m => m.userId !== playerId);

    const updatedUser = {
      ...currentUser,
      squad: updatedSquad
    };

    setCurrentUser(updatedUser);
    setUsers(prev => prev.map(u => u.userId === currentUser.userId ? updatedUser : u));

    if (db) {
      updateDoc(doc(db, "users", currentUser.userId), {
        squad: updatedSquad
      }).catch(err => console.error("Error removing from squad in Firestore:", err));
    }
  };

  const addPitchReport = async (reportData: Partial<PitchReport>) => {
    if (!currentUser) return;
    const newReport: PitchReport = {
      reportId: `report_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
      userId: currentUser.userId,
      userName: currentUser.name,
      userRole: currentUser.role,
      mediaUrl: reportData.mediaUrl || "",
      mediaType: reportData.mediaType || "text",
      textContent: reportData.textContent,
      backgroundColour: reportData.backgroundColour || "pitch_green",
      audience: reportData.audience || "everyone",
      expiresAt: reportData.expiresAt || new Date(Date.now() + 24 * 3600000).toISOString(),
      createdAt: new Date().toISOString(),
      viewCount: 0,
      savedToMoments: false,
      replies: []
    };

    setPitchReports(prev => [newReport, ...prev]);

    if (db) {
      setDoc(doc(db, "PitchReports", newReport.reportId), newReport).catch(err =>
        console.error("Error writing PitchReport in Firestore:", err)
      );
    }
  };

  const replyToPitchReport = async (reportId: string, text: string, reaction?: string) => {
    if (!currentUser) return;
    const newReply = {
      replyId: `reply_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
      userId: currentUser.userId,
      userName: currentUser.name,
      text,
      reaction,
      timestamp: new Date().toISOString()
    };

    setPitchReports(prev => prev.map(report => {
      if (report.reportId === reportId) {
        const updatedReplies = [...(report.replies || []), newReply];
        return { ...report, replies: updatedReplies };
      }
      return report;
    }));

    if (db) {
      getDoc(doc(db, "PitchReports", reportId)).then(snapshot => {
        if (snapshot.exists()) {
          const data = snapshot.data();
          const replies = data.replies || [];
          replies.push(newReply);
          updateDoc(doc(db, "PitchReports", reportId), { replies }).catch(err =>
            console.error("Error adding PitchReport reply:", err)
          );
        }
      });
    }
  };

  const addCareerMoment = async (title: string, coverUrl: string, contentIds: string[]) => {
    if (!currentUser) return;
    const newMoment: CareerMoment = {
      momentId: `moment_${Date.now()}`,
      userId: currentUser.userId,
      title,
      coverUrl,
      contentIds,
      createdAt: new Date().toISOString(),
      order: careerMoments.filter(m => m.userId === currentUser.userId).length + 1
    };

    setCareerMoments(prev => [...prev, newMoment]);

    if (db) {
      setDoc(doc(db, "CareerMoments", newMoment.momentId), newMoment).catch(err =>
        console.error("Error writing CareerMoment inside Firestore:", err)
      );
    }
  };

  const saveToCareerMoments = async (contentId: string, momentId: string) => {
    setCareerMoments(prev => prev.map(m => {
      if (m.momentId === momentId) {
        const updatedIds = m.contentIds.includes(contentId) ? m.contentIds : [...m.contentIds, contentId];
        return { ...m, contentIds: updatedIds };
      }
      return m;
    }));

    if (db) {
      getDoc(doc(db, "CareerMoments", momentId)).then(snap => {
        if (snap.exists()) {
          const ids = snap.data().contentIds || [];
          if (!ids.includes(contentId)) {
            ids.push(contentId);
            updateDoc(doc(db, "CareerMoments", momentId), { contentIds: ids });
          }
        }
      });
    }
  };

  const updateCareerMoment = async (momentId: string, updates: Partial<CareerMoment>) => {
    setCareerMoments(prev => prev.map(m => m.momentId === momentId ? { ...m, ...updates } : m));
    if (db) {
      updateDoc(doc(db, "CareerMoments", momentId), updates).catch(err =>
        console.error("Error updating CareerMoment:", err)
      );
    }
  };

  const deleteCareerMoment = async (momentId: string) => {
    setCareerMoments(prev => prev.filter(m => m.momentId !== momentId));
    if (db) {
      // simulated or firesore delete
    }
  };

  const createLiveSession = async (title: string, audience: "public" | "scouts" | "mysquad", postType?: "matchday" | "training") => {
    if (!currentUser) return "";
    const newSession: LiveSession = {
      sessionId: `live_${Date.now()}`,
      hostId: currentUser.userId,
      hostName: currentUser.name,
      hostRole: currentUser.role,
      title,
      audience,
      startedAt: new Date().toISOString(),
      viewerCount: Math.floor(Math.random() * 50) + 12,
      comments: [
        {
          commentId: "comment_init",
          userId: "system",
          userName: "System",
          text: `Welcome to the Live Trial! Stream is starting now...`,
          timestamp: new Date().toISOString()
        }
      ],
      taggedPlayers: [],
      postType
    };

    setLiveSessions(prev => [newSession, ...prev]);

    if (db) {
      setDoc(doc(db, "LiveSessions", newSession.sessionId), newSession).catch(err =>
        console.error("Error starting live session in Firestore:", err)
      );
    }
    return newSession.sessionId;
  };

  const endLiveSession = async (sessionId: string, saveReplay: boolean) => {
    setLiveSessions(prev => prev.map(s => {
      if (s.sessionId === sessionId) {
        return {
          ...s,
          endedAt: new Date().toISOString(),
          replayUrl: saveReplay ? "https://images.unsplash.com/photo-1508098682722-e99c43a406b2?w=800" : undefined
        };
      }
      return s;
    }));

    if (saveReplay) {
      const activeSession = liveSessions.find(s => s.sessionId === sessionId);
      if (activeSession && currentUser) {
        // Add replay to profile as dummy PostHighlight
        const replayPost: PostHighlight = {
          postId: `post_replay_${Date.now()}`,
          userId: currentUser.userId,
          playerName: currentUser.name,
          position: currentUser.role === "player" ? (currentUser.position || "CAM") : "COACH",
          club: currentUser.role === "player" ? (currentUser.club || "Unattached") : (currentUser.clubName || "Management"),
          province: currentUser.province,
          videoUrl: "https://www.w3schools.com/html/mov_bbb.mp4",
          thumbnailUrl: "https://images.unsplash.com/photo-1508098682722-e99c43a406b2?w=800",
          caption: `🎥 TRIAL STREAM REPLAY: ${activeSession.title}`,
          tags: [],
          contentType: "match",
          votes: 12,
          views: activeSession.viewerCount + 20,
          commentsCount: 0,
          timestamp: new Date().toISOString(),
          postFormat: "clip",
          isArchived: false
        };
        setPosts(prev => [replayPost, ...prev]);
        if (db) {
          setDoc(doc(db, "posts", replayPost.postId), replayPost).catch(err => console.error(err));
        }
      }
    }

    if (db) {
      updateDoc(doc(db, "LiveSessions", sessionId), {
        endedAt: new Date().toISOString(),
        replayUrl: saveReplay ? "https://images.unsplash.com/photo-1508098682722-e99c43a406b2?w=800" : null
      }).catch(err => console.error("Error ending LiveSession in Firestore:", err));
    }
  };

  const addLiveComment = async (sessionId: string, text: string) => {
    if (!currentUser) return;
    const newComment = {
      commentId: `live_comment_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
      userId: currentUser.userId,
      userName: currentUser.name,
      text,
      timestamp: new Date().toISOString()
    };

    setLiveSessions(prev => prev.map(s => {
      if (s.sessionId === sessionId) {
        return { ...s, comments: [...(s.comments || []), newComment] };
      }
      return s;
    }));
  };

  const pinLiveComment = async (sessionId: string, commentId: string) => {
    setLiveSessions(prev => prev.map(s => {
      if (s.sessionId === sessionId) {
        const comments = (s.comments || []).map(c => 
          c.commentId === commentId ? { ...c, pinned: true } : { ...c, pinned: false }
        );
        return { ...s, comments };
      }
      return s;
    }));
  };

  const tagPlayerLive = async (sessionId: string, playerId: string, playerName: string) => {
    const newTag = {
      userId: playerId,
      name: playerName,
      timestamp: new Date().toISOString()
    };
    setLiveSessions(prev => prev.map(s => {
      if (s.sessionId === sessionId) {
        return { ...s, taggedPlayers: [...(s.taggedPlayers || []), newTag] };
      }
      return s;
    }));
    await addSystemNotification(playerId, `You were tagged in a Live Stream! 📡🎥`);
  };

  const toggleMySquad = async (userId: string) => {
    if (!currentUser) return;
    const squadList = currentUser.mySquad || [];
    const updatedSquad = squadList.includes(userId)
      ? squadList.filter(id => id !== userId)
      : [...squadList, userId];

    const updatedUser = { ...currentUser, mySquad: updatedSquad };
    setCurrentUser(updatedUser);
    setUsers(prev => prev.map(u => u.userId === currentUser.userId ? updatedUser : u));

    if (db) {
      updateDoc(doc(db, "users", currentUser.userId), { mySquad: updatedSquad }).catch(err => 
        console.error("Error setting mySquad list:", err)
      );
    }
  };

  const archivePost = async (postId: string) => {
    setPosts(prev => prev.map(p => p.postId === postId ? { ...p, isArchived: true } : p));
    if (db) {
      updateDoc(doc(db, "posts", postId), { isArchived: true }).catch(err => console.error(err));
    }
  };

  const restorePost = async (postId: string) => {
    setPosts(prev => prev.map(p => p.postId === postId ? { ...p, isArchived: false } : p));
    if (db) {
      updateDoc(doc(db, "posts", postId), { isArchived: false }).catch(err => console.error(err));
    }
  };

  const deletePostPermanently = async (postId: string) => {
    setPosts(prev => prev.filter(p => p.postId !== postId));
  };

  const addChallengePost = async (title: string, description: string, hashtag: string, mediaUrl?: string, deadline?: string) => {
    if (!currentUser) return;
    const newChallenge: ChallengePost = {
      challengeId: `challenge_${Date.now()}`,
      creatorId: currentUser.userId,
      creatorName: currentUser.name,
      creatorRole: currentUser.tier === "professional" ? (currentUser.scoutRole || "Professional Scout") : "Football Content Creator",
      title,
      description,
      hashtag,
      mediaUrl: mediaUrl || "",
      deadline: deadline || new Date(Date.now() + 7 * 24 * 3600000).toISOString(),
      responseCount: 0,
      createdAt: new Date().toISOString()
    };
    setChallengePosts(prev => [newChallenge, ...prev]);
    
    // Add system notifications to all players
    users.forEach(u => {
      if (u.role === "player") {
        addSystemNotification(u.userId, `🔥 New Challenge Posted by ${currentUser.name}: "${title}"! Tap to respond.`);
      }
    });

    if (db) {
      setDoc(doc(db, "ChallengePosts", newChallenge.challengeId), newChallenge).catch(err => console.error(err));
    }
  };

  const submitChallengeResponse = async (challengeId: string, caption: string, mediaUrl: string) => {
    if (!currentUser) return;
    const newResponse: ChallengeResponse = {
      responseId: `resp_${Date.now()}`,
      challengeId,
      playerId: currentUser.userId,
      playerName: currentUser.name,
      playerAvatarEmoji: "⚽",
      mediaUrl: mediaUrl || "https://assets.mixkit.co/videos/preview/mixkit-player-kicking-a-soccer-ball-in-the-grass-32860-large.mp4",
      caption,
      votes: 0,
      createdAt: new Date().toISOString()
    };
    setChallengeResponses(prev => [newResponse, ...prev]);

    // Update challenge post count
    setChallengePosts(prev => prev.map(c => {
      if (c.challengeId === challengeId) {
        addSystemNotification(c.creatorId, `📣 ${currentUser.name} responded to your challenge: "${c.title}"`);
        return { ...c, responseCount: c.responseCount + 1 };
      }
      return c;
    }));

    // Trigger trending response alert simulated
    setTimeout(() => {
      addSystemNotification(currentUser.userId, `Your challenge response is trending in the Radar. 12 scouts have seen it in the last 24 hours. ◆`);
    }, 3000);

    if (db) {
      setDoc(doc(db, "ChallengeResponses", newResponse.responseId), newResponse).catch(err => console.error(err));
    }
  };

  const createSpotlightPost = async (featuredPlayerId: string, endorsementText: string, reactionVideoUrl?: string) => {
    if (!currentUser) return;

    // Spotlight limit check
    const isProfessional = currentUser.tier === "professional";
    const limit = isProfessional ? 5 : 3;
    const currentSpotlightsThisWeek = currentUser.spotlightPostsThisWeek || 0;

    if (currentSpotlightsThisWeek >= limit) {
      alert(`Limit reached! Verified ${isProfessional ? "Professionals" : "Community Builders"} can only post ${limit} Spotlight Posts per week to keep spotlights meaningful and rare.`);
      return;
    }

    const targetPlayer = users.find(u => u.userId === featuredPlayerId);
    if (!targetPlayer) return;

    const newSpotlight: SpotlightPost = {
      spotlightId: `spot_${Date.now()}`,
      creatorId: currentUser.userId,
      creatorName: currentUser.name,
      creatorRole: isProfessional ? (currentUser.scoutRole || "Professional Scout") : "Football Content Creator",
      featuredPlayerId,
      featuredPlayerName: targetPlayer.name,
      endorsementText,
      reactionVideoUrl,
      createdAt: new Date().toISOString(),
      viewCount: 1,
      boostExpiresAt: new Date(Date.now() + 72 * 3600000).toISOString() // 72-hour Radar boost
    };

    setSpotlightPosts(prev => [newSpotlight, ...prev]);

    // Update creator's spotlights count
    const updatedUser = {
      ...currentUser,
      spotlightPostsThisWeek: currentSpotlightsThisWeek + 1
    };
    setCurrentUser(updatedUser);
    setUsers(prev => prev.map(u => u.userId === currentUser.userId ? updatedUser : u));

    // Apply Radar boost and spotlighted badge on targeted Player
    setUsers(prev => prev.map(u => {
      if (u.userId === featuredPlayerId) {
        const curSpotlightedBy = u.spotlightedBy || [];
        const expires7days = new Date(Date.now() + 7 * 24 * 3600000).toISOString();
        return {
          ...u,
          spotlightedBy: [
            ...curSpotlightedBy.filter(s => s.creatorId !== currentUser.userId),
            { creatorId: currentUser.userId, creatorName: currentUser.name, expiresAt: expires7days }
          ]
        };
      }
      return u;
    }));

    // Notify player
    addSystemNotification(
      featuredPlayerId,
      `🌟 ${currentUser.name} spotlighted you to their ${currentUser.followersCount || 1200} followers. Check your profile views. ◆`
    );

    if (db) {
      setDoc(doc(db, "SpotlightPosts", newSpotlight.spotlightId), newSpotlight).catch(err => console.error(err));
      updateDoc(doc(db, "users", currentUser.userId), { spotlightPostsThisWeek: updatedUser.spotlightPostsThisWeek }).catch(err => console.error(err));
    }
  };

  const submitVerificationApplication = async (applicationData: { role: string; organisation: string; socialLinks: string; description: string; reason: string; supportingLink?: string }) => {
    if (!currentUser) return;
    const newApp: VerificationApplication = {
      applicationId: `app_${Date.now()}`,
      userId: currentUser.userId,
      name: currentUser.name,
      email: currentUser.email,
      role: applicationData.role,
      organisation: applicationData.organisation,
      socialLinks: applicationData.socialLinks,
      description: applicationData.description,
      reason: applicationData.reason,
      supportingLink: applicationData.supportingLink || "",
      status: "pending",
      submittedAt: new Date().toISOString()
    };

    setVerificationApplications(prev => [newApp, ...prev]);

    if (db) {
      setDoc(doc(db, "VerificationApplications", newApp.applicationId), newApp).catch(err => console.error(err));
    }
  };

  const reviewVerification = async (applicationId: string, status: "approved" | "rejected") => {
    setVerificationApplications(prev => prev.map(app => {
      if (app.applicationId === applicationId) {
        const reviewedApp = { ...app, status, reviewedAt: new Date().toISOString() };
        
        if (status === "approved") {
          setUsers(prevUsers => prevUsers.map(u => {
            if (u.userId === app.userId) {
              const roleIsScoutClub = u.role === "scout" || u.role === "club";
              const updatedU: UserProfile = {
                ...u,
                tier: roleIsScoutClub ? "professional" : "community",
                verifiedStatus: true,
                verifiedBadgeType: roleIsScoutClub ? "professional" : "community",
                verificationApprovedAt: new Date().toISOString(),
                scoutStampsAvailable: roleIsScoutClub ? 5 : undefined,
                scoutStampsGiven: roleIsScoutClub ? [] : undefined,
                spotlightPostsThisWeek: 0
              };
              
              if (currentUser && currentUser.userId === app.userId) {
                setTimeout(() => setCurrentUser(updatedU), 50);
              }

              addSystemNotification(app.userId, `You are now a Verified ${roleIsScoutClub ? "Football Professional" : "Community Builder"} on ScoutMe ◆ — use your platform to amplify grassroots talent`);

              if (db) {
                updateDoc(doc(db, "users", app.userId), {
                  tier: updatedU.tier,
                  verifiedStatus: true,
                  verifiedBadgeType: updatedU.verifiedBadgeType,
                  verificationApprovedAt: updatedU.verificationApprovedAt,
                  scoutStampsAvailable: updatedU.scoutStampsAvailable,
                  scoutStampsGiven: updatedU.scoutStampsGiven,
                  spotlightPostsThisWeek: 0
                }).catch(err => console.error(err));
              }

              return updatedU;
            }
            return u;
          }));
        }

        if (db) {
          updateDoc(doc(db, "VerificationApplications", applicationId), { status, reviewedAt: reviewedApp.reviewedAt }).catch(err => console.error(err));
        }

        return reviewedApp;
      }
      return app;
    }));
  };

  const awardScoutStamp = async (playerId: string) => {
    if (!currentUser || currentUser.tier !== "professional") {
      alert("Only verified Football Professionals can award Scout Stamps!");
      return;
    }

    const stampsAvailable = currentUser.scoutStampsAvailable ?? 5;
    if (stampsAvailable <= 0) {
      alert("No Scout Stamps left for this month! Scouts are strictly limited to 5 high-credibility stamps per month to avoid inflation.");
      return;
    }

    const player = users.find(u => u.userId === playerId);
    if (!player) return;

    const newStamp: ScoutStamp = {
      stampId: `stamp_${Date.now()}`,
      scoutId: currentUser.userId,
      scoutName: currentUser.name,
      scoutOrganisation: currentUser.organisation || "Stars of Africa",
      playerId,
      playerName: player.name,
      awardedAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 30 * 24 * 3600000).toISOString(),
      boostActive: true
    };

    setScoutStamps(prev => [newStamp, ...prev]);

    const updatedScoutStampsGiven = [...(currentUser.scoutStampsGiven || []), { playerId, timestamp: new Date().toISOString() }];
    const updatedCurrentUser = {
      ...currentUser,
      scoutStampsAvailable: stampsAvailable - 1,
      scoutStampsGiven: updatedScoutStampsGiven
    };
    setCurrentUser(updatedCurrentUser);
    setUsers(prev => prev.map(u => u.userId === currentUser.userId ? updatedCurrentUser : u));

    setUsers(prev => prev.map(u => {
      if (u.userId === playerId) {
        return {
          ...u,
          endorsed: true
        };
      }
      return u;
    }));

    addSystemNotification(
      playerId,
      `◆ ${currentUser.name} from ${currentUser.organisation || "SA-Scouts"} just awarded you a Scout Stamp. Your profile is now boosted for 30 days. Keep posting. 🏆`
    );

    if (db) {
      setDoc(doc(db, "ScoutStamps", newStamp.stampId), newStamp).catch(err => console.error(err));
      updateDoc(doc(db, "users", currentUser.userId), {
        scoutStampsAvailable: updatedCurrentUser.scoutStampsAvailable,
        scoutStampsGiven: updatedCurrentUser.scoutStampsGiven
      }).catch(err => console.error(err));
    }
  };

  const addClinicUpload = async (contextLabel: string, taggedPlayerIds: string[], mediaUrl: string) => {
    if (!currentUser || currentUser.tier !== "professional") {
      alert("Only verified professionals can upload clinics and tag players.");
      return;
    }

    const updatedUser = {
      ...currentUser,
      clinicUploadsCount: (currentUser.clinicUploadsCount || 0) + 1
    };
    setCurrentUser(updatedUser);
    setUsers(prev => prev.map(u => u.userId === currentUser.userId ? updatedUser : u));

    taggedPlayerIds.forEach(playerId => {
      addSystemNotification(
        playerId,
        `${currentUser!.name} tagged you in a clinic session at ${contextLabel}. A Clinic Appearance badge has been added to your profile and your radar is boosted ◆`
      );
    });

    const newClinicPost: ClubPost = {
      postId: `clinic_post_${Date.now()}`,
      clubId: currentUser.userId,
      postType: "community",
      mediaUrl: mediaUrl || "https://images.unsplash.com/photo-1508098682722-e99c43a406b2?w=800&auto=format&fit=cover&q=60",
      mediaType: "image",
      caption: `⚽ CLINIC WORKSHOP: Successfully completed the "${contextLabel}" development session! Outstanding talent witnessed on eKasi pitches. Tagged players have received validated profile boosts. ◆`,
      tags: taggedPlayerIds,
      likes: 0,
      comments: 0,
      timestamp: new Date().toISOString(),
      pinned: false,
      likedBy: [],
      savedBy: [],
      commentsList: []
    };

    setClubPosts(prev => [newClinicPost, ...prev]);

    if (db) {
      setDoc(doc(db, "ClubPosts", newClinicPost.postId), newClinicPost).catch(err => console.error(err));
      updateDoc(doc(db, "users", currentUser.userId), { clinicUploadsCount: updatedUser.clinicUploadsCount }).catch(err => console.error(err));
    }
  };

  const voteChallengeResponse = async (responseId: string) => {
    setChallengeResponses(prev => prev.map(resp => {
      if (resp.responseId === responseId) {
        return {
          ...resp,
          votes: resp.votes + 1
        };
      }
      return resp;
    }));
  };

  const upgradeUserTier = async (tier: string) => {
    if (!currentUser) return;
    const updatedUser = {
      ...currentUser,
      tier
    };
    setCurrentUser(updatedUser);
    setUsers(prev => prev.map(u => u.userId === currentUser.userId ? updatedUser : u));
    
    // Save to local storage
    localStorage.setItem("scoutme_current_user", JSON.stringify(updatedUser));

    if (db) {
      const { doc, updateDoc } = await import("firebase/firestore");
      updateDoc(doc(db, "users", currentUser.userId), { tier }).catch(err => console.error(err));
    }
    
    addSystemNotification(
      currentUser.userId,
      `🎉 Congratulations! You have successfully upgraded to ${tier === "player_pro" ? "Player Pro" : "Scout Pro"}! Premium features are now unlocked. ◆`
    );
  };

  const createPost = async (data: {
    videoUrl: string;
    thumbnailUrl?: string;
    caption: string;
    tags: string[];
    contentType: string;
    position: string;
    league?: string;
    province: string;
    visibility?: string;
    featuredPlayerId?: string;
    featuredPlayerName?: string;
    submissionType?: "weekly_challenge" | "club_trial" | "both";
    clubTrialClubName?: string;
  }) => {
    if (!currentUser) return;
    if (currentUser.role !== "player" && currentUser.role !== "platform") return;
    const isOfficial = currentUser.role === "platform";
    const newPost: PostHighlight = {
      postId: `post_${Date.now()}`,
      userId: currentUser.userId,
      playerName: isOfficial ? "ScoutMe Official" : currentUser.name,
      position: data.position || currentUser.position || "—",
      club: data.league || currentUser.club || "ScoutMe Platform",
      province: data.province || currentUser.province,
      videoUrl: data.videoUrl,
      thumbnailUrl: data.thumbnailUrl || (isOfficial ? "◆ Official Post" : "⚽ Match Highlight"),
      caption: data.caption,
      tags: data.tags,
      contentType: (data.contentType || "highlight") as any,
      votes: 0,
      views: 0,
      commentsCount: 0,
      timestamp: "Just now",
      trending: false,
      isArchived: false,
      isOfficialPost: isOfficial,
      country: "South Africa",
      comments: [],
      ...(data.submissionType && { submissionType: data.submissionType }),
      ...(data.clubTrialClubName && { clubTrialClubName: data.clubTrialClubName }),
    };

    setPosts(prev => [newPost, ...prev]);

    if (!isDemoMode && db) {
      try {
        const docRef = await addDoc(collection(db, "posts"), {
          ...newPost,
          createdAt: serverTimestamp(),
        });
        setPosts(prev => prev.map(p => p.postId === newPost.postId ? { ...p, postId: docRef.id } : p));
      } catch (e) {
        console.warn("[Firestore] Post write failed:", e);
      }
    }

    triggerGlobalToast(isOfficial ? "Official post is live ◆" : "Your pitch is live. Scouts can find you now. ✦", "success");

    // POTW notification
    if (data.contentType === "player_of_week" && data.featuredPlayerId) {
      const until = new Date(Date.now() + 7 * 24 * 3600000).toISOString();
      setUsers(prev => prev.map(u =>
        u.userId === data.featuredPlayerId ? { ...u, potwUntil: until } : u
      ));
      if (db) {
        updateDoc(doc(db, "users", data.featuredPlayerId), { potwUntil: until }).catch(() => {});
      }
      addSystemNotification(
        data.featuredPlayerId,
        `🏆 You are ScoutMe's Player of the Week! Your profile is now featured to all scouts.`
      );
    }

    // Weekly Challenge notification — notify all players
    if (data.contentType === "trial_challenge" && isOfficial) {
      const drillName = data.caption.match(/\[(.+?)\]/)?.[1] || "Virtual Trial";
      users.filter(u => u.role === "player").forEach(u => {
        addSystemNotification(
          u.userId,
          `⚡ This week's challenge is live! Complete the ${drillName} challenge for a chance to win Player of the Week 🏆`
        );
      });
    }
  };

  const applyToTrialEvent = async (trialEventId: string, result: { drillName: string; score: number }) => {
    if (!currentUser) return;
    const event = trialEvents.find(e => e.trialEventId === trialEventId);
    if (!event) return;
    const application: TrialEventApplication = {
      applicationId: `app_${Date.now()}`,
      trialEventId,
      clubId: event.clubId,
      clubName: event.clubName,
      playerId: currentUser.userId,
      playerName: currentUser.name,
      playerPosition: currentUser.position,
      drillName: result.drillName,
      score: result.score,
      submittedAt: new Date().toISOString(),
    };
    setTrialEventApplications(prev => [...prev, application]);
    addSystemNotification(currentUser.userId, `🔭 Your trial application was sent to ${event.clubName}. They will review your ${result.drillName} result.`);
  };

  const checkAutoPost = async () => {
    if (!currentUser || currentUser.role !== "platform" || !db) return;
    try {
      const configRef = doc(db, "platformConfig", "autoPost");
      const configSnap = await getDoc(configRef);
      const config = configSnap.exists() ? configSnap.data() : {};

      const now = new Date();
      const dayOfWeek = now.getDay(); // 0=Sun, 1=Mon, 5=Fri

      // Monday Player of the Week
      if (dayOfWeek === 1) {
        const lastPotw = config.lastPlayerOfWeekPost ? new Date(config.lastPlayerOfWeekPost) : null;
        const daysSincePotw = lastPotw ? (Date.now() - lastPotw.getTime()) / 86400000 : 999;
        if (daysSincePotw > 6) {
          const weekAgo = new Date(Date.now() - 7 * 86400000).toISOString();
          const postsSnap = await import("firebase/firestore").then(({ query, where, getDocs, orderBy: ob, limit: lim }) =>
            getDocs(query(collection(db, "posts"), where("createdAt", ">=", weekAgo), ob("votes", "desc"), lim(1)))
          );
          if (!postsSnap.empty) {
            const top = postsSnap.docs[0].data();
            await createPost({
              videoUrl: top.videoUrl || "",
              caption: `🏆 PLAYER OF THE WEEK — ${top.playerName} with ${top.votes || 0} votes this week! Outstanding talent from ${top.province}. Scouts take note. 🇿🇦⚽`,
              tags: ["ScoutMe", "PlayerOfTheWeek", "KasiFootball"],
              contentType: "player_of_week",
              position: top.position || "—",
              province: top.province || "South Africa",
              featuredPlayerId: top.userId,
              featuredPlayerName: top.playerName,
            });
            await setDoc(configRef, { ...config, lastPlayerOfWeekPost: now.toISOString() }, { merge: true });
          }
        }
      }

      // Friday Trending
      if (dayOfWeek === 5) {
        const lastTrend = config.lastTrendingPost ? new Date(config.lastTrendingPost) : null;
        const daysSinceTrend = lastTrend ? (Date.now() - lastTrend.getTime()) / 86400000 : 999;
        if (daysSinceTrend > 6) {
          await createPost({
            videoUrl: "",
            caption: `🔥 TRENDING THIS WEEK — South African grassroots talent is on the rise. Check the feed for this week's top highlights. 🇿🇦⚽ #ScoutMe #KasiFootball`,
            tags: ["ScoutMe", "TrendingThisWeek"],
            contentType: "platform_update",
            position: "—",
            province: "South Africa",
          });
          await setDoc(configRef, { ...config, lastTrendingPost: now.toISOString() }, { merge: true });
        }
      }
    } catch (e) {
      console.warn("[AutoPost] checkAutoPost failed:", e);
    }
  };

  const addVirtualTrialResult = async (playerId: string, result: any) => {
    setUsers(prev => prev.map(u => {
      if (u.userId === playerId) {
        const updated = {
          ...u,
          virtualTrial: result
        };
        if (currentUser && currentUser.userId === playerId) {
          setCurrentUser(updated);
          localStorage.setItem("scoutme_current_user", JSON.stringify(updated));
        }
        return updated;
      }
      return u;
    }));

    if (db) {
      try {
        const { doc, updateDoc } = await import("firebase/firestore");
        await updateDoc(doc(db, "users", playerId), { virtualTrial: result });
      } catch (err) {
        console.error("Failed to save virtual trial in Firestore:", err);
      }
    }

    addSystemNotification(
      playerId,
      `⚡ Virtual Trial completed: ${result.drillName} with a score of ${result.score}/100! Your results are now active and visible on your profile.`
    );
  };

  return (
    <AppContext.Provider
      value={{
        isDemoMode,
        currentUser,
        users,
        posts,
        postsLoading,
        createPost,
        scoutReports,
        news,
        shortlist,
        onboardingStep,
        selectedOnboardingRole,
        loading,
        error,
        offlineMode,
        ratings,
        setOfflineMode,
        setOnboardingStep,
        setSelectedOnboardingRole,
        signUpUser,
        signInUser,
        signOutUser,
        updateBio,
        updateAvatar,
        resendVerificationEmail,
        signDigitalAgreement,
        votePost,
        addComment,
        toggleShortlist,
        generateReport,
        addNewPost,
        submitRating,
        awardTalentBadge,
        toggleFollow,
        clubPosts,
        notifications,
        addSystemNotification,
        addClubPost,
        toggleLikeClubPost,
        toggleSaveClubPost,
        addClubPostComment,
        pinClubPost,
        deleteClubPost,
        addPlayerToSquad,
        removeFromSquad,
        pitchReports,
        careerMoments,
        liveSessions,
        addPitchReport,
        replyToPitchReport,
        addCareerMoment,
        saveToCareerMoments,
        updateCareerMoment,
        deleteCareerMoment,
        createLiveSession,
        endLiveSession,
        addLiveComment,
        pinLiveComment,
        tagPlayerLive,
        toggleMySquad,
        archivePost,
        restorePost,
        deletePostPermanently,
        challengePosts,
        challengeResponses,
        spotlightPosts,
        verificationApplications,
        scoutStamps,
        addChallengePost,
        submitChallengeResponse,
        createSpotlightPost,
        submitVerificationApplication,
        reviewVerification,
        awardScoutStamp,
        addClinicUpload,
        voteChallengeResponse,
        upgradeUserTier,
        addVirtualTrialResult,
        checkAutoPost,
        trialEvents,
        trialEventApplications,
        applyToTrialEvent,
        markNotificationRead,
        markAllNotificationsRead,
        unreadNotificationsCount,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error("useApp must be used inside an AppProvider");
  }
  return context;
};
