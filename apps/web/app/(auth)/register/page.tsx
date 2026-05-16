"use client"
// app/(auth)/register/page.tsx
// Registration page — name, email, password, confirm password.
// Same visual style as login page using shared auth.module.css.
// Replace handleSubmit with real API call once backend/NextAuth is ready.

import { useState, useCallback } from "react"
import { useRouter } from "next/navigation"
import { motion } from "framer-motion"
import { Mail, Lock, Eye, EyeOff, User, Loader2, CheckCircle2 } from "lucide-react"
import Link from "next/link"
// Reuse the same CSS module as login — same visual design
import styles from "../login/login.module.css"

export default function RegisterPage() {
  const router = useRouter()

  const [name,        setName]        = useState("")
  const [email,       setEmail]       = useState("")
  const [password,    setPassword]    = useState("")
  const [confirm,     setConfirm]     = useState("")
  const [showPass,    setShowPass]    = useState(false)
  const [loading,     setLoading]     = useState(false)
  const [error,       setError]       = useState("")
  const [success,     setSuccess]     = useState(false)

  // Password strength indicator
  const strength = password.length === 0 ? 0
    : password.length < 6  ? 1
    : password.length < 10 ? 2
    : 3

  const strengthLabel = ["", "Weak", "Good", "Strong"]
  const strengthColor = ["", "#f87171", "#f59e0b", "#2dce89"]

  const isValid =
    name.trim().length > 1 &&
    email.includes("@") &&
    password.length >= 6 &&
    password === confirm

  const handleSubmit = useCallback(async () => {
    if (!isValid) {
      if (password !== confirm) {
        setError("Passwords do not match")
      } else {
        setError("Please fill all fields correctly")
      }
      return
    }
    setError("")
    setLoading(true)

    try {
      // TODO: call POST /api/auth/register with { name, email, password }
      await new Promise((r) => setTimeout(r, 1200))
      setSuccess(true)
      setTimeout(() => router.push("/login"), 1500)
    } catch {
      setError("Registration failed. Please try again.")
    } finally {
      setLoading(false)
    }
  }, [name, email, password, confirm, isValid, router])

  // Show success state
  if (success) {
    return (
      <main className={styles.page}>
        <div className={styles.blob1} />
        <div className={styles.blob2} />
        <motion.div
          className={styles.card}
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          style={{ textAlign: "center" }}
        >
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", stiffness: 200, delay: 0.1 }}
          >
            <CheckCircle2 size={56} style={{ color: "#2dce89", margin: "0 auto 1rem" }} />
          </motion.div>
          <h2 className={styles.cardTitle}>Account created!</h2>
          <p className={styles.cardSubtitle}>Redirecting you to login...</p>
        </motion.div>
      </main>
    )
  }

  return (
    <main className={styles.page}>
      <div className={styles.blob1} />
      <div className={styles.blob2} />

      {/* Brand */}
      <motion.div
        className={styles.brand}
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <Link href="/" style={{ textDecoration: "none" }}>
          <div className={styles.logo}>
            Route<span className={styles.logoAccent}>Revel</span>
          </div>
        </Link>
        <p className={styles.tagline}>Every road has a story. We tell it.</p>
      </motion.div>

      {/* Card */}
      <motion.div
        className={styles.card}
        initial={{ opacity: 0, y: 30, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.5, delay: 0.1, type: "spring", stiffness: 100 }}
      >
        <h1 className={styles.cardTitle}>Create account</h1>
        <p className={styles.cardSubtitle}>Start discovering stops on your journeys</p>

        <div className={styles.fieldGroup}>

          {/* Full name */}
          <div className={styles.field}>
            <label className={styles.label}>Full name</label>
            <div className={styles.inputWrap}>
              <User size={16} className={styles.inputIcon} />
              <input
                type="text"
                value={name}
                onChange={(e) => { setName(e.target.value); setError("") }}
                placeholder="Garvit Jain"
                className={styles.input}
                autoComplete="name"
              />
            </div>
          </div>

          {/* Email */}
          <div className={styles.field}>
            <label className={styles.label}>Email address</label>
            <div className={styles.inputWrap}>
              <Mail size={16} className={styles.inputIcon} />
              <input
                type="email"
                value={email}
                onChange={(e) => { setEmail(e.target.value); setError("") }}
                placeholder="you@example.com"
                className={styles.input}
                autoComplete="email"
              />
            </div>
          </div>

          {/* Password */}
          <div className={styles.field}>
            <label className={styles.label}>Password</label>
            <div className={styles.inputWrap}>
              <Lock size={16} className={styles.inputIcon} />
              <input
                type={showPass ? "text" : "password"}
                value={password}
                onChange={(e) => { setPassword(e.target.value); setError("") }}
                placeholder="Min 6 characters"
                className={styles.input}
                autoComplete="new-password"
              />
              <button
                type="button"
                className={styles.passwordToggle}
                onClick={() => setShowPass((v) => !v)}
                aria-label={showPass ? "Hide password" : "Show password"}
              >
                {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
            {/* Strength bar */}
            {password.length > 0 && (
              <div style={{ marginTop: "6px" }}>
                <div style={{ display: "flex", gap: "4px" }}>
                  {[1, 2, 3].map((s) => (
                    <div key={s} style={{
                      flex: 1,
                      height: "3px",
                      borderRadius: "9999px",
                      background: strength >= s ? strengthColor[strength] : "rgba(255,255,255,0.1)",
                      transition: "background 0.3s",
                    }} />
                  ))}
                </div>
                <p style={{ color: strengthColor[strength], fontSize: "0.72rem", marginTop: "4px" }}>
                  {strengthLabel[strength]}
                </p>
              </div>
            )}
          </div>

          {/* Confirm password */}
          <div className={styles.field}>
            <label className={styles.label}>Confirm password</label>
            <div className={styles.inputWrap}>
              <Lock size={16} className={styles.inputIcon} />
              <input
                type={showPass ? "text" : "password"}
                value={confirm}
                onChange={(e) => { setConfirm(e.target.value); setError("") }}
                placeholder="Re-enter password"
                className={styles.input}
                autoComplete="new-password"
                style={{
                  borderColor: confirm.length > 0
                    ? confirm === password
                      ? "rgba(45,206,137,0.5)"
                      : "rgba(248,113,113,0.5)"
                    : undefined
                }}
              />
            </div>
          </div>

        </div>

        {/* Error */}
        {error && (
          <motion.p
            className={styles.error}
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
          >
            {error}
          </motion.p>
        )}

        {/* Submit */}
        <motion.button
          className={styles.submitBtn}
          onClick={handleSubmit}
          disabled={!isValid || loading}
          whileTap={{ scale: 0.97 }}
        >
          {loading
            ? <><Loader2 size={18} style={{ animation: "spin 1s linear infinite" }} /> Creating account...</>
            : "Create account"
          }
        </motion.button>

        {/* Divider */}
        <div className={styles.divider}>
          <div className={styles.dividerLine} />
          <span className={styles.dividerText}>or continue with</span>
          <div className={styles.dividerLine} />
        </div>

        {/* Google */}
        <button className={styles.googleBtn}>
          <svg width="18" height="18" viewBox="0 0 48 48">
            <path fill="#FFC107" d="M43.6 20H24v8h11.3C33.6 33.1 29.3 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.1 7.9 3l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20c11 0 20-8.9 20-20 0-1.3-.1-2.7-.4-4z"/>
            <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.5 15.1 18.9 12 24 12c3.1 0 5.8 1.1 7.9 3l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"/>
            <path fill="#4CAF50" d="M24 44c5.2 0 9.9-1.9 13.5-5l-6.2-5.2C29.5 35.6 26.9 36 24 36c-5.2 0-9.6-2.9-11.3-7.1l-6.6 5.1C9.7 39.6 16.3 44 24 44z"/>
            <path fill="#1976D2" d="M43.6 20H24v8h11.3c-.9 2.4-2.5 4.4-4.6 5.8l6.2 5.2C40.7 35.6 44 30.2 44 24c0-1.3-.1-2.7-.4-4z"/>
          </svg>
          Continue with Google
        </button>

        <div className={styles.switchRow}>
          Already have an account?
          <Link href="/login" className={styles.switchLink}>Sign in</Link>
        </div>
      </motion.div>

      <style>{`@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`}</style>
    </main>
  )
}