const EMAIL_API = "/api/send-email";

export async function sendAdminSignupNotification(newUser: {
  name: string;
  email: string;
  role: string;
  province: string;
  position?: string;
  club?: string;
}) {
  await fetch(EMAIL_API, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      type: "admin_signup",
      to: newUser.email,
      name: newUser.name,
      role: newUser.role,
      province: newUser.province,
      position: newUser.position,
      club: newUser.club,
    }),
  });
}
