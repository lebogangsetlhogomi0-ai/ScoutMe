
// --- inlined from _agent-utils (Vercel does not bundle local relative imports) ---
const FIREBASE_API_KEY = process.env.FIREBASE_API_KEY || "";
const FIREBASE_PROJECT_ID = "scoutme-10";
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || "";
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
