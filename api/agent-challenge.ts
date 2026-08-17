
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
