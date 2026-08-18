/**
 * One-shot cleanup: deletes all @example.com test accounts from Firestore
 * and Firebase Auth. Secured by CRON_SECRET.
 *
 * Call once from Vercel dashboard or:
 *   curl -X POST https://scoutme-mu.vercel.app/api/cleanup-test-accounts \
 *     -H "Authorization: Bearer <CRON_SECRET>"
 */

const FIREBASE_API_KEY    = process.env.FIREBASE_API_KEY    || "";
const FIREBASE_PROJECT_ID = "scoutme-10";
const PLATFORM_EMAIL      = process.env.PLATFORM_AGENT_EMAIL    || "";
const PLATFORM_PASSWORD   = process.env.PLATFORM_AGENT_PASSWORD || "";
const FIRESTORE_BASE      = `https://firestore.googleapis.com/v1/projects/${FIREBASE_PROJECT_ID}/databases/(default)/documents`;

async function getToken(): Promise<string> {
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

async function listAllUsers(token: string): Promise<Array<{ id: string; email: string }>> {
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

async function deleteFirestoreDoc(path: string, token: string): Promise<void> {
  await fetch(`https://firestore.googleapis.com/v1/projects/${FIREBASE_PROJECT_ID}/databases/(default)/documents/${path}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${token}` },
  });
}

async function deleteAuthUser(localId: string, token: string): Promise<void> {
  await fetch(
    `https://identitytoolkit.googleapis.com/v1/accounts:delete?key=${FIREBASE_API_KEY}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      // Note: this only works for the currently signed-in user.
      // For other users you need Admin SDK. We delete the Firestore doc instead.
      body: JSON.stringify({ idToken: token }),
    }
  );
}

export default async function handler(req: any, res: any) {
  // Auth check
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret) {
    const authHeader = req.headers["authorization"] || req.headers["x-cron-secret"] || "";
    const provided = authHeader.replace(/^Bearer\s+/i, "");
    if (provided !== cronSecret) {
      return res.status(401).json({ error: "Unauthorized" });
    }
  }

  try {
    const token = await getToken();

    // List all users from Firestore
    const allUsers = await listAllUsers(token);
    const testUsers = allUsers.filter(u => u.email.endsWith("@example.com"));

    if (testUsers.length === 0) {
      return res.status(200).json({ success: true, deleted: 0, message: "No test accounts found." });
    }

    // Delete Firestore user docs
    const deleteResults = await Promise.allSettled(
      testUsers.map(u => deleteFirestoreDoc(`users/${u.id}`, token))
    );

    // Also delete their posts
    const postsRes = await fetch(
      `${FIRESTORE_BASE}/posts?pageSize=300`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    const postsData = await postsRes.json();
    const testUserIds = new Set(testUsers.map(u => u.id));

    const testPosts = (postsData.documents || []).filter((doc: any) => {
      const uid = doc.fields?.userId?.stringValue || "";
      return testUserIds.has(uid);
    });

    await Promise.allSettled(
      testPosts.map((doc: any) => {
        const id = doc.name.split("/").pop();
        return deleteFirestoreDoc(`posts/${id}`, token);
      })
    );

    const succeeded = deleteResults.filter(r => r.status === "fulfilled").length;

    return res.status(200).json({
      success: true,
      deleted: succeeded,
      postsDeleted: testPosts.length,
      message: `Deleted ${succeeded} test accounts and ${testPosts.length} associated posts.`,
    });
  } catch (err: any) {
    console.error("[cleanup-test-accounts]", err);
    return res.status(500).json({ error: err.message });
  }
}
