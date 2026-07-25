/**
 * Authentication Service Abstraction Layer
 * Pluggable provider for Hardcoded Auth, JWT, OAuth, SSO, and RBAC.
 */

export const LoginService = {
  async login(username, password) {
    // Current hardcoded implementation (pre-JWT/OAuth)
    if (username === "admin" && password === "secureflow") {
      const session = {
        user: { id: "usr_1", name: "DevSecOps Admin", email: "admin@secureflow.io", role: "ADMIN" },
        token: "sf_session_token_devsecops_2026",
        authenticatedAt: new Date().toISOString(),
      };
      sessionStorage.setItem("sf_auth", "true");
      sessionStorage.setItem("sf_user", JSON.stringify(session.user));
      return { success: true, session };
    }
    return { success: false, error: "Invalid username or password." };
  },

  async logout() {
    sessionStorage.removeItem("sf_auth");
    sessionStorage.removeItem("sf_user");
    return { success: true };
  },

  getCurrentUser() {
    const user = sessionStorage.getItem("sf_user");
    if (!user) return { id: "usr_1", name: "DevSecOps Admin", email: "admin@secureflow.io", role: "ADMIN" };
    try {
      return JSON.parse(user);
    } catch {
      return { id: "usr_1", name: "DevSecOps Admin", email: "admin@secureflow.io", role: "ADMIN" };
    }
  },

  isAuthenticated() {
    return sessionStorage.getItem("sf_auth") === "true";
  }
};
