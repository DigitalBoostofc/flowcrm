export function isPlatformAdminEmail(email?: string | null): boolean {
  if (!email) return false;
  const raw = process.env.PLATFORM_ADMIN_EMAILS;
  if (!raw) return false;
  const allowed = raw.split(',').map((s) => s.trim().toLowerCase()).filter(Boolean);
  return allowed.includes(email.toLowerCase());
}
