import { useSession, signOut } from "next-auth/react";
import { useEffect } from "react";
import { useRouter } from "next/router";
import App from "../src/App";

export default function Home() {
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
    }
  }, [status]);

  if (status === "loading") {
    return (
      <div style={{
        minHeight: "100vh",
        background: "#0a0c10",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        color: "#64748b",
        fontFamily: "monospace",
        fontSize: 13,
      }}>
        ⏳ Loading…
      </div>
    );
  }

  if (!session) return null;

  return (
    <div>
      <div style={{
        position: "fixed",
        bottom: 16,
        right: 16,
        zIndex: 1000,
        display: "flex",
        alignItems: "center",
        gap: 8,
        background: "#111318",
        border: "1px solid #1e2330",
        borderRadius: 8,
        padding: "6px 12px",
      }}>
        <img src={session.user.image} style={{ width: 22, height: 22, borderRadius: "50%" }} />
        <span style={{ color: "#64748b", fontSize: 11, fontFamily: "monospace" }}>{session.user.email}</span>
        <button onClick={() => signOut()} style={{
          background: "transparent",
          border: "1px solid #1e2330",
          borderRadius: 4,
          color: "#64748b",
          fontSize: 11,
          cursor: "pointer",
          padding: "2px 8px",
          fontFamily: "monospace",
        }}>Sign out</button>
      </div>
      <App />
    </div>
  );
}
