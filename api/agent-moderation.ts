
// --- inlined from _agent-utils (Vercel does not bundle local relative imports) ---
const FIREBASE_API_KEY = process.env.FIREBASE_API_KEY || process.env.VITE_FIREBASE_API_KEY || "";
const FIREBASE_PROJECT_ID = "scoutme-10";
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
// --- end inlined utils ---

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
