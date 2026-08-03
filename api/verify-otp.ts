import { createHmac } from "crypto";

const WINDOW_MINUTES = 10;

function generateOtp(email: string, secret: string, windowIndex: number): string {
  const raw = createHmac("sha256", secret).update(`${email}:${windowIndex}`).digest("hex");
  return String(parseInt(raw.slice(0, 8), 16) % 1000000).padStart(6, "0");
}

export default async function handler(req: any, res: any) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const otpSecret = process.env.OTP_SECRET;
  console.log("[verify-otp] called, has OTP_SECRET:", !!otpSecret);

  if (!otpSecret) return res.status(500).json({ error: "Server not configured" });

  const { email, otp } = req.body;
  console.log("[verify-otp] verifying for:", email);

  if (!email || !otp) return res.status(400).json({ error: "Missing email or otp" });

  const now = Math.floor(Date.now() / (WINDOW_MINUTES * 60 * 1000));
  const expected = generateOtp(email, otpSecret, now);
  const expectedPrev = generateOtp(email, otpSecret, now - 1);

  console.log("[verify-otp] match current:", expected === String(otp), "match prev:", expectedPrev === String(otp));

  if (expected !== String(otp) && expectedPrev !== String(otp)) {
    return res.status(400).json({ error: "Incorrect code" });
  }

  res.status(200).json({ success: true });
}
