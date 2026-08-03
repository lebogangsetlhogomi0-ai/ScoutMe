import { generateOtp } from "./send-otp";

export default async function handler(req: any, res: any) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const otpSecret = process.env.OTP_SECRET;
  if (!otpSecret) return res.status(500).json({ error: "Server not configured" });

  const { email, otp } = req.body;
  if (!email || !otp) return res.status(400).json({ error: "Missing email or otp" });

  const now = Math.floor(Date.now() / (10 * 60 * 1000));
  // Accept current window and previous window (handles edge case near boundary)
  const valid =
    generateOtp(email, otpSecret, now) === String(otp) ||
    generateOtp(email, otpSecret, now - 1) === String(otp);

  if (!valid) return res.status(400).json({ error: "Incorrect code" });

  res.status(200).json({ success: true });
}
