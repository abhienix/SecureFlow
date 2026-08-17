import React, { useState } from "react";
import { ShieldCheck, ArrowRight, Eye, EyeOff } from "lucide-react";
import CyberLoader from "./shared/CyberLoader";

export function LoginGate({ onAuthenticate }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState({ username: "", password: "" });
  const [demoLoaded, setDemoLoaded] = useState(false);

  const handleUseDemoAccount = () => {
    setUsername("admin");
    setPassword("secureflow");
    setError("");
    setFieldErrors({ username: "", password: "" });
    setDemoLoaded(true);
    setTimeout(() => setDemoLoaded(false), 2000);
  };

  const validateForm = () => {
    const errors = { username: "", password: "" };
    let isValid = true;

    if (!username.trim()) {
      errors.username = "Username or email is required.";
      isValid = false;
    }

    if (!password) {
      errors.password = "Password is required.";
      isValid = false;
    }

    setFieldErrors(errors);
    return isValid;
  };

  const handleSubmit = async (e) => {
    e?.preventDefault();
    setError("");

    if (!validateForm()) {
      return;
    }

    setLoading(true);

    try {
      const result = await Promise.resolve(onAuthenticate(username, password));
      // If onAuthenticate returns an error object
      if (result && result.success === false) {
        setError(result.error || "Invalid username or password.");
        setLoading(false);
      }
    } catch (err) {
      setError(err?.message || "Invalid username or password.");
      setLoading(false);
    }
  };

  if (loading) {
    return <CyberLoader fullScreen label="Signing in..." />;
  }

  return (
    <div style={{
      display: "flex", alignItems: "center", justifyContent: "center",
      minHeight: "100vh", background: "#0b0f19", color: "#f9fafb",
      fontFamily: "'Inter', system-ui, -apple-system, sans-serif", padding: 20,
    }}>
      {/* Login Card */}
      <div style={{
        width: "100%", maxWidth: 420, padding: "36px 32px",
        background: "#111827", border: "1px solid #1f2937",
        borderRadius: 16, boxShadow: "0 20px 40px rgba(0,0,0,0.4)",
        display: "flex", flexDirection: "column", gap: 24,
      }}>
        {/* Header Section */}
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center" }}>
          <div style={{
            width: 44, height: 44, borderRadius: 10,
            background: "#4f46e5",
            display: "flex", alignItems: "center", justifyContent: "center",
            marginBottom: 12, boxShadow: "0 4px 12px rgba(79, 70, 229, 0.3)"
          }}>
            <ShieldCheck size={24} color="#ffffff" />
          </div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: "#f9fafb", margin: 0, letterSpacing: "-0.3px" }}>
            SecureFlow
          </h1>
          <p style={{ fontSize: 13, fontWeight: 500, color: "#9ca3af", marginTop: 4, margin: "4px 0 0 0" }}>
            DevSecOps Security Platform
          </p>
        </div>

        {/* Login Form */}
        <form onSubmit={handleSubmit} noValidate style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {/* Username Input */}
          <div>
            <label 
              htmlFor="username" 
              style={{ fontSize: 12, fontWeight: 600, color: "#d1d5db", display: "block", marginBottom: 6 }}
            >
              Username or Email
            </label>
            <input
              id="username"
              type="text"
              name="username"
              value={username}
              onChange={e => {
                setUsername(e.target.value);
                if (fieldErrors.username) setFieldErrors(prev => ({ ...prev, username: "" }));
              }}
              placeholder="Enter your username or email"
              autoComplete="username"
              required
              style={{
                width: "100%", padding: "10px 14px", borderRadius: 8,
                background: "#1f2937", border: fieldErrors.username ? "1px solid #ef4444" : "1px solid #374151",
                color: "#f9fafb", fontSize: 14, outline: "none",
                boxSizing: "border-box", transition: "border-color 150ms ease"
              }}
            />
            {fieldErrors.username && (
              <span style={{ fontSize: 12, color: "#ef4444", marginTop: 4, display: "block" }}>
                {fieldErrors.username}
              </span>
            )}
          </div>

          {/* Password Input */}
          <div>
            <label 
              htmlFor="password" 
              style={{ fontSize: 12, fontWeight: 600, color: "#d1d5db", display: "block", marginBottom: 6 }}
            >
              Password
            </label>
            <div style={{ position: "relative", width: "100%" }}>
              <input
                id="password"
                type={showPassword ? "text" : "password"}
                name="password"
                value={password}
                onChange={e => {
                  setPassword(e.target.value);
                  if (fieldErrors.password) setFieldErrors(prev => ({ ...prev, password: "" }));
                }}
                placeholder="Enter your password"
                autoComplete="current-password"
                required
                style={{
                  width: "100%", padding: "10px 40px 10px 14px", borderRadius: 8,
                  background: "#1f2937", border: fieldErrors.password ? "1px solid #ef4444" : "1px solid #374151",
                  color: "#f9fafb", fontSize: 14, outline: "none",
                  boxSizing: "border-box", transition: "border-color 150ms ease"
                }}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                aria-label={showPassword ? "Hide password" : "Show password"}
                style={{
                  position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)",
                  background: "transparent", border: "none", color: "#9ca3af",
                  cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
                  padding: 4, borderRadius: 4
                }}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
            {fieldErrors.password && (
              <span style={{ fontSize: 12, color: "#ef4444", marginTop: 4, display: "block" }}>
                {fieldErrors.password}
              </span>
            )}
          </div>

          {/* General Error Alert */}
          {error && (
            <div style={{
              fontSize: 13, color: "#ef4444", fontWeight: 500, background: "rgba(239, 68, 68, 0.1)",
              padding: "10px 14px", borderRadius: 8, border: "1px solid rgba(239, 68, 68, 0.2)"
            }}>
              {error}
            </div>
          )}

          {/* Sign In Button */}
          <button
            type="submit"
            disabled={loading}
            style={{
              width: "100%", padding: "11px 16px", borderRadius: 8,
              background: "#4f46e5", border: "none", color: "#ffffff",
              fontSize: 14, fontWeight: 600, cursor: loading ? "not-allowed" : "pointer",
              display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
              transition: "background-color 150ms ease", marginTop: 4,
              opacity: loading ? 0.7 : 1
            }}
          >
            <span>{loading ? "Signing in..." : "Sign In"}</span>
            {!loading && <ArrowRight size={16} />}
          </button>
        </form>

        {/* Demo Helper Section */}
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8, paddingTop: 4 }}>
          <button
            type="button"
            onClick={handleUseDemoAccount}
            style={{
              background: "transparent", border: "none", color: "#818cf8",
              fontSize: 13, fontWeight: 500, cursor: "pointer", padding: "4px 8px",
              textDecoration: "underline", textUnderlineOffset: "3px"
            }}
          >
            {demoLoaded ? "Demo credentials loaded" : "Use Demo Account"}
          </button>
          
          <span style={{ fontSize: 11, color: "#4b5563", marginTop: 4 }}>
            Demo Environment
          </span>
        </div>
      </div>
    </div>
  );
}

export default LoginGate;

