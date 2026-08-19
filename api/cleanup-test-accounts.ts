/**
 * Deletes all @example.com test accounts from Firebase Auth AND Firestore.
 * Requires FIREBASE_SERVICE_ACCOUNT_KEY env var (JSON string from Firebase console).
 * Secured by CRON_SECRET.
 */

import { initializeApp, getApps, cert, App } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";

const FIREBASE_API_KEY    = process.env.FIREBASE_API_KEY    || "";
const FIREBASE_PROJECT_ID = "scoutme-10";
const PLATFORM_EMAIL      = process.env.PLATFORM_AGENT_EMAIL    || "";
const PLATFORM_PASSWORD   = process.env.PLATFORM_AGENT_PASSWORD || "";
const FIRESTORE_BASE      = `https://firestore.googleapis.com/v1/projects/${FIREBASE_PROJECT_ID}/databases/(default)/documents`;

// ── Firebase Admin init (for Auth deletion) ────────────────────────────────
function getAdminApp(): App {
  if (getApps().length > 0) return getApps()[0]!;
  const serviceAccountRaw = process.env.FIREBASE_SERVICE_ACCOUNT_KEY || "";
  if (!serviceAccountRaw) throw new Error("FIREBASE_SERVICE_ACCOUNT_KEY not set");
  const serviceAccount = JSON.parse(serviceAccountRaw);
  return initializeApp({ credential: cert(serviceAccount) });
}

// ── REST helpers (for Firestore reads/deletes using platform agent token) ──
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

async function deleteFirestoreDoc(path: string, token: string): Promise<void> {
  await fetch(
    `https://firestore.googleapis.com/v1/projects/${FIREBASE_PROJECT_ID}/databases/(default)/documents/${path}`,
    { method: "DELETE", headers: { Authorization: `Bearer ${token}` } }
  );
}

async function listFirestoreUsers(token: string): Promise<Array<{ id: string; email: string }>> {
  const users: Array<{ id: string; email: string }> = [];
  let pageToken: string | undefined;
  do {
    const url = `${FIRESTORE_BASE}/users?pageSize=300${pageToken ? `&pageToken=${pageToken}` : ""}`;
    const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
    const data = await res.json();
    for (const doc of data.documents || []) {
      const email = doc.fields?.email?.stringValue || "";
      const id = doc.name.split("/").pop();
      if (email) users.push({ id, email });
    }
    pageToken = data.nextPageToken;
  } while (pageToken);
  return users;
}

async function listFirestorePosts(token: string): Promise<Array<{ id: string; userId: string }>> {
  const posts: Array<{ id: string; userId: string }> = [];
  let pageToken: string | undefined;
  do {
    const url = `${FIRESTORE_BASE}/posts?pageSize=300${pageToken ? `&pageToken=${pageToken}` : ""}`;
    const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
    const data = await res.json();
    for (const doc of data.documents || []) {
      const userId = doc.fields?.userId?.stringValue || "";
      const id = doc.name.split("/").pop();
      if (userId) posts.push({ id, userId });
    }
    pageToken = data.nextPageToken;
  } while (pageToken);
  return posts;
}

export const config = { maxDuration: 60 };

export default async function handler(req: any, res: any) {
  try {
  // Auth check
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret) {
    const authHeader = req.headers["authorization"] || req.headers["x-cron-secret"] || "";
    const provided = authHeader.replace(/^Bearer\s+/i, "");
    if (provided !== cronSecret) {
      return res.status(401).json({ error: "Unauthorized" });
    }
  }

  // Guard: FIREBASE_SERVICE_ACCOUNT_KEY must be set
  if (!process.env.FIREBASE_SERVICE_ACCOUNT_KEY) {
    console.error("cleanup-test-accounts: FIREBASE_SERVICE_ACCOUNT_KEY is not set in Vercel environment variables.");
    return res.status(500).json({ error: "FIREBASE_SERVICE_ACCOUNT_KEY not configured. Add it in Vercel → Settings → Environment Variables." });
  }

  const results = {
    authDeleted: 0,
    firestoreUsersDeleted: 0,
    firestorePostsDeleted: 0,
    errors: [] as string[],
  };

  try {
    // ── 1. Delete from Firebase Auth via Admin SDK ─────────────────────────
    const app = getAdminApp();
    const auth = getAuth(app);

    // List all Auth users in batches of 1000
    const testUids: string[] = [];
    let nextPageToken: string | undefined;
    do {
      const listResult = await auth.listUsers(1000, nextPageToken);
      for (const user of listResult.users) {
        if (user.email?.endsWith("@example.com")) {
          testUids.push(user.uid);
        }
      }
      nextPageToken = listResult.pageToken;
    } while (nextPageToken);

    // Delete in batches of 1000 (Auth API limit)
    for (let i = 0; i < testUids.length; i += 1000) {
      const batch = testUids.slice(i, i + 1000);
      const deleteResult = await auth.deleteUsers(batch);
      results.authDeleted += deleteResult.successCount;
      if (deleteResult.errors.length > 0) {
        results.errors.push(...deleteResult.errors.map(e => `Auth ${e.index}: ${e.error.message}`));
      }
    }
  } catch (err: any) {
    results.errors.push(`Auth deletion failed: ${err.message}`);
  }

  try {
    // ── 2. Delete Firestore user docs and posts via platform agent ─────────
    const token = await getPlatformToken();
    const allUsers = await listFirestoreUsers(token);
    const testUsers = allUsers.filter(u => u.email.endsWith("@example.com"));
    const testUserIds = new Set(testUsers.map(u => u.id));

    // Delete user docs
    const userDeletes = await Promise.allSettled(
      testUsers.map(u => deleteFirestoreDoc(`users/${u.id}`, token))
    );
    results.firestoreUsersDeleted = userDeletes.filter(r => r.status === "fulfilled").length;

    // Delete posts belonging to test users
    const allPosts = await listFirestorePosts(token);
    const testPosts = allPosts.filter(p => testUserIds.has(p.userId));
    const postDeletes = await Promise.allSettled(
      testPosts.map(p => deleteFirestoreDoc(`posts/${p.id}`, token))
    );
    results.firestorePostsDeleted = postDeletes.filter(r => r.status === "fulfilled").length;
  } catch (err: any) {
    results.errors.push(`Firestore deletion failed: ${err.message}`);
  }

  return res.status(200).json({
    success: results.errors.length === 0,
    ...results,
    message: `Auth: ${results.authDeleted} accounts deleted. Firestore: ${results.firestoreUsersDeleted} user docs, ${results.firestorePostsDeleted} posts deleted.`,
  });

  } catch (err: any) {
    console.error("cleanup-test-accounts top-level error:", err.message, err.stack);
    return res.status(500).json({ error: err.message, stack: err.stack });
  }
}
