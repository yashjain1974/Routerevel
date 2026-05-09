// app/page.tsx
import { Hero } from "@/components/home/Hero"
import { RouteInput } from "@/components/home/RouteInput"

export default function HomePage() {
  return (
    <main
      style={{
        position: "relative",
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
        background: "linear-gradient(135deg, #0D2137 0%, #1B4F72 45%, #117A65 100%)",
      }}
    >
      {/* Decorative blobs */}
      <div style={{
        position: "absolute",
        top: "-120px",
        right: "-120px",
        width: "420px",
        height: "420px",
        borderRadius: "50%",
        background: "rgba(255,255,255,0.04)",
        filter: "blur(60px)",
        pointerEvents: "none",
      }} />
      <div style={{
        position: "absolute",
        bottom: "-100px",
        left: "-100px",
        width: "380px",
        height: "380px",
        borderRadius: "50%",
        background: "rgba(243,156,18,0.07)",
        filter: "blur(60px)",
        pointerEvents: "none",
      }} />
      <div style={{
        position: "absolute",
        top: "40%",
        left: "50%",
        transform: "translate(-50%,-50%)",
        width: "600px",
        height: "600px",
        borderRadius: "50%",
        background: "rgba(17,122,101,0.06)",
        filter: "blur(80px)",
        pointerEvents: "none",
      }} />

      {/* Main content */}
      <div style={{
        flex: 1,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "3rem 1rem",
        gap: "3rem",
        position: "relative",
        zIndex: 1,
      }}>
        <Hero />
        <RouteInput />
      </div>

      {/* Bottom tagline */}
      <div style={{
        textAlign: "center",
        paddingBottom: "2rem",
        color: "rgba(255,255,255,0.25)",
        fontSize: "0.75rem",
        letterSpacing: "0.12em",
        textTransform: "uppercase",
        position: "relative",
        zIndex: 1,
      }}>
        Every road has a story. We tell it.
      </div>

      {/* Spinner keyframe for loading button */}
      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </main>
  )
}