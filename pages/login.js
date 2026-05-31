import { signIn } from "next-auth/react";

export default function Login() {
  return (
    <div style={{
      minHeight: "100vh",
      background: "#0a0c10",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
    }}>
      <div style={{
        background: "#111318",
        border: "1px solid #1e2330",
        borderRadius: 16,
        padding: "48px 40px",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 24,
        maxWidth: 360,
        width: "100%",
      }}>
        <div style={{
          width: 48, height: 48, borderRadius: 10,
          background: "#00d4ff22", border: "1px solid #00d4ff44",
          display: "flex", alignItems: "center",
          justifyContent: "center", fontSize: 24,
        }}>◈</div>

        <div style={{ textAlign: "center" }}>
          <div style={{ color: "#e2e8f0", fontWeight: 800, fontSize: 22, letterSpacing: "-0.02em", fontFamily: "sans-serif" }}>CyanAds</div>
          <div style={{ color: "#64748b", fontSize: 13, marginTop: 4 }}>Revenue Monitor</div>
        </div>

        <button
          onClick={() => signIn("google", { callbackUrl: "/" })}
          style={{
            background: "#00d4ff",
            color: "#0a0c10",
            border: "none",
            borderRadius: 10,
            padding: "13px 24px",
            fontSize: 14,
            fontWeight: 700,
            cursor: "pointer",
            width: "100%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 10,
          }}
        >
          <svg width="18" height="18" viewBox="0 0 48 48">
            <path fill="#FFC107" d="M43.6 20H24v8h11.3C33.6 33.1 29.3 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3 0 5.8 1.1 7.9 3l5.7-5.7C34.1 6.5 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20c11 0 20-8 20-20 0-1.3-.1-2.7-.4-4z"/>
            <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.5 15.1 18.9 12 24 12c3 0 5.8 1.1 7.9 3l5.7-5.7C34.1 6.5 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"/>
            <path fill="#4CAF50" d="M24 44c5.2 0 9.9-1.9 13.5-5l-6.2-5.2C29.4 35.6 26.8 36 24 36c-5.2 0-9.6-2.9-11.3-7.1l-6.5 5C9.6 39.6 16.3 44 24 44z"/>
            <path fill="#1976D2" d="M43.6 20H24v8h11.3c-.9 2.4-2.5 4.4-4.6 5.8l6.2 5.2C40.8 35.7 44 30.3 44 24c0-1.3-.1-2.7-.4-4z"/>
          </svg>
          Sign in with Google
        </button>

        <div style={{ color: "#3a4558", fontSize: 11, fontFamily: "monospace", textAlign: "center" }}>
          Access restricted to authorized users only
        </div>
      </div>
    </div>
  );
}
