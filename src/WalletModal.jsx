import { useState } from "react";
import { connectWallet, getUSDCBalance, ARC_TESTNET } from "./wallet.js";

const WALLETS = [
  { id: "metamask",  name: "MetaMask",        icon: "🦊", desc: "Browser extension" },
  { id: "trust",     name: "Trust Wallet",     icon: "🛡️", desc: "Mobile wallet"     },
  { id: "coinbase",  name: "Coinbase Wallet",  icon: "🔵", desc: "Browser extension" },
  { id: "injected",  name: "Other Wallet",     icon: "🔗", desc: "Any injected wallet" },
];

export default function WalletModal({ onClose, onConnected }) {
  const [step, setStep]       = useState("select");
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState("");

  const handleConnect = async () => {
    setLoading(true);
    setError("");
    setStep("connecting");
    try {
      const address = await connectWallet();
      setStep("switching");
      const balance = await getUSDCBalance(address);

      // Save to localStorage
      localStorage.setItem("bond_waddr", address);
      localStorage.setItem("bond_wbal",  balance);
      localStorage.setItem("bond_wid",   address);

      setStep("done");
      setTimeout(() => onConnected({
        wallet: { address, id: address },
        balance,
      }), 600);
    } catch(e) {
      setStep("error");
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{position:"fixed",inset:0,zIndex:1000,background:"rgba(0,0,0,0.88)",display:"flex",alignItems:"flex-end",justifyContent:"center",padding:"0 0 0 0"}}>
      <div style={{background:"#0d0d0d",border:"1px solid #1f1f1f",borderRadius:"20px 20px 0 0",padding:"28px 24px 40px",width:"100%",maxWidth:480,animation:"slideUp 0.3s ease"}}>
        <style>{`@keyframes slideUp { from { transform: translateY(100%); } to { transform: translateY(0); } }`}</style>

        {/* Handle bar */}
        <div style={{width:40,height:4,background:"#2a2a2a",borderRadius:2,margin:"0 auto 24px"}}/>

        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:24}}>
          <div style={{fontSize:18,fontWeight:700,color:"#fff"}}>Connect Wallet</div>
          <button onClick={onClose} style={{background:"rgba(255,255,255,0.06)",border:"none",color:"#888",fontSize:16,cursor:"pointer",width:32,height:32,borderRadius:8,display:"flex",alignItems:"center",justifyContent:"center"}}>×</button>
        </div>

        {step === "select" && (
          <>
            <div style={{fontSize:12,color:"#444",marginBottom:20,lineHeight:1.6}}>
              Connect your existing Web3 wallet. Your keys, your funds — BOND never has custody.
            </div>

            {/* Network badge */}
            <div style={{display:"flex",alignItems:"center",gap:8,padding:"10px 14px",background:"rgba(0,255,178,0.05)",border:"1px solid #00FFB222",borderRadius:10,marginBottom:20}}>
              <div style={{width:8,height:8,borderRadius:"50%",background:"#00FFB2",boxShadow:"0 0 6px #00FFB2"}}/>
              <span style={{fontSize:12,color:"#00FFB2",fontWeight:600}}>Arc Testnet · Chain 5042002</span>
              <span style={{fontSize:10,color:"#444",marginLeft:"auto"}}>Will auto-switch</span>
            </div>

            {/* Wallet options */}
            <div style={{display:"flex",flexDirection:"column",gap:8,marginBottom:24}}>
              {WALLETS.map(w => (
                <button key={w.id} onClick={handleConnect}
                  style={{display:"flex",alignItems:"center",gap:14,padding:"14px 16px",background:"rgba(255,255,255,0.03)",border:"1px solid #1a1a1a",borderRadius:12,cursor:"pointer",transition:"all 0.2s",width:"100%",textAlign:"left"}}>
                  <span style={{fontSize:24}}>{w.icon}</span>
                  <div>
                    <div style={{fontSize:14,fontWeight:600,color:"#fff"}}>{w.name}</div>
                    <div style={{fontSize:11,color:"#444"}}>{w.desc}</div>
                  </div>
                  <span style={{marginLeft:"auto",color:"#333",fontSize:16}}>›</span>
                </button>
              ))}
            </div>

            <div style={{textAlign:"center",fontSize:11,color:"#2a2a2a"}}>
              Non-custodial · You own your keys · Arc Testnet
            </div>
          </>
        )}

        {step === "connecting" && (
          <div style={{textAlign:"center",padding:"40px 0"}}>
            <div style={{fontSize:40,marginBottom:16}}>🔗</div>
            <div style={{fontSize:15,color:"#fff",fontWeight:600,marginBottom:8}}>Connecting...</div>
            <div style={{fontSize:12,color:"#444"}}>Approve in your wallet</div>
          </div>
        )}

        {step === "switching" && (
          <div style={{textAlign:"center",padding:"40px 0"}}>
            <div style={{fontSize:40,marginBottom:16}}>⛓️</div>
            <div style={{fontSize:15,color:"#fff",fontWeight:600,marginBottom:8}}>Switching to Arc Testnet</div>
            <div style={{fontSize:12,color:"#444"}}>Adding network if needed...</div>
          </div>
        )}

        {step === "done" && (
          <div style={{textAlign:"center",padding:"40px 0"}}>
            <div style={{fontSize:48,marginBottom:12}}>✓</div>
            <div style={{fontSize:15,color:"#00FFB2",fontWeight:700,marginBottom:6}}>Connected!</div>
            <div style={{fontSize:12,color:"#444"}}>
              {localStorage.getItem("bond_waddr")?.slice(0,10)}... on Arc Testnet
            </div>
          </div>
        )}

        {step === "error" && (
          <div>
            <div style={{padding:16,background:"rgba(255,107,53,0.08)",border:"1px solid #FF6B3533",borderRadius:10,marginBottom:16}}>
              <div style={{fontSize:13,color:"#FF6B35",fontWeight:600,marginBottom:6}}>Connection Failed</div>
              <div style={{fontSize:12,color:"#cc5533",lineHeight:1.5}}>{error}</div>
              {error.includes("No wallet") && (
                <div style={{marginTop:12}}>
                  <a href="https://metamask.io/download/" target="_blank" rel="noopener noreferrer"
                    style={{display:"block",padding:"10px 14px",background:"rgba(255,255,255,0.04)",border:"1px solid #222",borderRadius:8,color:"#888",fontSize:12,textDecoration:"none",textAlign:"center"}}>
                    Install MetaMask →
                  </a>
                </div>
              )}
            </div>
            <button onClick={handleConnect}
              style={{width:"100%",padding:"14px",background:"#00FFB2",border:"none",color:"#080808",borderRadius:10,fontSize:13,fontWeight:700,cursor:"pointer"}}>
              Try Again
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
