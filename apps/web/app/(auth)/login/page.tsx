"use client"
// app/(auth)/login/page.tsx
// Login page with email + password fields and Google OAuth option.
// Form validation is done client-side with simple state checks.
// Replace the handleSubmit logic with NextAuth signIn() once backend is ready.

import { useState, useCallback } from "react"
import { useRouter } from "next/navigation"
import { motion } from "framer-motion"
import { Mail, Lock, Eye, EyeOff, Loader2 } from "lucide-react"
import Link from "next/link"
import styles from "./login.module.css"

export default function LoginPage() {
  const router = useRouter()

  // Form state
  const [email,       setEmail]       = useState("")
  const [password,    setPassword]    = useState("")
  const [showPass,    setShowPass]    = useState(false)
  const [loading,     setLoading]     = useState(false)
  const [error,       setError]       = useState("")

  // Basic validation
  const isValid = email.includes("@") && password.length >= 6

  const handleSubmit = useCallback(async () => {
    if (!isValid) {
      setError("Please enter a valid email and password (min 6 chars)")
      return
    }
    setError("")
    setLoading(true)

    try {
      // TODO: replace with NextAuth signIn("credentials", { email, password })
      // For now simulate a successful login
      await new Promise((r) => setTimeout(r, 1000))
      router.push("/")
    } catch {
      setError("Invalid email or password. Please try again.")
    } finally {
      setLoading(false)
    }
  }, [email, password, isValid, router])

  // Submit on Enter key
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === "Enter" && isValid) handleSubmit()
  }, [isValid, handleSubmit])

  const handleGoogleLogin = useCallback(() => {
    // TODO: signIn("google") from NextAuth
    alert("Google OAuth — connect NextAuth to enable")
  }, [])

  return (
    <main className={styles.page}>
      {/* Decorative blobs */}
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
        <h1 className={styles.cardTitle}>Welcome back</h1>
        <p className={styles.cardSubtitle}>Sign in to continue your journey</p>

        {/* Fields */}
        <div className={styles.fieldGroup}>

          {/* Email */}
          <div className={styles.field}>
            <label className={styles.label}>Email address</label>
            <div className={styles.inputWrap}>
              <Mail size={16} className={styles.inputIcon} />
              <input
                type="email"
                value={email}
                onChange={(e) => { setEmail(e.target.value); setError("") }}
                onKeyDown={handleKeyDown}
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
                onKeyDown={handleKeyDown}
                placeholder="Min 6 characters"
                className={styles.input}
                autoComplete="current-password"
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
          </div>

        </div>

        {/* Forgot password */}
        <div className={styles.forgotRow}>
          <Link href="/forgot-password" className={styles.forgotLink}>
            Forgot password?
          </Link>
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
          style={{ marginTop: "1rem" }}
        >
          {loading
            ? <><Loader2 size={18} style={{ animation: "spin 1s linear infinite" }} /> Signing in...</>
            : "Sign in"
          }
        </motion.button>

        {/* Divider */}
        <div className={styles.divider}>
          <div className={styles.dividerLine} />
          <span className={styles.dividerText}>or continue with</span>
          <div className={styles.dividerLine} />
        </div>

        {/* Google */}
        <button className={styles.googleBtn} onClick={handleGoogleLogin}>
          {/* Google logo SVG */}
          <svg width="18" height="18" viewBox="0 0 48 48">
            <path fill="#FFC107" d="M43.6 20H24v8h11.3C33.6 33.1 29.3 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.1 7.9 3l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20c11 0 20-8.9 20-20 0-1.3-.1-2.7-.4-4z"/>
            <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.5 15.1 18.9 12 24 12c3.1 0 5.8 1.1 7.9 3l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"/>
            <path fill="#4CAF50" d="M24 44c5.2 0 9.9-1.9 13.5-5l-6.2-5.2C29.5 35.6 26.9 36 24 36c-5.2 0-9.6-2.9-11.3-7.1l-6.6 5.1C9.7 39.6 16.3 44 24 44z"/>
            <path fill="#1976D2" d="M43.6 20H24v8h11.3c-.9 2.4-2.5 4.4-4.6 5.8l6.2 5.2C40.7 35.6 44 30.2 44 24c0-1.3-.1-2.7-.4-4z"/>
          </svg>
          Continue with Google
        </button>

        {/* Switch to register */}
        <div className={styles.switchRow}>
          Dont have an account?
          <Link href="/register" className={styles.switchLink}>
            Sign up free
          </Link>
        </div>
      </motion.div>

      {/* Spin keyframe */}
      <style>{`@keyframes spin { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }`}</style>
    </main>
  )
}