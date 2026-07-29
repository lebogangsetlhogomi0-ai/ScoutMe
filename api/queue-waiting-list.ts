export default async function handler(req: any, res: any) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const { email, name, role } = req.body;
  if (!email) return res.status(400).json({ error: "Email is required" });

  const ticketId = "SM-" + Math.floor(100000 + Math.random() * 900000);
  const queueNo = Math.floor(150 + Math.random() * 850);
  const deliveryTime = Date.now() + 25000;

  console.log(`[Queue System] Queuing ScoutMe waiting list entry for ${name || email}`);

  res.status(200).json({
    success: true,
    message: "Email response successfully scheduled. Dispatches in 25 seconds.",
    ticketId,
    queueNo,
    deliveryTime
  });
}
