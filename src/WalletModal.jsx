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
      if (result?.challengeId) {
        setStep("pin");
        return;
      }
      if (result?.wallet || result?.userToken) {
        setStep("done");
        setTimeout(() => onConnected(result), 800);
      } else {
        setStep("error");
        setLocalError("Connection failed. Try again.");
      }
    } catch(e) {
      setStep("error");
      setLocalError(e.message);
    }
  };

  const steps = [
    "Create secure account",
    "Get auth token",
    "Load wallet",
    "Fetch balance",
  ];

  const statusIndex = {
    "Checking config...": 0,
    "Creating account...": 0,
    "Loading account...": 0,
    "Authenticating...": 1,
    "Loading wallet...": 2,
    "Creating wallet...": 2,
    "Fetching balance...": 3,
  }[status] ?? -1;

  return (
    <div style={{
      position:"fixed",inset:0,zIndex:1000,
      background:"rgba(0,0,0,0.85)",
      display:"flex",alignItems:"center",justifyContent:"center",padding:20,
    }}>
      <div style={{
        background:"#0f0f0f",border:"1px solid #1f1f1f",
        borderRadius:16,padding:28,width:"100%",maxWidth:360,
      }}>
        <div style={{display:"flex",justifyContent:"space-between",marginBottom:24}}>
          <div>
            <div style={{fontSize:16,fontWeight:700,color:"#fff"}}>Connect Wallet</div>
            <div style={{fontSize:11,color:"#444",marginTop:2}}>
              User-controlled · Only you can sign transactions
            </div>
          </div>
          <button onClick={onClose} style={{background:"none",border:"none",color:"#444",fontSize:20,cursor:"pointer"}}>×</button>
        </div>

        {/* User ownership notice */}
        <div style={{
          background:"rgba(0,255,178,0.05)",border:"1px solid #00FFB222",
          borderRadius:8,padding:"10px 14px",marginBottom:20,
          fontSize:11,color:"#00FFB2",lineHeight:1.6,
        }}>
          🔐 Your wallet — only you control it. BOND cannot move your funds without your PIN.
        </div>

        {step === "idle" && (
          <div style={{marginBottom:20}}>
            <div style={{display:"flex",flexDirection:"column",gap:8}}>
              {steps.map((s,i) => (
                <div key={i} style={{display:"flex",alignItems:"center",gap:10,fontSize:12,color:"#333"}}>
                  <span style={{color:"#222"}}>○</span>{s}
                </div>
              ))}
            </div>
          </div>
        )}

        {step === "connecting" && (
          <div style={{marginBottom:20}}>
            <div style={{fontSize:12,color:"#00FFB2",textAlign:"center",marginBottom:16}}>
              {status || "Connecting..."}
            </div>
            <div style={{display:"flex",flexDirection:"column",gap:8}}>
              {steps.map((s,i) => (
                <div key={i} style={{display:"flex",alignItems:"center",gap:10,fontSize:12,
                  color: i < statusIndex ? "#00FFB2" : i === statusIndex ? "#fff" : "#333"}}>
                  <span style={{color: i < statusIndex ? "#00FFB2" : i === statusIndex ? "#00FFB2" : "#222"}}>
                    {i < statusIndex ? "✓" : i === statusIndex ? "◉" : "○"}
                  </span>
                  {s}
                </div>
              ))}
            </div>
          </div>
        )}

        {step === "pin" && (
          <div style={{marginBottom:20,textAlign:"center"}}>
            <div style={{fontSize:30,marginBottom:12}}>🔑</div>
            <div style={{fontSize:14,color:"#fff",fontWeight:700,marginBottom:8}}>Set Your PIN</div>
            <div style={{fontSize:12,color:"#555",lineHeight:1.6,marginBottom:16}}>
              Circle will show a PIN setup screen. This PIN protects your wallet — only you know it.
            </div>
            <div style={{fontSize:11,color:"#333"}}>
              Complete PIN setup in the Circle overlay, then return here.
            </div>
          </div>
        )}

        {step === "done" && (
          <div style={{marginBottom:20,textAlign:"center"}}>
            <div style={{fontSize:40,marginBottom:12}}>✓</div>
            <div style={{fontSize:14,color:"#00FFB2",fontWeight:700}}>Wallet Connected!</div>
            <div style={{fontSize:11,color:"#444",marginTop:8}}>
              You own this wallet. Only you can authorize transactions.
            </div>
          </div>
        )}

        {(step === "error" || localError) && (
          <div style={{marginBottom:20,padding:14,background:"rgba(255,107,53,0.08)",border:"1px solid #FF6B3533",borderRadius:8}}>
            <div style={{fontSize:12,color:"#FF6B35",fontWeight:600,marginBottom:6}}>Failed</div>
            <div style={{fontSize:11,color:"#cc5533",lineHeight:1.5}}>{localError || error}</div>
          </div>
        )}

        {step !== "done" && step !== "pin" && (
          <button onClick={handleConnect} disabled={loading || step === "connecting"}
            style={{
              width:"100%",padding:"14px",
              background: step === "error" ? "transparent" : "#00FFB2",
              border: step === "error" ? "1px solid #FF6B35" : "none",
              color: step === "error" ? "#FF6B35" : "#080808",
              borderRadius:8,fontSize:13,fontWeight:700,
              letterSpacing:"0.08em",textTransform:"uppercase",
              cursor: loading ? "not-allowed" : "pointer",
              opacity: loading ? 0.7 : 1,
            }}>
            {step === "connecting" ? "Connecting..." : step === "error" ? "Retry" : "Connect Wallet"}
          </button>
        )}

        <div style={{textAlign:"center",marginTop:16,fontSize:10,color:"#222"}}>
          Powered by Circle User-Controlled Wallets · Arc Testnet
        </div>
      </div>
    </div>
  );
}
