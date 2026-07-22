import type { NextAuthConfig } from "next-auth"
import Google from "next-auth/providers/google"
import MicrosoftEntraID from "next-auth/providers/microsoft-entra-id"

// OAuth providers are only registered when their credentials are present, so
// the social buttons stay inert (with a friendly note) until keys are added.
const oauthProviders: NextAuthConfig["providers"] = []
if (process.env.AUTH_GOOGLE_ID) oauthProviders.push(Google)
if (process.env.AUTH_MICROSOFT_ENTRA_ID_ID) oauthProviders.push(MicrosoftEntraID)

// Edge-safe config: shared with the middleware. No Credentials provider here
// (its authorize runs bcrypt, which is Node-only) and no database access.
export default {
  providers: oauthProviders,
  pages: { signIn: "/" },
  trustHost: true,
  callbacks: {
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = Boolean(auth?.user)
      const isOnDashboard = nextUrl.pathname.startsWith("/dashboard")
      if (isOnDashboard) return isLoggedIn
      return true
    },
  },
} satisfies NextAuthConfig
