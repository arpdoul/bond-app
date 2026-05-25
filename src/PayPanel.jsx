import { useState } from "react";
import { sendUSDC, cctpTransfer, requestFaucet } from "./circle.js";

const CHAINS = [
  { id: "MATIC-AMOY",   label: "Polygon Amoy"    },
  { id: "ARB-SEPOLIA",  label: "Arbitrum Sepolia" },
  { id: "BASE-SEPOLIA", label: "Base Sepolia"     },
];

export default function PayPanel({ onClose }) {
  // Read wallet directly from localStorage — always up to date
  const walletId      = localStorage.getItem("bond_wid")   || "";
  const walletAddress = localStorage.getItem("bond_waddr") || "";

  const [tab, setTab]         = useState("faucet");
  const [toAddress, setTo]    = useState("");
  const [amount, setAmount]   = useState("0.10");
  const [destChain, setDest]  = useState("MATIC-AMOY");
  const [loading, setLoading] = useState(false);
  const [result, setResult]   = useState(null);
  const [error, setError]     = useState("");

  const reset = () => { setResult(null); setError(""); };

  const guard = () => {
    if (!walletId) {
      setError("No wallet found. Close this, connect your wallet first, then try again.");
      return false;
    }
    return true;
  };

  const handleSend = async () => {
    if (!guard()) return;
    if (!toAddress || !amount) return setError("Fill in all fields");
    setLoading(true); reset();
    try {
      const res = await sendUSDC(walletId, toAddress, amount);
      if (res?.data?.transaction || res?.data?.id) {
        setResult({ txId: res.data?.transaction?.id || res.data?.id, type: "transfer" });
      } else {
        setError(res?.message || res?.error || JSON.stringify(res));
      }
    } catch(e) { setError(e.message); }
    finally { setLoading(false); }
  };

  const handleCCTP = async () => {
    if (!guard()) return;
    if (!toAddress || !amount) return setError("Fill in all fields");
    setLoading(true); reset();
    try {
      const res = await cctpTransfer(walletId, toAddress, amount, "ETH-SEPOLIA", destChain);
      if (res?.data?.transaction || res?.data?.id) {
        setResult({ txId: res.data?.transaction?.id || res.data?.id, type: "cctp" });
      } else {
        setError(res?.message || res?.error || JSON.stringify(res));
      }
    } catch(e) { setError(e.message); }
    finally { setLoading(false); }
  };

  const [faucetLinks, setFaucetLinks] = useState([]);

  const handleFaucet = async () => {
    if (!guard()) return;
    setLoading(true); reset(); setFaucetLinks([]);
    try {
      const res = await requestFaucet(walletAddress);
      if (res?.fallback) {
        // Show direct faucet links
        setFaucetLinks(res.links || []);
        setError(res.message || "Use direct faucet links below");
      } else if (res?.data || res?.requestId || res?.id) {
        setResult({ type: "faucet" });
      } else {
        setError(res?.message || res?.error || JSON.stringify(res));
      }
    } catch(e) { setError(e.message); }
    finally { setLoading(false); }
  };

  const S = {
    overlay: { position:"fixed",inset:0,zIndex:200,background:"rgba(0,0,0,0.92)",display:"flex",alignItems:"center",justifyContent:"center",padding:20 },
    box:     { background:"#0f0f0f",border:"1px solid #1f1f1f",borderRadius:16,padding:24,width:"100%",maxWidth:380 },
    input:   { background:"rgba(255,255,255,0.04)",border:"1px solid #1f1f1f",borderRadius:8,color:"#fff",fontSize:13,padding:"10px 14px",width:"100%",outline:"none",marginBottom:10,boxSizing:"border-box" },
    label:   { fontSize:11,color:"#444",textTransform:"uppercase",letterSpacing:"0.08em",display:"block",marginBottom:6 },
    tab:     (a) => ({ background:a?"rgba(0,255,178,0.08)":"none",border:"none",cursor:"pointer",fontSize:11,fontWeight:600,letterSpacing:"0.06em",textTransform:"uppercase",padding:"8px 12px",borderRadius:6,color:a?"#00FFB2":"#444" }),
    btn:     (c,on) => ({ width:"100%",padding:"13px",background:on?c:"#222",border:"none",color:on?(c==="#00FFB2"?"#080808":"#fff"):"#555",borderRadius:8,fontSize:13,fontWeight:700,letterSpacing:"0.08em",textTransform:"uppercase",cursor:on?"pointer":"not-allowed",marginTop:4 }),
  };

  const hasWallet = !!walletId;

  return (
    <div style={S.overlay}>
      <div style={S.box}>
        {/* Header */}
        <div style={{display:"flex",justifyContent:"space-between",marginBottom:20}}>
          <div style={{fontSize:15,fontWeight:700,color:"#fff"}}>Agent Payment Console</div>
          <button onClick={onClose} style={{background:"none",border:"none",color:"#444",fontSize:20,cursor:"pointer"}}>×</button>
        </div>

        {/* Wallet status */}
        <div style={{background:"rgba(0,255,178,0.05)",border:`1px solid ${hasWallet?"#00FFB222":"#FF6B3544"}`,borderRadius:8,padding:"10px 14px",marginBottom:18}}>
          <div style={{fontSize:10,color:"#444",textTransform:"uppercase",marginBottom:4}}>Connected Wallet</div>
          {hasWallet
            ? <div style={{fontSize:11,color:"#00FFB2",fontFamily:"monospace",wordBreak:"break-all"}}>{walletAddress}</div>
            : <div style={{fontSize:12,color:"#FF6B35",fontWeight:600}}>No wallet — tap × and connect wallet first</div>
          }
        </div>

        {/* Tabs */}
        <div style={{display:"flex",gap:4,marginBottom:20,borderBottom:"1px solid #111",paddingBottom:10}}>
          <button style={S.tab(tab==="faucet")} onClick={()=>{setTab("faucet");reset();}}>Get USDC</button>
          <button style={S.tab(tab==="send")}   onClick={()=>{setTab("send");reset();}}>Send</button>
          <button style={S.tab(tab==="cctp")}   onClick={()=>{setTab("cctp");reset();}}>Cross-Chain</button>
        </div>

        {/* FAUCET */}
        {tab==="faucet" && (
          <div>
            <div style={{fontSize:12,color:"#555",marginBottom:16,lineHeight:1.7}}>
              Get free testnet USDC sent to your wallet on ETH Sepolia. Do this first before sending.
            </div>
            <div style={{background:"rgba(255,255,255,0.02)",border:"1px solid #1a1a1a",borderRadius:8,padding:"12px 14px",marginBottom:16}}>
              <div style={{fontSize:10,color:"#444",marginBottom:4}}>Your wallet receives</div>
              <div style={{fontSize:11,color:hasWallet?"#fff":"#FF6B35",fontFamily:"monospace",wordBreak:"break-all"}}>
                {hasWallet ? walletAddress : "No wallet — connect first"}
              </div>
            </div>
            <button style={S.btn("#FF6B35", hasWallet)} onClick={handleFaucet} disabled={loading||!hasWallet}>
              {loading ? "Requesting..." : "◎ Request Testnet USDC"}
            </button>
          </div>
        )}

        {/* SEND */}
        {tab==="send" && (
          <div>
            <label style={S.label}>Destination Address</label>
            <input style={S.input} placeholder="0x..." value={toAddress} onChange={e=>setTo(e.target.value)}/>
            <label style={S.label}>Amount (USDC)</label>
            <input style={S.input} type="number" placeholder="0.10" value={amount} onChange={e=>setAmount(e.target.value)}/>
            <button style={S.btn("#00FFB2", hasWallet)} onClick={handleSend} disabled={loading||!hasWallet}>
              {loading ? "Sending..." : "▶ Send USDC"}
            </button>
          </div>
        )}

        {/* CCTP */}
        {tab==="cctp" && (
          <div>
            <label style={S.label}>Destination Address</label>
            <input style={S.input} placeholder="0x..." value={toAddress} onChange={e=>setTo(e.target.value)}/>
            <label style={S.label}>Amount (USDC)</label>
            <input style={S.input} type="number" placeholder="0.10" value={amount} onChange={e=>setAmount(e.target.value)}/>
            <label style={S.label}>Destination Chain</label>
            <select style={{...S.input,marginBottom:12}} value={destChain} onChange={e=>setDest(e.target.value)}>
              {CHAINS.map(c=><option key={c.id} value={c.id}>{c.label}</option>)}
            </select>
            <button style={S.btn("#A78BFA", hasWallet)} onClick={handleCCTP} disabled={loading||!hasWallet}>
              {loading ? "Bridging..." : "⇄ Bridge via CCTP"}
            </button>
          </div>
        )}

        {/* Result */}
        {result && (
          <div style={{marginTop:16,padding:14,background:"rgba(0,255,178,0.06)",border:"1px solid #00FFB233",borderRadius:8}}>
            <div style={{fontSize:12,color:"#00FFB2",fontWeight:700,marginBottom:6}}>
              {result.type==="faucet"?"✓ USDC Requested!":result.type==="cctp"?"✓ Bridge Initiated!":"✓ Transfer Submitted!"}
            </div>
            {result.txId && <div style={{fontSize:10,color:"#444",fontFamily:"monospace",wordBreak:"break-all"}}>TX: {result.txId}</div>}
            <div style={{fontSize:10,color:"#333",marginTop:6}}>
              {result.type==="faucet"?"USDC arrives in ~30 seconds":"Confirms in 1-2 mins onchain"}
            </div>
          </div>
        )}

        {/* Error */}
        {error && (
          <div style={{marginTop:16,padding:14,background:"rgba(255,107,53,0.06)",border:"1px solid #FF6B3533",borderRadius:8}}>
            <div style={{fontSize:12,color:"#FF6B35",fontWeight:600,marginBottom:4}}>Error</div>
            <div style={{fontSize:11,color:"#cc5533",lineHeight:1.5,wordBreak:"break-all"}}>{error}</div>
          </div>
        )}

        {faucetLinks.length > 0 && (
          <div style={{marginTop:12}}>
            <div style={{fontSize:11,color:"#555",marginBottom:8}}>Get USDC directly:</div>
            {faucetLinks.map((l,i) => (
              <a key={i} href={l.url} target="_blank" rel="noopener noreferrer"
                style={{display:"block",padding:"10px 14px",background:"rgba(255,107,53,0.08)",border:"1px solid #FF6B3533",borderRadius:8,color:"#FF6B35",fontSize:12,fontWeight:600,textDecoration:"none",marginBottom:6,textAlign:"center"}}>
                → {l.name}
              </a>
            ))}
            <div style={{fontSize:10,color:"#333",marginTop:8,textAlign:"center"}}>
              Copy your wallet address: <span style={{color:"#00FFB2",fontFamily:"monospace",fontSize:9,wordBreak:"break-all"}}>{walletAddress}</span>
            </div>
          </div>
        )}
        {faucetLinks.length > 0 && (
          <div style={{marginTop:12}}>
            <div style={{fontSize:11,color:"#555",marginBottom:8}}>Get USDC directly:</div>
            {faucetLinks.map((l,i) => (
              <a key={i} href={l.url} target="_blank" rel="noopener noreferrer"
                style={{display:"block",padding:"10px 14px",background:"rgba(255,107,53,0.08)",border:"1px solid #FF6B3533",borderRadius:8,color:"#FF6B35",fontSize:12,fontWeight:600,textDecoration:"none",marginBottom:6,textAlign:"center"}}>
                → {l.name}
              </a>
            ))}
            <div style={{fontSize:10,color:"#333",marginTop:8,textAlign:"center"}}>
              Copy your wallet address: <span style={{color:"#00FFB2",fontFamily:"monospace",fontSize:9,wordBreak:"break-all"}}>{walletAddress}</span>
            </div>
          </div>
        )}
        {faucetLinks.length > 0 && (
          <div style={{marginTop:12}}>
            <div style={{fontSize:11,color:"#555",marginBottom:8}}>Get USDC directly:</div>
            {faucetLinks.map((l,i) => (
              <a key={i} href={l.url} target="_blank" rel="noopener noreferrer"
                style={{display:"block",padding:"10px 14px",background:"rgba(255,107,53,0.08)",border:"1px solid #FF6B3533",borderRadius:8,color:"#FF6B35",fontSize:12,fontWeight:600,textDecoration:"none",marginBottom:6,textAlign:"center"}}>
                → {l.name}
              </a>
            ))}
            <div style={{fontSize:10,color:"#333",marginTop:8,textAlign:"center"}}>
              Copy your wallet address: <span style={{color:"#00FFB2",fontFamily:"monospace",fontSize:9,wordBreak:"break-all"}}>{walletAddress}</span>
            </div>
          </div>
        )}
        <div style={{textAlign:"center",marginTop:16,fontSize:10,color:"#222"}}>
          Secured by Circle · ETH Sepolia Testnet
        </div>
      </div>
    </div>
  );
}
