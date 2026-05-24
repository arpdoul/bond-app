import { useState } from "react";
import { sendUSDC, cctpTransfer, requestFaucet } from "./circle.js";

const CHAINS = [
  { id: "MATIC-AMOY",   label: "Polygon Amoy"    },
  { id: "ARB-SEPOLIA",  label: "Arbitrum Sepolia" },
  { id: "BASE-SEPOLIA", label: "Base Sepolia"     },
];

export default function PayPanel({ wallet, onClose }) {
  const [tab, setTab]         = useState("faucet");
  const [toAddress, setTo]    = useState("");
  const [amount, setAmount]   = useState("0.10");
  const [destChain, setDest]  = useState("MATIC-AMOY");
  const [loading, setLoading] = useState(false);
  const [result, setResult]   = useState(null);
  const [error, setError]     = useState("");

  const walletId      = wallet?.id;
  const walletAddress = wallet?.address || wallet?.id;

  const reset = () => { setResult(null); setError(""); };

  const handleSend = async () => {
    if (!toAddress || !amount) return setError("Fill in all fields");
    if (!walletId) return setError("Wallet not loaded yet — close and reconnect");
    setLoading(true); reset();
    try {
      const res = await sendUSDC(walletId, toAddress, amount);
      if (res?.data?.transaction || res?.data?.id) {
        setResult({ txId: res.data.transaction?.id || res.data.id, type: "transfer" });
      } else {
        setError(res?.message || res?.error || JSON.stringify(res));
      }
    } catch(e) { setError(e.message); }
    finally { setLoading(false); }
  };

  const handleCCTP = async () => {
    if (!toAddress || !amount) return setError("Fill in all fields");
    if (!walletId) return setError("Wallet not loaded yet — close and reconnect");
    setLoading(true); reset();
    try {
      const res = await cctpTransfer(walletId, toAddress, amount, "ETH-SEPOLIA", destChain);
      if (res?.data?.transaction || res?.data?.id) {
        setResult({ txId: res.data.transaction?.id || res.data.id, type: "cctp" });
      } else {
        setError(res?.message || res?.error || JSON.stringify(res));
      }
    } catch(e) { setError(e.message); }
    finally { setLoading(false); }
  };

  const handleFaucet = async () => {
    if (!walletAddress) return setError("Wallet not loaded yet — close and reconnect");
    setLoading(true); reset();
    try {
      const res = await requestFaucet(walletAddress);
      if (res?.data || res?.requestId) {
        setResult({ type: "faucet" });
      } else {
        setError(res?.message || res?.error || JSON.stringify(res));
      }
    } catch(e) { setError(e.message); }
    finally { setLoading(false); }
  };

  const S = {
    overlay: { position:"fixed",inset:0,zIndex:200,background:"rgba(0,0,0,0.9)",display:"flex",alignItems:"center",justifyContent:"center",padding:20 },
    box: { background:"#0f0f0f",border:"1px solid #1f1f1f",borderRadius:16,padding:28,width:"100%",maxWidth:380 },
    input: { background:"rgba(255,255,255,0.04)",border:"1px solid #1f1f1f",borderRadius:8,color:"#fff",fontSize:13,padding:"10px 14px",width:"100%",outline:"none",marginBottom:10,boxSizing:"border-box" },
    label: { fontSize:11,color:"#444",textTransform:"uppercase",letterSpacing:"0.08em",display:"block",marginBottom:6 },
    tabBtn: (active) => ({ background:active?"rgba(0,255,178,0.08)":"none",border:"none",cursor:"pointer",fontSize:11,fontWeight:600,letterSpacing:"0.06em",textTransform:"uppercase",padding:"8px 12px",borderRadius:6,color:active?"#00FFB2":"#444" }),
  };

  return (
    <div style={S.overlay}>
      <div style={S.box}>
        <div style={{display:"flex",justifyContent:"space-between",marginBottom:20}}>
          <div style={{fontSize:15,fontWeight:700,color:"#fff"}}>Agent Payment Console</div>
          <button onClick={onClose} style={{background:"none",border:"none",color:"#444",fontSize:20,cursor:"pointer"}}>×</button>
        </div>

        {/* Wallet status */}
        <div style={{background:"rgba(0,255,178,0.05)",border:`1px solid ${walletId?"#00FFB222":"#FF6B3522"}`,borderRadius:8,padding:"10px 14px",marginBottom:18}}>
          <div style={{fontSize:10,color:"#444",textTransform:"uppercase",marginBottom:4}}>Connected Wallet</div>
          {walletId
            ? <div style={{fontSize:11,color:"#00FFB2",fontFamily:"monospace",wordBreak:"break-all"}}>{walletAddress}</div>
            : <div style={{fontSize:11,color:"#FF6B35"}}>No wallet — connect wallet first</div>
          }
        </div>

        {/* Tabs */}
        <div style={{display:"flex",gap:4,marginBottom:20,borderBottom:"1px solid #111",paddingBottom:10}}>
          <button style={S.tabBtn(tab==="faucet")} onClick={()=>{setTab("faucet");reset();}}>Get USDC</button>
          <button style={S.tabBtn(tab==="send")}   onClick={()=>{setTab("send");reset();}}>Send USDC</button>
          <button style={S.tabBtn(tab==="cctp")}   onClick={()=>{setTab("cctp");reset();}}>Cross-Chain</button>
        </div>

        {/* FAUCET TAB — shown first */}
        {tab==="faucet" && (
          <div>
            <div style={{fontSize:12,color:"#555",marginBottom:16,lineHeight:1.7}}>
              Request free testnet USDC to your wallet on ETH Sepolia. Do this first before sending.
            </div>
            <div style={{background:"rgba(255,255,255,0.02)",border:"1px solid #1a1a1a",borderRadius:8,padding:"12px 14px",marginBottom:16}}>
              <div style={{fontSize:10,color:"#444",marginBottom:4}}>Receiving wallet</div>
              <div style={{fontSize:11,color:"#fff",fontFamily:"monospace",wordBreak:"break-all"}}>{walletAddress || "No wallet connected"}</div>
            </div>
            <button
              onClick={handleFaucet}
              disabled={loading || !walletId}
              style={{width:"100%",padding:"13px",background:walletId?"#FF6B35":"#333",border:"none",color:"#fff",borderRadius:8,fontSize:13,fontWeight:700,letterSpacing:"0.08em",textTransform:"uppercase",cursor:walletId?"pointer":"not-allowed"}}>
              {loading ? "Requesting..." : "◎ Request Testnet USDC"}
            </button>
          </div>
        )}

        {/* SEND TAB */}
        {tab==="send" && (
          <div>
            <label style={S.label}>Destination Address</label>
            <input style={S.input} placeholder="0x..." value={toAddress} onChange={e=>setTo(e.target.value)}/>
            <label style={S.label}>Amount (USDC)</label>
            <input style={S.input} type="number" placeholder="0.10" value={amount} onChange={e=>setAmount(e.target.value)}/>
            <button
              onClick={handleSend}
              disabled={loading || !walletId}
              style={{width:"100%",padding:"13px",background:walletId?"#00FFB2":"#333",border:"none",color:walletId?"#080808":"#666",borderRadius:8,fontSize:13,fontWeight:700,letterSpacing:"0.08em",textTransform:"uppercase",cursor:walletId?"pointer":"not-allowed"}}>
              {loading ? "Sending..." : "▶ Send USDC"}
            </button>
          </div>
        )}

        {/* CCTP TAB */}
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
            <button
              onClick={handleCCTP}
              disabled={loading || !walletId}
              style={{width:"100%",padding:"13px",background:walletId?"#A78BFA":"#333",border:"none",color:"#fff",borderRadius:8,fontSize:13,fontWeight:700,letterSpacing:"0.08em",textTransform:"uppercase",cursor:walletId?"pointer":"not-allowed"}}>
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
              {result.type==="faucet"?"USDC arrives in ~30 seconds. Refresh balance.":"May take 1-2 mins to confirm onchain."}
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

        <div style={{textAlign:"center",marginTop:16,fontSize:10,color:"#222"}}>
          Secured by Circle · ETH Sepolia Testnet
        </div>
      </div>
    </div>
  );
}
