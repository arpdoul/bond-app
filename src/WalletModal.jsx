import { useState } from "react";
import { connectWallet, getUSDCBalance } from "./wallet.js";

export default function WalletModal({ onClose, onConnected }) {
  const [step, setStep]     = useState("select");
  const [error, setError]   = useState("");
  const [loading, setLoading] = useState(false);

  const handleConnect = async () => {
    setLoading(true);
    setError("");
    setStep("connecting");
    try {
      const address = await connectWallet();
      setStep("balance");
      const balance = await getUSDCBalance(address);
      localStorage.setItem("bond_waddr", address);
      localStorage.setItem("bond_wbal",  balance);
      localStorage.setItem("bond_wid",   address);
      setStep("done");
      setTimeout(() => onConnected({ wallet: { address, id: address }, balance }), 700);
    } catch(e) {
      setStep("error");
      setError(e.message || "Connection failed");
    } finally {
      setLoading(false);
    }
  };

  const isMobile = /Android|iPhone|iPad/i.test(navigator.userAgent);
  const hasWallet = typeof window.ethereum !== "undefined";

  return (
    <div style={{position:"fixed",inset:0,zIndex:1000,background:"rgba(0,0,0,0.9)",display:"flex",alignItems:"flex-end",justifyContent:"center"}}>
      <div style={{background:"#0d0d0d",border:"1px solid #1f1f1f",borderRadius:"20px 20px 0 0",padding:"24px 20px 44px",width:"100%",maxWidth:480}}>

        {/* Handle */}
        <div style={{width:36,height:4,background:"#2a2a2a",borderRadius:2,margin:"0 auto 20px"}}/>

        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:20}}>
          <div style={{fontSize:17,fontWeight:700,color:"#fff"}}>Connect Wallet</div>
          <button onClick={onClose} style={{background:"rgba(255,255,255,0.06)",border:"none",color:"#888",width:32,height:32,borderRadius:8,cursor:"pointer",fontSize:18}}>×</button>
        </div>

        {/* Arc badge */}
        <div style={{display:"flex",alignItems:"center",gap:8,padding:"10px 14px",background:"rgba(0,255,178,0.05)",border:"1px solid #00FFB222",borderRadius:10,marginBottom:20}}>
          <div style={{width:8,height:8,borderRadius:"50%",background:"#00FFB2",boxShadow:"0 0 6px #00FFB2"}}/>
          <span style={{fontSize:12,color:"#00FFB2",fontWeight:600}}>Arc Testnet · Chain 5042002</span>
          <span style={{fontSize:10,color:"#444",marginLeft:"auto"}}>Auto-switch</span>
        </div>

        {/* SELECT */}
        {step==="select" && (
          <div>
            {!hasWallet && isMobile && (
              <div style={{padding:"12px 14px",background:"rgba(255,215,0,0.06)",border:"1px solid #FFD70033",borderRadius:10,marginBottom:16,fontSize:12,color:"#FFD700",lineHeight:1.6}}>
                ⚠️ No wallet detected. Open this app inside MetaMask Browser or install a Web3 wallet.
              </div>
            )}
            <div style={{display:"flex",flexDirection:"column",gap:8,marginBottom:20}}>
              {[
                {name:"MetaMask",       icon:"🦊", desc:"Most popular Web3 wallet",    deep:"https://metamask.app.link/dapp/bond-app-rho.vercel.app"},
                {name:"Trust Wallet",   icon:"🛡️", desc:"Mobile-first crypto wallet",  deep:"https://link.trustwallet.com/open_url?coin_id=60&url=https://bond-app-rho.vercel.app"},
                {name:"Coinbase Wallet",icon:"🔵", desc:"Easy to use Web3 wallet",     deep:"https://go.cb-w.com/dapp?cb_url=https://bond-app-rho.vercel.app"},
                {name:"Browser Wallet", icon:"🔗", desc:"Any injected wallet",         deep:null},
              ].map((w,i) => (
                <button key={i}
                  onClick={w.deep && !hasWallet && isMobile ? ()=>window.open(w.deep,"_blank") : handleConnect}
                  style={{display:"flex",alignItems:"center",gap:14,padding:"14px 16px",background:"rgba(255,255,255,0.03)",border:"1px solid #1a1a1a",borderRadius:12,cursor:"pointer",width:"100%",textAlign:"left"}}>
                  <span style={{fontSize:22}}>{w.icon}</span>
                  <div style={{flex:1}}>
                    <div style={{fontSize:14,fontWeight:600,color:"#fff"}}>{w.name}</div>
                    <div style={{fontSize:11,color:"#444"}}>{w.desc}</div>
                  </div>
                  <span style={{color:"#333",fontSize:18}}>›</span>
                </button>
              ))}
            </div>
            <div style={{textAlign:"center",fontSize:11,color:"#2a2a2a"}}>Non-custodial · Your keys · Arc Testnet</div>
          </div>
        )}

        {/* CONNECTING */}
        {step==="connecting" && (
          <div style={{textAlign:"center",padding:"40px 0"}}>
            <div style={{fontSize:44,marginBottom:16}}>🔗</div>
            <div style={{fontSize:15,color:"#fff",fontWeight:600,marginBottom:8}}>Waiting for approval...</div>
            <div style={{fontSize:12,color:"#444"}}>Approve the connection in your wallet</div>
          </div>
        )}

        {/* BALANCE */}
        {step==="balance" && (
          <div style={{textAlign:"center",padding:"40px 0"}}>
            <div style={{fontSize:44,marginBottom:16}}>⛓️</div>
            <div style={{fontSize:15,color:"#fff",fontWeight:600,marginBottom:8}}>Switching to Arc Testnet...</div>
            <div style={{fontSize:12,color:"#444"}}>Fetching your USDC balance</div>
          </div>
        )}

        {/* DONE */}
        {step==="done" && (
          <div style={{textAlign:"center",padding:"32px 0"}}>
            <div style={{fontSize:48,marginBottom:12}}>✅</div>
            <div style={{fontSize:15,color:"#00FFB2",fontWeight:700,marginBottom:6}}>Connected!</div>
            <div style={{fontSize:12,color:"#555"}}>{localStorage.getItem("bond_waddr")?.slice(0,14)}...</div>
            <div style={{fontSize:18,color:"#00FFB2",fontWeight:700,marginTop:8,fontFamily:"monospace"}}>
              {localStorage.getItem("bond_wbal")} USDC
            </div>
          </div>
        )}

        {/* ERROR */}
        {step==="error" && (
          <div>
            <div style={{padding:14,background:"rgba(255,107,53,0.08)",border:"1px solid #FF6B3533",borderRadius:10,marginBottom:16}}>
              <div style={{fontSize:13,color:"#FF6B35",fontWeight:600,marginBottom:6}}>Connection Failed</div>
              <div style={{fontSize:12,color:"#cc5533",lineHeight:1.5}}>{error}</div>
              {error.includes("No Web3") && (
                <div style={{marginTop:12,display:"flex",flexDirection:"column",gap:6}}>
                  <a href="https://metamask.app.link/dapp/bond-app-rho.vercel.app" target="_blank" rel="noopener noreferrer"
                    style={{display:"block",padding:"10px",background:"rgba(255,255,255,0.04)",border:"1px solid #222",borderRadius:8,color:"#fff",fontSize:12,textDecoration:"none",textAlign:"center"}}>
                    🦊 Open in MetaMask Browser
                  </a>
                  <a href="https://link.trustwallet.com/open_url?coin_id=60&url=https://bond-app-rho.vercel.app" target="_blank" rel="noopener noreferrer"
                    style={{display:"block",padding:"10px",background:"rgba(255,255,255,0.04)",border:"1px solid #222",borderRadius:8,color:"#fff",fontSize:12,textDecoration:"none",textAlign:"center"}}>
                    🛡️ Open in Trust Wallet Browser
                  </a>
                </div>
              )}
            </div>
            <button onClick={()=>setStep("select")} style={{width:"100%",padding:"14px",background:"#00FFB2",border:"none",color:"#080808",borderRadius:10,fontSize:13,fontWeight:700,cursor:"pointer"}}>
              Try Again
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
