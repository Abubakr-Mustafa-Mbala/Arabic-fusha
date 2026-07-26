import { useState } from "react";
import { C } from "../lib/shared";
import { supabase } from "../lib/supabaseClient";

export default function AuthScreen() {
  const [mode, setMode] = useState("signin"); // signin | signup
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState(null);

  const go = async () => {
    if (!email.trim() || password.length < 6 || busy) {
      setMsg({ err: true, text: "Enter your email and a password of at least 6 characters." });
      return;
    }
    setBusy(true);
    setMsg(null);
    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({ email: email.trim(), password });
        if (error) throw error;
        setMsg({ err: false, text: "Account created — signing you in..." });
        // If email confirmation is disabled in Supabase, signUp returns a live session automatically.
        const { error: e2 } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
        if (e2) setMsg({ err: false, text: "Account created. Check your email to confirm, then sign in." });
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
        if (error) throw error;
      }
    } catch (e) {
      setMsg({ err: true, text: e.message || "Something went wrong — try again." });
    } finally {
      setBusy(false);
    }
  };

  const field = {
    width: "100%",
    borderRadius: 14,
    padding: "12px 14px",
    fontSize: 16,
    background: C.surface,
    border: `1.5px solid ${C.border}`,
    marginTop: 10,
  };

  return (
    <div style={{ minHeight: "100vh", display: "flex", justifyContent: "center", alignItems: "center", background: C.paper }}>
      <div style={{ width: "100%", maxWidth: 400, padding: "0 20px" }}>
        <div style={{ textAlign: "center", marginBottom: 22 }}>
          <div className="arabic" dir="rtl" style={{ fontSize: 46, color: C.emerald, fontWeight: 700 }}>اَلْفُصْحَى</div>
          <div style={{ fontSize: 10, color: C.faded, letterSpacing: "0.28em", textTransform: "uppercase" }}>
            learn arabic · in arabic
          </div>
        </div>

        <div className="card" style={{ padding: 20 }}>
          <div style={{ display: "flex", gap: 8, marginBottom: 6 }}>
            {["signin", "signup"].map((m) => (
              <button
                key={m}
                onClick={() => { setMode(m); setMsg(null); }}
                style={{
                  flex: 1, padding: "8px 0", borderRadius: 10, fontWeight: 600, fontSize: 14,
                  background: mode === m ? C.emerald : "transparent",
                  color: mode === m ? "#fff" : C.faded,
                  border: `1px solid ${mode === m ? C.emerald : C.border}`,
                }}
              >
                {m === "signin" ? "Sign in" : "Create account"}
              </button>
            ))}
          </div>
          <input type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} style={field} />
          <input
            type="password"
            placeholder="Password (6+ characters)"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && go()}
            style={field}
          />
          {msg && (
            <div style={{
              marginTop: 10, padding: 10, borderRadius: 10, fontSize: 13,
              background: msg.err ? C.redSoft : C.emeraldSoft,
              color: msg.err ? C.red : C.emerald,
            }}>
              {msg.text}
            </div>
          )}
          <button className="btn-primary" style={{ width: "100%", marginTop: 14, fontSize: 16 }} disabled={busy} onClick={go}>
            {busy ? "..." : mode === "signin" ? "Sign in →" : "Create account →"}
          </button>
        </div>

        <p style={{ textAlign: "center", fontSize: 11, color: C.faded, marginTop: 16 }}>
          Your lessons, grades, and revision schedule are saved to your account.
        </p>
      </div>
    </div>
  );
}
