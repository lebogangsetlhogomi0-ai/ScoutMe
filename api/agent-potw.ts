
// --- inlined from _agent-utils (Vercel does not bundle local relative imports) ---
const FIREBASE_API_KEY = process.env.FIREBASE_API_KEY || process.env.VITE_FIREBASE_API_KEY || "";
const FIREBASE_PROJECT_ID = "scoutme-10";
const GEMINI_API_KEY = process.env.VITE_GEMINI_API_KEY || process.env.GEMINI_API_KEY || "";
const PLATFORM_EMAIL = process.env.PLATFORM_AGENT_EMAIL || "";
const PLATFORM_PASSWORD = process.env.PLATFORM_AGENT_PASSWORD || "";
const FIRESTORE_BASE = `https://firestore.googleapis.com/v1/projects/${FIREBASE_PROJECT_ID}/databases/(default)/documents`;

async function getPlatformToken(): Promise<string> {
  const res = await fetch(
    `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${FIREBASE_API_KEY}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: PLATFORM_EMAIL, password: PLATFORM_PASSWORD, returnSecureToken: true }),
    }
  );
  const data = await res.json();
  if (!data.idToken) throw new Error(`Auth failed: ${JSON.stringify(data)}`);
  return data.idToken;
}

function objToFields(obj: any): any {
  const fields: any = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v === null || v === undefined) continue;
    if (typeof v === "string") fields[k] = { stringValue: v };
    else if (typeof v === "boolean") fields[k] = { booleanValue: v };
    else if (typeof v === "number") {
      fields[k] = Number.isInteger(v) ? { integerValue: String(v) } : { doubleValue: v };
    } else if (Array.isArray(v)) {
      fields[k] = {
        arrayValue: {
          values: (v as any[]).map(item =>
            typeof item === "string" ? { stringValue: item } : { integerValue: String(item) }
          ),
        },
      };
    } else if (typeof v === "object") {
      fields[k] = { mapValue: { fields: objToFields(v) } };
    }
  }
  return fields;
}

function fieldsToObj(fields: any): any {
  const obj: any = {};
  for (const [k, v] of Object.entries(fields) as any[]) {
    if (v.stringValue !== undefined) obj[k] = v.stringValue;
    else if (v.integerValue !== undefined) obj[k] = parseInt(v.integerValue);
    else if (v.doubleValue !== undefined) obj[k] = v.doubleValue;
    else if (v.booleanValue !== undefined) obj[k] = v.booleanValue;
    else if (v.arrayValue) obj[k] = (v.arrayValue.values || []).map((i: any) => i.stringValue ?? parseInt(i.integerValue ?? "0"));
    else if (v.mapValue) obj[k] = fieldsToObj(v.mapValue.fields || {});
  }
  return obj;
}

async function firestoreQuery(collectionId: string, token: string, filters?: { field: string; value: string | number | boolean }[]): Promise<any[]> {
  const whereClause = filters && filters.length > 0
    ? filters.length === 1
      ? {
          fieldFilter: {
            field: { fieldPath: filters[0].field },
            op: "EQUAL",
            value: typeof filters[0].value === "string"
              ? { stringValue: filters[0].value }
              : typeof filters[0].value === "boolean"
              ? { booleanValue: filters[0].value }
              : { integerValue: String(filters[0].value) },
          },
        }
      : {
          compositeFilter: {
            op: "AND",
            filters: filters.map(f => ({
              fieldFilter: {
                field: { fieldPath: f.field },
                op: "EQUAL",
                value: typeof f.value === "string"
                  ? { stringValue: f.value }
                  : typeof f.value === "boolean"
                  ? { booleanValue: f.value }
                  : { integerValue: String(f.value) },
              },
            })),
          },
        }
    : undefined;

  const body: any = { structuredQuery: { from: [{ collectionId }] } };
  if (whereClause) body.structuredQuery.where = whereClause;

  const res = await fetch(`${FIRESTORE_BASE}:runQuery`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const rows = await res.json();
  if (!Array.isArray(rows)) return [];
  return rows
    .filter((r: any) => r.document)
    .map((r: any) => ({
      _id: r.document.name?.split("/").pop(),
      ...fieldsToObj(r.document.fields || {}),
    }));
}

async function firestoreAdd(collectionId: string, data: any, token: string): Promise<string> {
  const res = await fetch(`${FIRESTORE_BASE}/${collectionId}`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ fields: objToFields(data) }),
  });
  const json = await res.json();
  return json.name?.split("/").pop() || "";
}

async function firestorePatch(collectionId: string, docId: string, data: any, token: string): Promise<void> {
  const updateMask = Object.keys(data).map(k => `updateMask.fieldPaths=${encodeURIComponent(k)}`).join("&");
  await fetch(`${FIRESTORE_BASE}/${collectionId}/${docId}?${updateMask}`, {
    method: "PATCH",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ fields: objToFields(data) }),
  });
}

async function callGemini(prompt: string): Promise<string> {
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { maxOutputTokens: 280, temperature: 0.85 },
      }),
    }
  );
  const data = await res.json();
  return data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || "";
}
// --- end inlined utils ---

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
