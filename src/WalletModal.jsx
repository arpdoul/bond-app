import { useState } from "react";

export default function WalletModal({ onClose, onConnected }) {
  const [step, setStep]         = useState("idle");
  const [status, setStatus]     = useState("");
  const [localError, setError]  = useState("");

  const handleConnect = async () => {
    setStep("connecting");
    setError("");
    try {
      // Step 1: App ID
      setStatus("Checking config...");
      const appRes = await fetch("/api/circle", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "getAppId" }),
      }).then(r => r.json());
      if (!appRes?.appId) throw new Error("App not configured");

      // Step 2: Create or reuse user
      setStatus("Creating account...");
      let userId = localStorage.getItem("bond_uid");
      if (!userId) {
        userId = "bond-" + crypto.randomUUID();
        await fetch("/api/circle", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "createUser", userId }),
        });
        localStorage.setItem("bond_uid", userId);
      }

      // Step 3: Get token
      setStatus("Authenticating...");
      const tokenRes = await fetch("/api/circle", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "getUserToken", userId }),
      }).then(r => r.json());

      const userToken = tokenRes?.data?.userToken;
      if (!userToken) throw new Error("Auth failed: " + JSON.stringify(tokenRes));
      localStorage.setItem("bond_utoken", userToken);

      // Step 4: Check existing wallets
      setStatus("Loading wallet...");
      const walletsRes = await fetch("/api/circle", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "getWallets", userToken }),
      }).then(r => r.json());

      let activeWallet = walletsRes?.data?.wallets?.[0];

      // Step 5: Create wallet if none
      if (!activeWallet) {
        setStatus("Creating wallet...");
        const walletRes = await fetch("/api/circle", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "initWallet", userToken }),
        }).then(r => r.json());
        activeWallet = walletRes?.data?.wallets?.[0];

        if (!activeWallet) {
          // Retry fetch
          const retry = await fetch("/api/circle", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ action: "getWallets", userToken }),
          }).then(r => r.json());
          activeWallet = retry?.data?.wallets?.[0];
        }
      }

      if (!activeWallet) throw new Error("Could not create wallet. Try again.");

      // Step 6: Save and get balance
      localStorage.setItem("bond_wid",    activeWallet.id);
      localStorage.setItem("bond_waddr",  activeWallet.address || activeWallet.id);

      setStatus("Fetching balance...");
      const balRes = await fetch("/api/circle", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "getBalance", walletId: activeWallet.id, userToken }),
      }).then(r => r.json());

      const usdc = balRes?.data?.tokenBalances?.find(b => b.token?.symbol === "USDC");
      const bal = usdc?.amount || "0.00";
      localStorage.setItem("bond_wbal", bal);

      setStep("done");
      setTimeout(() => onConnected({ wallet: activeWallet, userToken, balance: bal }), 800);

    } catch(e) {
      setStep("error");
      setError(e.message);
    }
  };

  const steps = [
    { label: "Create secure account",  done: ["Authenticating...","Loading wallet...","Creating wallet...","Fetching balance...","connected"].includes(status) },
    { label: "Get auth token",          done: ["Loading wallet...","Creating wallet...","Fetching balance...","connected"].includes(status) },
    { label: "Load or create wallet",   done: ["Fetching balance...","connected"].includes(status) },
    { label: "Fetch USDC balance",      done: status === "connected" },
  ];

  return (
    <div style={{position:"fixed",inset:0,zIndex:1000,background:"rgba(0,0,0,0.85)",display:"flex",alignItems:"center",justifyContent:"center",padding:20}}>
      <div style={{background:"#0f0f0f",border:"1px solid #1f1f1f",borderRadius:16,padding:28,width:"100%",maxWidth:360}}>

        <div style={{display:"flex",justifyContent:"space-between",marginBottom:20}}>
          <div>
            <div style={{fontSize:16,fontWeight:700,color:"#fff"}}>Connect Wallet</div>
            <div style={{fontSize:11,color:"#444",marginTop:2}}>Only you control your funds</div>
          </div>
          <button onClick={onClose} style={{background:"none",border:"none",color:"#444",fontSize:20,cursor:"pointer"}}>×</button>
        </div>

        <div style={{background:"rgba(0,255,178,0.05)",border:"1px solid #00FFB222",borderRadius:8,padding:"10px 14px",marginBottom:20,fontSize:11,color:"#00FFB2",lineHeight:1.6}}>
          🔐 User-controlled wallet · Circle Programmable Wallets · Arc Testnet
        </div>

        <div style={{marginBottom:20}}>
          {step === "connecting" && (
            <div style={{fontSize:12,color:"#00FFB2",textAlign:"center",marginBottom:14}}>{status}</div>
          )}
          <div style={{display:"flex",flexDirection:"column",gap:8}}>
            {steps.map((s,i) => (
              <div key={i} style={{display:"flex",alignItems:"center",gap:10,fontSize:12,
                color: s.done ? "#00FFB2" : step==="connecting" && !s.done ? "#fff" : "#333"}}>
                <span style={{color: s.done ? "#00FFB2" : "#333"}}>{s.done ? "✓" : "○"}</span>
                {s.label}
              </div>
            ))}
          </div>
        </div>

        {step === "done" && (
          <div style={{textAlign:"center",marginBottom:20}}>
            <div style={{fontSize:36,marginBottom:8}}>✓</div>
            <div style={{fontSize:14,color:"#00FFB2",fontWeight:700}}>Wallet Connected!</div>
            <div style={{fontSize:11,color:"#444",marginTop:6}}>You own this wallet on Arc Testnet</div>
          </div>
        )}

        {(step === "error" || localError) && (
          <div style={{marginBottom:16,padding:12,background:"rgba(255,107,53,0.08)",border:"1px solid #FF6B3533",borderRadius:8}}>
            <div style={{fontSize:12,color:"#FF6B35",fontWeight:600,marginBottom:4}}>Connection Failed</div>
            <div style={{fontSize:11,color:"#cc5533",lineHeight:1.5,wordBreak:"break-all"}}>{localError}</div>
          </div>
        )}

        {step !== "done" && (
          <button onClick={handleConnect} disabled={step === "connecting"}
            style={{width:"100%",padding:"14px",
              background: step==="error" ? "transparent" : "#00FFB2",
              border: step==="error" ? "1px solid #FF6B35" : "none",
              color: step==="error" ? "#FF6B35" : "#080808",
              borderRadius:8,fontSize:13,fontWeight:700,
              letterSpacing:"0.08em",textTransform:"uppercase",
              cursor: step==="connecting" ? "not-allowed" : "pointer",
              opacity: step==="connecting" ? 0.7 : 1,
            }}>
            {step === "connecting" ? "Connecting..." : step === "error" ? "Retry" : "Connect Wallet"}
          </button>
        )}

        <div style={{textAlign:"center",marginTop:14,fontSize:10,color:"#222"}}>
          Powered by Circle · Arc Testnet · 5042002
        </div>
      </div>
    </div>
  );
}
