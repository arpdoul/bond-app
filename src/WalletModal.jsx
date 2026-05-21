import { useState } from "react";
import { useCircleWallet } from "./useCircleWallet.js";

export default function WalletModal({ onClose, onConnected }) {
  const { connect, loading, error, status } = useCircleWallet();
  const [step, setStep] = useState("idle");
  const [localError, setLocalError] = useState("");

  const handleConnect = async () => {
    setStep("connecting");
    setLocalError("");
    try {
      const result = await connect();
      if (result) {
        setStep("done");
        setTimeout(() => onConnected(result), 800);
      } else {
        setStep("error");
        setLocalError("Connection failed. Check your Circle API key in Vercel env vars.");
      }
    } catch (e) {
      setStep("error");
      setLocalError(e.message);
    }
  };

  const steps = [
    { id: "createUser",   label: "Create secure user identity" },
    { id: "getUserToken", label: "Get auth token from Circle"  },
    { id: "initWallet",   label: "Initialize agent wallet"     },
    { id: "getWallets",   label: "Load wallet address"         },
    { id: "getBalance",   label: "Fetch USDC balance"          },
  ];

  const currentStatuses = {
    idle:       null,
    connecting: "Fetching app config...",
    done:       "connected",
    error:      "error",
  };

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 1000,
      background: "rgba(0,0,0,0.85)",
      display: "flex", alignItems: "center", justifyContent: "center",
      padding: 20,
    }}>
      <div style={{
        background: "#0f0f0f",
        border: "1px solid #1f1f1f",
        borderRadius: 16,
        padding: 28,
        width: "100%",
        maxWidth: 360,
      }}>
        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 24 }}>
          <div>
            <div style={{ fontSize: 16, fontWeight: 700, color: "#fff" }}>Connect Wallet</div>
            <div style={{ fontSize: 11, color: "#444", marginTop: 2 }}>Powered by Circle Programmable Wallets</div>
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", color: "#444", fontSize: 20, cursor: "pointer" }}>×</button>
        </div>

        {/* Status */}
        {step === "idle" && (
          <div style={{ marginBottom: 24 }}>
            <div style={{ fontSize: 12, color: "#555", marginBottom: 16, lineHeight: 1.6 }}>
              BOND creates a secure Circle programmable wallet for your agent to autonomously execute USDC payments.
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {steps.map((s, i) => (
                <div key={s.id} style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 12, color: "#333" }}>
                  <span style={{ color: "#222", fontSize: 14 }}>○</span>
                  {s.label}
                </div>
              ))}
            </div>
          </div>
        )}

        {step === "connecting" && (
          <div style={{ marginBottom: 24 }}>
            <div style={{ fontSize: 12, color: "#00FFB2", marginBottom: 16, textAlign: "center" }}>
              {status || "Connecting..."}
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {steps.map((s, i) => {
                const statusIndex = ["Fetching","Creating","Getting","Setting","Waiting","Loading"].findIndex(
                  k => (status || "").includes(k.split(" ")[0])
                );
                const done = i < statusIndex;
                const active = i === statusIndex;
                return (
                  <div key={s.id} style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 12,
                    color: done ? "#00FFB2" : active ? "#fff" : "#333" }}>
                    <span style={{ color: done ? "#00FFB2" : active ? "#00FFB2" : "#222", fontSize: 14 }}>
                      {done ? "✓" : active ? "◉" : "○"}
                    </span>
                    {s.label}
                  </div>
                );
              })}
            </div>
            {/* Spinner */}
            <div style={{ textAlign: "center", marginTop: 20, fontSize: 11, color: "#333" }}>
              This may take a few seconds...
            </div>
          </div>
        )}

        {step === "done" && (
          <div style={{ marginBottom: 24, textAlign: "center" }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>✓</div>
            <div style={{ fontSize: 14, color: "#00FFB2", fontWeight: 700 }}>Wallet Connected!</div>
            <div style={{ fontSize: 11, color: "#444", marginTop: 8 }}>Your agent wallet is ready</div>
          </div>
        )}

        {(step === "error" || localError) && (
          <div style={{ marginBottom: 24, padding: 14, background: "rgba(255,107,53,0.08)", border: "1px solid #FF6B3533", borderRadius: 8 }}>
            <div style={{ fontSize: 12, color: "#FF6B35", fontWeight: 600, marginBottom: 6 }}>Connection Failed</div>
            <div style={{ fontSize: 11, color: "#cc5533", lineHeight: 1.5 }}>
              {localError || error || "Unknown error"}
            </div>
            <div style={{ fontSize: 10, color: "#444", marginTop: 8 }}>
              Make sure CIRCLE_API_KEY and CIRCLE_APP_ID are set in Vercel environment variables.
            </div>
          </div>
        )}

        {/* Button */}
        {step !== "done" && (
          <button
            onClick={handleConnect}
            disabled={loading || step === "connecting"}
            style={{
              width: "100%", padding: "14px",
              background: step === "error" ? "transparent" : "#00FFB2",
              border: step === "error" ? "1px solid #FF6B35" : "none",
              color: step === "error" ? "#FF6B35" : "#080808",
              borderRadius: 8, fontSize: 13, fontWeight: 700,
              letterSpacing: "0.08em", textTransform: "uppercase",
              cursor: loading ? "not-allowed" : "pointer",
              opacity: loading ? 0.7 : 1,
            }}
          >
            {step === "connecting" ? "Connecting..." : step === "error" ? "Retry" : "Connect with Circle"}
          </button>
        )}

        {/* Circle branding */}
        <div style={{ textAlign: "center", marginTop: 16, fontSize: 10, color: "#222" }}>
          Secured by Circle · Non-custodial · ETH Sepolia Testnet
        </div>
      </div>
    </div>
  );
}
