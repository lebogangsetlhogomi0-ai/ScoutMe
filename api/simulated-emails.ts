// In serverless context, emails are not persisted across invocations.
// Return empty array — the frontend handles this gracefully.
export default function handler(_req: any, res: any) {
  res.status(200).json({ emails: [] });
}
