import { useState } from "react";
import { connectWallet, getUSDCBalance } from "./wallet.js";

export default function WalletModal({ onClose, onConnected, onDisconnect, isConnected, currentAddress }) {
  const [step, setStep]     = useState(isConnected ? "connected" : "select");
  const [error, setError]   = useState("");
  const [loading, setLoading] = useState(false);

  const doConnect = async (method) => {
    setLoading(true);
    setError("");
    setStep("connecting");
    try {
      let address;
      if (method === "walletconnect") {
        // Load WalletConnect via CDN
        if (!window.WalletConnectProvider) {
          await new Promise((resolve, reject) => {
            const s = document.createElement("script");
            s.src = "https://cdn.jsdelivr.net/npm/@walletconnect/web3-provider@1.8.0/dist/umd/index.min.js";
            s.onload = resolve;
            s.onerror = () => reject(new Error("Failed to load WalletConnect SDK"));
            document.head.appendChild(s);
          });
        }
        const provider = new window.WalletConnectProvider.default({
          rpc: { 5042002: "https://rpc.arc.fun" },
          chainId: 5042002,
        });
        await provider.enable();
        window.ethereum = provider;
        const accounts = await provider.request({ method: "eth_accounts" });
        address = accounts[0];
      } else {
        address = await connectWallet();
      }
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

  const handleDisconnect = () => {
    ["bond_waddr","bond_wbal","bond_wid","bond_uid","bond_utoken"].forEach(k => localStorage.removeItem(k));
    onDisconnect?.();
    onClose();
  };

  const isMobile = /Android|iPhone|iPad/i.test(navigator.userAgent);
  const hasWallet = typeof window.ethereum !== "undefined";

  return (
    <div style={{position:"fixed",inset:0,zIndex:1000,background:"rgba(0,0,0,0.9)",display:"flex",alignItems:"flex-end",justifyContent:"center"}}
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{background:"#0d0d0d",border:"1px solid #1f1f1f",borderRadius:"20px 20px 0 0",padding:"24px 20px 48px",width:"100%",maxWidth:480}}>

        <div style={{width:36,height:4,background:"#2a2a2a",borderRadius:2,margin:"0 auto 20px"}}/>

        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:20}}>
          <div style={{fontSize:17,fontWeight:700,color:"#fff"}}>
            {step==="connected" ? "Wallet" : "Connect Wallet"}
          </div>
          <button onClick={onClose} style={{background:"rgba(255,255,255,0.06)",border:"none",color:"#888",width:32,height:32,borderRadius:8,cursor:"pointer",fontSize:18}}>×</button>
        </div>

        {/* CONNECTED STATE */}
        {step==="connected" && (
          <div>
            <div style={{background:"rgba(0,255,178,0.05)",border:"1px solid #00FFB222",borderRadius:12,padding:"16px",marginBottom:20}}>
              <div style={{fontSize:10,color:"#444",textTransform:"uppercase",marginBottom:8}}>Connected Wallet</div>
              <div style={{fontSize:13,color:"#00FFB2",fontFamily:"monospace",marginBottom:4,wordBreak:"break-all"}}>{currentAddress}</div>
              <div style={{fontSize:10,color:"#444",marginTop:6}}>Arc Testnet · 5042002</div>
            </div>

            <div style={{background:"rgba(255,255,255,0.02)",border:"1px solid #141414",borderRadius:12,padding:"14px 16px",marginBottom:20}}>
              <div style={{fontSize:10,color:"#444",textTransform:"uppercase",marginBottom:6}}>USDC Balance</div>
              <div style={{fontSize:24,fontWeight:700,color:"#00FFB2",fontFamily:"monospace"}}>
                {localStorage.getItem("bond_wbal") || "0.0000"} USDC
              </div>
            </div>

            <div style={{display:"flex",flexDirection:"column",gap:8}}>
              <button onClick={() => {
                  getUSDCBalance(currentAddress).then(bal => {
                    localStorage.setItem("bond_wbal", bal);
                    setStep("refreshed");
                    setTimeout(() => setStep("connected"), 1000);
                  });
                }}
                style={{width:"100%",padding:"13px",background:"rgba(0,255,178,0.08)",border:"1px solid #00FFB233",color:"#00FFB2",borderRadius:10,fontSize:13,fontWeight:600,cursor:"pointer"}}>
                ↻ Refresh Balance
              </button>
              <button onClick={handleDisconnect}
                style={{width:"100%",padding:"13px",background:"rgba(255,107,53,0.08)",border:"1px solid #FF6B3533",color:"#FF6B35",borderRadius:10,fontSize:13,fontWeight:600,cursor:"pointer"}}>
                ⏻ Disconnect Wallet
              </button>
            </div>
          </div>
        )}

        {step==="refreshed" && (
          <div style={{textAlign:"center",padding:"20px 0",color:"#00FFB2",fontSize:14,fontWeight:600}}>✓ Balance refreshed!</div>
        )}

        {/* SELECT STATE */}
        {step==="select" && (
          <div>
            <div style={{display:"flex",alignItems:"center",gap:8,padding:"10px 14px",background:"rgba(0,255,178,0.05)",border:"1px solid #00FFB222",borderRadius:10,marginBottom:20}}>
              <div style={{width:8,height:8,borderRadius:"50%",background:"#00FFB2",boxShadow:"0 0 6px #00FFB2"}}/>
              <span style={{fontSize:12,color:"#00FFB2",fontWeight:600}}>Arc Testnet · Chain 5042002</span>
            </div>

            {/* WalletConnect - works in ANY browser */}
            <div style={{marginBottom:16}}>
              <div style={{fontSize:10,color:"#444",textTransform:"uppercase",letterSpacing:"0.08em",marginBottom:8}}>Works in any browser</div>
              <button onClick={() => doConnect("walletconnect")}
                style={{display:"flex",alignItems:"center",gap:14,padding:"16px",background:"rgba(61,133,198,0.08)",border:"1px solid #3D85C633",borderRadius:12,cursor:"pointer",width:"100%",textAlign:"left"}}>
                <div style={{width:36,height:36,borderRadius:10,background:"linear-gradient(135deg,#3D85C6,#6B4EFF)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:18}}>🔗</div>
                <div style={{flex:1}}>
                  <div style={{fontSize:14,fontWeight:700,color:"#fff"}}>WalletConnect</div>
                  <div style={{fontSize:11,color:"#555"}}>Scan QR · MetaMask · Trust · Rainbow · Any wallet</div>
                </div>
                <span style={{color:"#3D85C6",fontSize:11,fontWeight:600}}>RECOMMENDED</span>
              </button>
            </div>

            {/* Injected wallets */}
            <div style={{marginBottom:16}}>
              <div style={{fontSize:10,color:"#444",textTransform:"uppercase",letterSpacing:"0.08em",marginBottom:8}}>Browser wallets</div>
              <div style={{display:"flex",flexDirection:"column",gap:6}}>
                {hasWallet && (
                  <button onClick={() => doConnect("injected")}
                    style={{display:"flex",alignItems:"center",gap:14,padding:"14px 16px",background:"rgba(255,255,255,0.03)",border:"1px solid #1a1a1a",borderRadius:12,cursor:"pointer",width:"100%",textAlign:"left"}}>
                    <span style={{fontSize:22}}>🦊</span>
                    <div>
                      <div style={{fontSize:14,fontWeight:600,color:"#fff"}}>Browser Wallet</div>
                      <div style={{fontSize:11,color:"#444"}}>MetaMask / Coinbase / Injected</div>
                    </div>
                    <span style={{marginLeft:"auto",color:"#333",fontSize:18}}>›</span>
                  </button>
                )}

                {!hasWallet && isMobile && (
                  <div>
                    <div style={{fontSize:11,color:"#555",marginBottom:8}}>Open BOND in your wallet browser:</div>
                    {[
                      {name:"MetaMask",    icon:"🦊", url:`https://metamask.app.link/dapp/bond-app-rho.vercel.app`},
                      {name:"Trust Wallet",icon:"🛡️", url:`https://link.trustwallet.com/open_url?coin_id=60&url=https://bond-app-rho.vercel.app`},
                      {name:"Coinbase",    icon:"🔵", url:`https://go.cb-w.com/dapp?cb_url=https://bond-app-rho.vercel.app`},
                    ].map((w,i)=>(
                      <a key={i} href={w.url} target="_blank" rel="noopener noreferrer"
                        style={{display:"flex",alignItems:"center",gap:12,padding:"12px 14px",background:"rgba(255,255,255,0.02)",border:"1px solid #1a1a1a",borderRadius:10,marginBottom:6,textDecoration:"none"}}>
                        <span style={{fontSize:20}}>{w.icon}</span>
                        <span style={{fontSize:13,color:"#888"}}>Open in {w.name}</span>
                        <span style={{marginLeft:"auto",color:"#333",fontSize:14}}>›</span>
                      </a>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div style={{textAlign:"center",fontSize:11,color:"#2a2a2a"}}>Non-custodial · Your keys · Arc Testnet</div>
          </div>
        )}

        {/* CONNECTING */}
        {step==="connecting" && (
          <div style={{textAlign:"center",padding:"40px 0"}}>
            <div style={{fontSize:44,marginBottom:16}}>🔗</div>
            <div style={{fontSize:15,color:"#fff",fontWeight:600,marginBottom:8}}>Connecting...</div>
            <div style={{fontSize:12,color:"#444"}}>Approve in your wallet</div>
          </div>
        )}

        {/* BALANCE */}
        {step==="balance" && (
          <div style={{textAlign:"center",padding:"40px 0"}}>
            <div style={{fontSize:44,marginBottom:16}}>⛓️</div>
            <div style={{fontSize:15,color:"#fff",fontWeight:600,marginBottom:8}}>Switching to Arc Testnet...</div>
            <div style={{fontSize:12,color:"#444"}}>Fetching USDC balance</div>
          </div>
        )}

        {/* DONE */}
        {step==="done" && (
          <div style={{textAlign:"center",padding:"32px 0"}}>
            <div style={{fontSize:48,marginBottom:12}}>✅</div>
            <div style={{fontSize:15,color:"#00FFB2",fontWeight:700,marginBottom:6}}>Connected!</div>
            <div style={{fontSize:12,color:"#555"}}>{localStorage.getItem("bond_waddr")?.slice(0,14)}...</div>
            <div style={{fontSize:20,color:"#00FFB2",fontWeight:700,marginTop:8,fontFamily:"monospace"}}>
              {localStorage.getItem("bond_wbal")} USDC
            </div>
          </div>
        )}

        {/* ERROR */}
        {step==="error" && (
          <div>
            <div style={{padding:14,background:"rgba(255,107,53,0.08)",border:"1px solid #FF6B3533",borderRadius:10,marginBottom:16}}>
              <div style={{fontSize:13,color:"#FF6B35",fontWeight:600,marginBottom:6}}>Failed</div>
              <div style={{fontSize:12,color:"#cc5533",lineHeight:1.5}}>{error}</div>
            </div>
            <button onClick={()=>setStep("select")}
              style={{width:"100%",padding:"14px",background:"#00FFB2",border:"none",color:"#080808",borderRadius:10,fontSize:13,fontWeight:700,cursor:"pointer"}}>
              Try Again
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
