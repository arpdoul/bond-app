import { useState, useRef, useEffect } from "react";
import { sendUSDC, cctpTransfer } from "./circle.js";

const CHAINS = [
  { id: "MATIC-AMOY",   label: "Polygon"   },
  { id: "ARB-SEPOLIA",  label: "Arbitrum"  },
  { id: "BASE-SEPOLIA", label: "Base"      },
];

const SUGGESTIONS = [
  "Send 0.5 USDC to 0x82f9...F44",
  "Bridge 1 USDC to Polygon",
  "What's my wallet balance?",
  "Send 2 USDC to my friend",
];

function parseIntent(text) {
  const lower = text.toLowerCase();
  
  // Detect bridge/cross-chain
  const isBridge = lower.includes("bridge") || lower.includes("cross") || 
                   lower.includes("transfer to") || lower.includes("send to polygon") ||
                   lower.includes("send to arbitrum") || lower.includes("send to base");
  
  // Extract amount
  const amountMatch = text.match(/(\d+\.?\d*)\s*usdc/i) || 
                      text.match(/send\s+(\d+\.?\d*)/i) ||
                      text.match(/(\d+\.?\d*)\s+to\s+0x/i);
  const amount = amountMatch?.[1];

  // Extract address
  const addressMatch = text.match(/(0x[a-fA-F0-9]{40})/);
  const address = addressMatch?.[1];

  // Detect destination chain
  let destChain = null;
  if (lower.includes("polygon") || lower.includes("matic")) destChain = "MATIC-AMOY";
  if (lower.includes("arbitrum") || lower.includes("arb"))  destChain = "ARB-SEPOLIA";
  if (lower.includes("base"))                                destChain = "BASE-SEPOLIA";

  // Detect balance query
  const isBalance = lower.includes("balance") || lower.includes("how much") || 
                    lower.includes("wallet") && lower.includes("?");

  return { isBridge, amount, address, destChain, isBalance };
}

async function askAI(messages, walletAddress, balance) {
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1000,
      system: `You are BOND Agent — an autonomous USDC payment AI on Arc testnet.
Your job: help users send USDC and bridge across chains via natural language.

User wallet: ${walletAddress || "not connected"}
Current USDC balance: ${balance || "0"} USDC
Supported chains: Arc Testnet, Polygon Amoy, Arbitrum Sepolia, Base Sepolia

When user wants to send USDC:
- Extract: amount, destination address, chain
- Confirm details before executing
- Reply in JSON when ready to execute:
{"action":"send","amount":"X","to":"0x...","confirmed":true}

When user wants to bridge:
- Extract: amount, destination chain
- Reply in JSON when ready:
{"action":"bridge","amount":"X","to":"0x...","destChain":"CHAIN-ID","confirmed":true}

When user asks balance:
- Reply with their balance info naturally

For anything else: be helpful and explain what BOND can do.
Always be concise — this is a mobile app. Max 2-3 sentences.
Never include markdown. Plain text only.`,
      messages: messages.map(m => ({ role: m.role, content: m.content })),
    }),
  });
  const data = await res.json();
  return data.content?.[0]?.text || "I couldn't process that. Try again.";
}

export default function AgentChat({ walletConnected, walletAddress, balance, onBalanceRefresh }) {
  const [messages, setMessages] = useState([
    {
      role: "assistant",
      content: `BOND Agent online. I can send USDC or bridge across chains for you — just tell me what you need.\n\nTry: "Send 0.1 USDC to 0x..." or "Bridge 1 USDC to Polygon"`,
      id: 0,
    }
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [pending, setPending] = useState(null);
  const [txResult, setTxResult] = useState(null);
  const endRef = useRef(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const addMsg = (role, content, extra = {}) => {
    setMessages(prev => [...prev, { role, content, id: Date.now() + Math.random(), ...extra }]);
  };

  const executeTx = async (action) => {
    setLoading(true);
    setPending(null);
    try {
      let res;
      if (action.action === "send") {
        addMsg("assistant", `Executing: sending ${action.amount} USDC to ${action.to.slice(0,10)}... on Arc testnet`);
        res = await sendUSDC(
          localStorage.getItem("bond_wid"),
          action.to,
          action.amount
        );
      } else if (action.action === "bridge") {
        addMsg("assistant", `Bridging ${action.amount} USDC to ${action.destChain}...`);
        res = await cctpTransfer(
          localStorage.getItem("bond_wid"),
          action.to || walletAddress,
          action.amount,
          "ARC-TESTNET",
          action.destChain
        );
      }

      if (res?.data?.id || res?.data?.transaction?.id) {
        const txId = res.data.id || res.data.transaction?.id;
        setTxResult({ success: true, txId });
        addMsg("assistant", `✓ Transaction submitted!\nTX: ${txId.slice(0,20)}...\n\nYour balance will update shortly.`, { isSuccess: true });
        onBalanceRefresh?.();
      } else {
        const err = res?.message || res?.error || JSON.stringify(res);
        addMsg("assistant", `Transaction failed: ${err}`, { isError: true });
      }
    } catch(e) {
      addMsg("assistant", `Error: ${e.message}`, { isError: true });
    }
    setLoading(false);
  };

  const handleSend = async () => {
    if (!input.trim() || loading) return;
    if (!walletConnected) {
      addMsg("assistant", "Connect your wallet first to send USDC.", { isError: true });
      return;
    }

    const userMsg = input.trim();
    setInput("");
    addMsg("user", userMsg);
    setLoading(true);

    try {
      const history = [...messages, { role: "user", content: userMsg }];
      const reply = await askAI(history, walletAddress, balance);

      // Try to parse JSON action from AI response
      const jsonMatch = reply.match(/\{[^}]*"action"[^}]*\}/s);
      if (jsonMatch) {
        try {
          const action = JSON.parse(jsonMatch[0]);
          if (action.confirmed && action.action) {
            addMsg("assistant", reply.replace(jsonMatch[0], "").trim() || `Ready to ${action.action} ${action.amount} USDC. Confirm?`);
            setPending(action);
            setLoading(false);
            return;
          }
        } catch(e) {}
      }

      addMsg("assistant", reply);
    } catch(e) {
      addMsg("assistant", "Connection error. Check your network.", { isError: true });
    }
    setLoading(false);
  };

  const S = {
    container: {
      display: "flex", flexDirection: "column", height: "100%", minHeight: 500,
    },
    header: {
      display: "flex", alignItems: "center", gap: 10, marginBottom: 16,
      paddingBottom: 14, borderBottom: "1px solid #111",
    },
    msgBox: {
      flex: 1, overflowY: "auto", marginBottom: 12,
      display: "flex", flexDirection: "column", gap: 10,
      maxHeight: 380, paddingRight: 4,
    },
    msg: (role, isError, isSuccess) => ({
      maxWidth: "85%",
      alignSelf: role === "user" ? "flex-end" : "flex-start",
      background: role === "user"
        ? "rgba(0,255,178,0.1)"
        : isError ? "rgba(255,107,53,0.08)"
        : isSuccess ? "rgba(0,255,178,0.06)"
        : "rgba(255,255,255,0.04)",
      border: `1px solid ${role === "user" ? "#00FFB233" : isError ? "#FF6B3533" : isSuccess ? "#00FFB244" : "#1a1a1a"}`,
      borderRadius: role === "user" ? "12px 12px 4px 12px" : "4px 12px 12px 12px",
      padding: "10px 14px",
      fontSize: 13,
      lineHeight: 1.6,
      color: role === "user" ? "#00FFB2" : isError ? "#FF6B35" : "#ccc",
      whiteSpace: "pre-wrap",
      wordBreak: "break-word",
    }),
    inputRow: {
      display: "flex", gap: 8, alignItems: "flex-end",
    },
    input: {
      flex: 1, background: "rgba(255,255,255,0.04)",
      border: "1px solid #1f1f1f", borderRadius: 10,
      color: "#fff", fontSize: 13, padding: "10px 14px",
      outline: "none", resize: "none", fontFamily: "sans-serif",
      lineHeight: 1.5, maxHeight: 80,
    },
    sendBtn: (active) => ({
      background: active ? "#00FFB2" : "#1a1a1a",
      border: "none", borderRadius: 10,
      color: active ? "#080808" : "#444",
      fontSize: 16, fontWeight: 700,
      padding: "10px 16px", cursor: active ? "pointer" : "not-allowed",
      transition: "all 0.2s", minWidth: 48,
    }),
    confirmBox: {
      background: "rgba(255,215,0,0.06)",
      border: "1px solid #FFD70033",
      borderRadius: 10, padding: "14px 16px",
      marginBottom: 10,
    },
  };

  return (
    <div style={S.container}>
      {/* Header */}
      <div style={S.header}>
        <div style={{
          width: 36, height: 36, borderRadius: 10,
          background: "linear-gradient(135deg,#00FFB2,#A78BFA)",
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 16,
        }}>⟁</div>
        <div>
          <div style={{ fontSize: 14, fontWeight: 700, color: "#fff" }}>BOND Agent</div>
          <div style={{ fontSize: 11, color: "#444" }}>
            {walletConnected
              ? `${balance} USDC · Arc Testnet`
              : "Connect wallet to start"}
          </div>
        </div>
        <div style={{
          marginLeft: "auto", fontSize: 9, color: "#00FFB2",
          padding: "3px 8px", border: "1px solid #00FFB222",
          borderRadius: 20, background: "rgba(0,255,178,0.05)",
        }}>
          {loading ? "THINKING..." : "ONLINE"}
        </div>
      </div>

      {/* Suggestions */}
      {messages.length <= 1 && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 14 }}>
          {SUGGESTIONS.map((s, i) => (
            <button key={i} onClick={() => setInput(s)}
              style={{
                background: "rgba(255,255,255,0.03)", border: "1px solid #1a1a1a",
                borderRadius: 20, color: "#555", fontSize: 11,
                padding: "5px 12px", cursor: "pointer",
              }}>
              {s}
            </button>
          ))}
        </div>
      )}

      {/* Messages */}
      <div style={S.msgBox}>
        {messages.map(m => (
          <div key={m.id} style={S.msg(m.role, m.isError, m.isSuccess)}>
            {m.content}
          </div>
        ))}
        {loading && (
          <div style={{ ...S.msg("assistant", false, false), color: "#333" }}>
            Agent thinking...
          </div>
        )}
        <div ref={endRef} />
      </div>

      {/* Confirm pending action */}
      {pending && (
        <div style={S.confirmBox}>
          <div style={{ fontSize: 11, color: "#FFD700", marginBottom: 10, textTransform: "uppercase", letterSpacing: "0.08em" }}>
            Confirm Transaction
          </div>
          <div style={{ fontSize: 12, color: "#aaa", marginBottom: 12, lineHeight: 1.6 }}>
            {pending.action === "send"
              ? `Send ${pending.amount} USDC → ${pending.to?.slice(0,12)}... on Arc Testnet`
              : `Bridge ${pending.amount} USDC → ${pending.destChain} via CCTP`
            }
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={() => executeTx(pending)}
              style={{ flex: 1, padding: "10px", background: "#00FFB2", border: "none", borderRadius: 8, color: "#080808", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>
              ✓ Confirm & Execute
            </button>
            <button onClick={() => { setPending(null); addMsg("assistant", "Transaction cancelled."); }}
              style={{ flex: 1, padding: "10px", background: "transparent", border: "1px solid #333", borderRadius: 8, color: "#666", fontSize: 12, cursor: "pointer" }}>
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Input */}
      <div style={S.inputRow}>
        <textarea
          style={S.input}
          placeholder={walletConnected
            ? "Send 0.5 USDC to 0x... or Bridge to Polygon..."
            : "Connect wallet first..."}
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
          rows={1}
          disabled={!walletConnected || loading}
        />
        <button
          style={S.sendBtn(!!input.trim() && walletConnected && !loading)}
          onClick={handleSend}
          disabled={!input.trim() || !walletConnected || loading}>
          ↑
        </button>
      </div>
    </div>
  );
}
