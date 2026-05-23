import { useState } from "react";
import { sendUSDC, cctpTransfer, requestFaucet } from "./circle.js";

const CHAINS = [
  { id: "ETH-SEPOLIA",  label: "Ethereum Sepolia" },
  { id: "MATIC-AMOY",   label: "Polygon Amoy"     },
  { id: "ARB-SEPOLIA",  label: "Arbitrum Sepolia"  },
  { id: "BASE-SEPOLIA", label: "Base Sepolia"      },
];

export default function PayPanel({ wallet, onClose }) {
  const [tab, setTab]           = useState("send");
  const [toAddress, setTo]      = useState("");
  const [amount, setAmount]     = useState("");
  const [destChain, setDest]    = useState("MATIC-AMOY");
  const [loading, setLoading]   = useState(false);
  const [result, setResult]     = useState(null);
  const [error, setError]       = useState("");

  const reset = () => { setResult(null); setError(""); };

  const handleSend = async () => {
    if (!toAddress || !amount) return setError("Fill in all fields");
    if (!wallet?.id) return setError("No wallet connected");
    setLoading(true); reset();
    try {
      const res = await sendUSDC(wallet.id, toAddress, amount);
      if (res?.data?.transaction) {
        setResult({ txId: res.data.transaction.id, type: "transfer" });
      } else {
        setError(JSON.stringify(res?.message || res?.error || res));
      }
    } catch (e) { setError(e.message); }
    finally { setLoading(false); }
  };

  const handleCCTP = async () => {
    if (!toAddress || !amount) return setError("Fill in all fields");
    if (!wallet?.id) return setError("No wallet connected");
    setLoading(true); reset();
    try {
      const res = await cctpTransfer(wallet.id, toAddress, amount, "ETH-SEPOLIA", destChain);
      if (res?.data?.transaction) {
        setResult({ txId: res.data.transaction.id, type: "cctp" });
      } else {
        setError(JSON.stringify(res?.message || res?.error || res));
      }
    } catch (e) { setError(e.message); }
    finally { setLoading(false); }
  };

  const handleFaucet = async () => {
    if (!wallet?.address) return setError("No wallet address");
    setLoading(true); reset();
    try {
      const res = await requestFaucet(wallet.address);
      if (res?.data) {
        setResult({ txId: "faucet-drip", type: "faucet" });
      } else {
        setError(JSON.stringify(res?.message || res?.error || res));
      }
    } catch (e) { setError(e.message); }
    finally { setLoading(false); }
  };

  const S = {
    overlay: { position:"fixed", inset:0, zIndex:200, background:"rgba(0,0,0,0.9)", display:"flex", alignItems:"center", justifyContent:"center", padding:20 },
    box: { background:"#0f0f0f", border:"1px solid #1f1f1f", borderRadius:16, padding:28, width:"100%", maxWidth:380 },
    input: { background:"rgba(255,255,255,0.04)", border:"1px solid #1f1f1f", borderRadius:8, color:"#fff", fontSize:13, padding:"10px 14px", width:"100%", outline:"none", marginBottom:10 },
    label: { fontSize:11, color:"#444", textTransform:"uppercase", letterSpacing:"0.08em", display:"block", marginBottom:6 },
    btn: (color) => ({ width:"100%", padding:"13px", background:color, border:"none", color: color==="#00FFB2"?"#080808":"#fff", borderRadius:8, fontSize:13, fontWeight:700, letterSpacing:"0.08em", textTransform:"uppercase", cursor:"pointer", marginTop:4 }),
    tab: (active) => ({ background:active?"rgba(0,255,178,0.08)":"none", border:"none", cursor:"pointer", fontSize:11, fontWeight:600, letterSpacing:"0.08em", textTransform:"uppercase", padding:"8px 14px", borderRadius:6, color:active?"#00FFB2":"#444" }),
  };

  return (
    <div style={S.overlay}>
      <div style={S.box}>
        <div style={{ display:"flex", justifyContent:"space-between", marginBottom:20 }}>
          <div style={{ fontSize:15, fontWeight:700, color:"#fff" }}>Agent Payment Console</div>
          <button onClick={onClose} style={{ background:"none", border:"none", color:"#444", fontSize:20, cursor:"pointer" }}>×</button>
        </div>

        {/* Wallet info */}
        <div style={{ background:"rgba(0,255,178,0.05)", border:"1px solid #00FFB222", borderRadius:8, padding:"10px 14px", marginBottom:18 }}>
          <div style={{ fontSize:10, color:"#444", textTransform:"uppercase", marginBottom:4 }}>Connected Wallet</div>
          <div style={{ fontSize:11, color:"#00FFB2", fontFamily:"monospace" }}>{wallet?.address || "No wallet"}</div>
        </div>

        {/* Tabs */}
        <div style={{ display:"flex", gap:4, marginBottom:20, borderBottom:"1px solid #111", paddingBottom:10 }}>
          {["send","cctp","faucet"].map(t => (
            <button key={t} style={S.tab(tab===t)} onClick={()=>{setTab(t);reset();}}>{t==="cctp"?"Cross-Chain":t==="faucet"?"Get USDC":t==="send"?"Send USDC":t}</button>
          ))}
        </div>

        {/* SEND TAB */}
        {tab==="send" && (
          <div>
            <label style={S.label}>Destination Address</label>
            <input style={S.input} placeholder="0x..." value={toAddress} onChange={e=>setTo(e.target.value)}/>
            <label style={S.label}>Amount (USDC)</label>
            <input style={S.input} type="number" placeholder="0.10" value={amount} onChange={e=>setAmount(e.target.value)}/>
            <button style={S.btn("#00FFB2")} onClick={handleSend} disabled={loading}>
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
            <select style={{...S.input, marginBottom:10}} value={destChain} onChange={e=>setDest(e.target.value)}>
              {CHAINS.filter(c=>c.id!=="ETH-SEPOLIA").map(c=><option key={c.id} value={c.id}>{c.label}</option>)}
            </select>
            <button style={S.btn("#A78BFA")} onClick={handleCCTP} disabled={loading}>
              {loading ? "Bridging..." : "⇄ Bridge via CCTP"}
            </button>
          </div>
        )}

        {/* FAUCET TAB */}
        {tab==="faucet" && (
          <div>
            <div style={{ fontSize:12, color:"#555", marginBottom:16, lineHeight:1.6 }}>
              Request free testnet USDC directly to your connected wallet on ETH Sepolia. Used for testing real USDC transfers.
            </div>
            <div style={{ background:"rgba(255,255,255,0.02)", border:"1px solid #1a1a1a", borderRadius:8, padding:"12px 14px", marginBottom:16 }}>
              <div style={{ fontSize:10, color:"#444", marginBottom:4 }}>Your wallet</div>
              <div style={{ fontSize:11, color:"#fff", fontFamily:"monospace" }}>{wallet?.address}</div>
            </div>
            <button style={S.btn("#FF6B35")} onClick={handleFaucet} disabled={loading}>
              {loading ? "Requesting..." : "◎ Request Testnet USDC"}
            </button>
          </div>
        )}

        {/* Result */}
        {result && (
          <div style={{ marginTop:16, padding:14, background:"rgba(0,255,178,0.06)", border:"1px solid #00FFB233", borderRadius:8 }}>
            <div style={{ fontSize:12, color:"#00FFB2", fontWeight:700, marginBottom:6 }}>
              {result.type==="faucet" ? "✓ USDC Requested!" : result.type==="cctp" ? "✓ Cross-Chain Transfer Initiated!" : "✓ Transfer Submitted!"}
            </div>
            {result.txId !== "faucet-drip" && (
              <div style={{ fontSize:10, color:"#444", fontFamily:"monospace" }}>TX: {result.txId}</div>
            )}
            <div style={{ fontSize:10, color:"#333", marginTop:6 }}>
              {result.type==="faucet" ? "USDC will arrive in ~30 seconds" : "Confirm on Circle dashboard · May take 1-2 mins"}
            </div>
          </div>
        )}

        {/* Error */}
        {error && (
          <div style={{ marginTop:16, padding:14, background:"rgba(255,107,53,0.06)", border:"1px solid #FF6B3533", borderRadius:8 }}>
            <div style={{ fontSize:12, color:"#FF6B35", fontWeight:600, marginBottom:4 }}>Error</div>
            <div style={{ fontSize:11, color:"#cc5533", lineHeight:1.5, wordBreak:"break-all" }}>{error}</div>
          </div>
        )}
      </div>
    </div>
  );
}
