import bcrypt from "bcryptjs"

export type SessionUser = { id: string; name: string; email: string }

type StoredUser = SessionUser & { passwordHash: string }

const DEMO_EMAIL = process.env.DEMO_EMAIL ?? "demo@critique.app"
const DEMO_PASSWORD = process.env.DEMO_PASSWORD ?? "password123"

/**
 * Demo user store. Replace this array with a real database lookup in
 * production; keep the bcrypt hash so plaintext passwords are never stored.
 */
const users: StoredUser[] = [
  {
    id: "usr_demo",
    name: "Alex Rivera",
    email: DEMO_EMAIL,
    passwordHash: bcrypt.hashSync(DEMO_PASSWORD, 10),
  },
]

export async function verifyCredentials(
  email: string,
  password: string,
): Promise<SessionUser | null> {
  const user = users.find(
    (u) => u.email.toLowerCase() === email.trim().toLowerCase(),
  )
  if (!user) return null
  const ok = await bcrypt.compare(password, user.passwordHash)
  if (!ok) return null
  return { id: user.id, name: user.name, email: user.email }
}
