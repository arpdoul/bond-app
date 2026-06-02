
import { useState, useEffect, useRef, useCallback } from "react";
import { useCircleWallet } from "./useCircleWallet.js";
import WalletModal from "./WalletModal.jsx";
import PayPanel from "./PayPanel.jsx";
import AgentChat from "./AgentChat.jsx";

const AGENTS = [
  { id: "alpha", name: "Agent ALPHA", role: "Researcher", color: "#00FFB2", icon: "◈" },
  { id: "beta",  name: "Agent BETA",  role: "Negotiator", color: "#FF6B35", icon: "◉" },
  { id: "gamma", name: "Agent GAMMA", role: "Settler",    color: "#A78BFA", icon: "◆" },
  { id: "trade", name: "Agent TRADE", role: "Trader",     color: "#FFD700", icon: "◎" },
];

const SERVICES = [
  { id: "coingecko", name: "CoinGecko API",    price: 0.0004, chain: "Arc"      },
  { id: "chainlink", name: "Chainlink Oracle", price: 0.0007, chain: "Arc"      },
  { id: "openai",    name: "GPT-4o Inference", price: 0.0012, chain: "Arc"      },
  { id: "pinata",    name: "IPFS Storage",     price: 0.0003, chain: "Arc"      },
  { id: "dune",      name: "Dune Analytics",   price: 0.0009, chain: "Arc"      },
];

const TASKS = [
  "Research best USDC liquidity pool across chains",
  "Fetch real-time ETH/USD rate and settle invoice",
  "Negotiate batch settlement with 3 counterparties",
  "Stream micropayments for live data feed access",
  "Execute cross-chain arbitrage and settle in USDC",
];

const TRADE_PAIRS = [
  { symbol: "ETH/USDC",  base: "ethereum",  color: "#627EEA" },
  { symbol: "BTC/USDC",  base: "bitcoin",   color: "#F7931A" },
  { symbol: "SOL/USDC",  base: "solana",    color: "#9945FF" },
  { symbol: "ARB/USDC",  base: "arbitrum",  color: "#28A0F0" },
];

function generateTxHash() {
  return "0x" + Array.from({length:12},()=>Math.floor(Math.random()*256).toString(16).padStart(2,"0")).join("");
}
function generateAddress() {
  return "0x" + Array.from({length:5},()=>Math.floor(Math.random()*256).toString(16).padStart(2,"0")).join("")+"...";
}

function StreamTicker({ isActive }) {
  const [display, setDisplay] = useState(0);
  useEffect(() => {
    if (!isActive) return;
    const i = setInterval(() => setDisplay(p => p + Math.random()*0.000008), 80);
    return () => clearInterval(i);
  }, [isActive]);
  return <span style={{fontFamily:"monospace",color:"#00FFB2"}}>${display.toFixed(6)}</span>;
}

function AnimCounter({ value, decimals=4, prefix="$" }) {
  const [display, setDisplay] = useState(0);
  const ref = useRef(0);
  useEffect(() => {
    const start = ref.current, duration = 600, startTime = performance.now();
    const tick = now => {
      const t = Math.min((now-startTime)/duration,1);
      const cur = start+(value-start)*(1-Math.pow(1-t,3));
      setDisplay(cur);
      if (t<1) requestAnimationFrame(tick); else ref.current=value;
    };
    requestAnimationFrame(tick);
  }, [value]);
  return <>{prefix}{display.toFixed(decimals)}</>;
}

function PaymentLogItem({ item, index }) {
  const [visible, setVisible] = useState(false);
  useEffect(() => { const t = setTimeout(()=>setVisible(true),index*80); return ()=>clearTimeout(t); },[index]);
  const agent = AGENTS.find(a=>a.id===item.agentId)||AGENTS[0];
  return (
    <div style={{opacity:visible?1:0,transform:visible?"translateY(0)":"translateY(8px)",transition:"all 0.3s ease",display:"flex",alignItems:"center",gap:10,padding:"8px 12px",borderLeft:`2px solid ${agent.color}22`,marginBottom:4,background:"rgba(255,255,255,0.02)",borderRadius:"0 6px 6px 0",fontSize:12}}>
      <span style={{color:agent.color,fontSize:14}}>{agent.icon}</span>
      <span style={{color:"#888",fontFamily:"monospace",fontSize:11}}>{item.time}</span>
      <span style={{color:"#ccc",flex:1}}>{item.service}</span>
      <span style={{color:item.type==="stream"?"#A78BFA":"#00FFB2",fontFamily:"monospace"}}>{item.type==="stream"?"~":""}${item.amount.toFixed(4)}</span>
      <span style={{color:"#444",fontSize:10}}>{item.chain}</span>
    </div>
  );
}

function AgentCard({ agent, status, task, totalSpent }) {
  const sc = status==="active"?agent.color:status==="idle"?"#444":"#FF6B35";
  return (
    <div style={{background:"rgba(255,255,255,0.03)",border:`1px solid ${status==="active"?agent.color+"33":"#1a1a1a"}`,borderRadius:12,padding:"14px 16px",transition:"all 0.4s ease"}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:8}}>
        <div style={{display:"flex",alignItems:"center",gap:8}}>
          <span style={{fontSize:18,color:agent.color}}>{agent.icon}</span>
          <div>
            <div style={{fontSize:12,fontWeight:700,color:"#fff"}}>{agent.name}</div>
            <div style={{fontSize:10,color:"#555",textTransform:"uppercase",letterSpacing:"0.1em"}}>{agent.role}</div>
          </div>
        </div>
        <div style={{fontSize:9,fontWeight:700,textTransform:"uppercase",color:sc,padding:"2px 6px",border:`1px solid ${sc}44`,borderRadius:4}}>{status}</div>
      </div>
      {task && <div style={{fontSize:10,color:"#666",marginBottom:8,lineHeight:1.5}}>{task}</div>}
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
        <span style={{fontSize:10,color:"#444"}}>USDC SPENT</span>
        <span style={{fontFamily:"monospace",fontSize:12,color:agent.color}}><AnimCounter value={totalSpent} decimals={4} prefix="$"/></span>
      </div>
    </div>
  );
}

function SettlementCard({ s, index }) {
  const [show, setShow] = useState(false);
  useEffect(()=>{setTimeout(()=>setShow(true),index*120);},[index]);
  return (
    <div style={{opacity:show?1:0,transform:show?"translateX(0)":"translateX(20px)",transition:"all 0.4s ease",background:"rgba(255,255,255,0.02)",border:"1px solid #1f1f1f",borderRadius:10,padding:"12px 14px",marginBottom:8}}>
      <div style={{display:"flex",justifyContent:"space-between",marginBottom:6}}>
        <span style={{fontSize:11,color:"#aaa",fontWeight:600}}>{s.merchant}</span>
        <span style={{fontSize:9,color:s.status==="settled"?"#00FFB2":"#FF6B35",textTransform:"uppercase",border:`1px solid ${s.status==="settled"?"#00FFB244":"#FF6B3544"}`,padding:"2px 6px",borderRadius:3}}>{s.status}</span>
      </div>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
        <span style={{fontFamily:"monospace",fontSize:10,color:"#444"}}>{s.txHash}</span>
        <span style={{fontFamily:"monospace",fontSize:13,color:"#00FFB2",fontWeight:700}}>${s.amount.toFixed(2)}</span>
      </div>
      <div style={{marginTop:6,fontSize:10,color:"#333"}}>via CCTP → {s.chain} · {s.time}</div>
    </div>
  );
}

// ── TRADE AGENT COMPONENT ──────────────────────────────────────────────
function TradeAgent({ walletConnected, onOpenPay }) {
  const [prices, setPrices]           = useState({});
  const [prevPrices, setPrevPrices]   = useState({});
  const [tradeLog, setTradeLog]       = useState([]);
  const [isTrading, setIsTrading]     = useState(false);
  const [selectedPair, setSelected]   = useState("ETH/USDC");
  const [tradeSize, setTradeSize]     = useState("1.00");
  const [strategy, setStrategy]       = useState("momentum");
  const [totalPnl, setTotalPnl]       = useState(0);
  const [totalTrades, setTotalTrades] = useState(0);
  const [agentStatus, setStatus]      = useState("idle");
  const intervalRef = useRef(null);
  const tradeRef    = useRef(null);

  // Fetch real prices from CoinGecko
  const fetchPrices = useCallback(async () => {
    try {
      const ids = TRADE_PAIRS.map(p=>p.base).join(",");
      const r = await fetch(
        `https://api.coingecko.com/api/v3/simple/price?ids=${ids}&vs_currencies=usd&include_24hr_change=true`
      );
      const d = await r.json();
      setPrevPrices(prev => ({...prev, ...prices}));
      const newPrices = {};
      TRADE_PAIRS.forEach(p => {
        if (d[p.base]) {
          newPrices[p.symbol] = {
            price: d[p.base].usd,
            change24h: d[p.base].usd_24h_change || 0,
          };
        }
      });
      setPrices(newPrices);
    } catch(e) {
      // Fallback mock prices
      setPrices(prev => {
        const updated = {...prev};
        TRADE_PAIRS.forEach(p => {
          const base = prev[p.symbol]?.price || (p.symbol==="ETH/USDC"?3200:p.symbol==="BTC/USDC"?65000:p.symbol==="SOL/USDC"?180:1.2);
          updated[p.symbol] = {
            price: base * (1 + (Math.random()-0.5)*0.002),
            change24h: (Math.random()-0.5)*5,
          };
        });
        return updated;
      });
    }
  }, [prices]);

  useEffect(() => {
    fetchPrices();
    const pi = setInterval(fetchPrices, 15000);
    return () => clearInterval(pi);
  }, []);

  // Agent auto-trade logic
  const runTrade = useCallback(() => {
    const pair = TRADE_PAIRS.find(p=>p.symbol===selectedPair) || TRADE_PAIRS[0];
    const currentPrice = prices[pair.symbol]?.price;
    if (!currentPrice) return;
    const change = prices[pair.symbol]?.change24h || 0;

    let action, reason;
    if (strategy === "momentum") {
      action = change > 0 ? "BUY" : "SELL";
      reason = `${Math.abs(change).toFixed(2)}% ${change>0?"uptrend":"downtrend"}`;
    } else if (strategy === "mean_revert") {
      action = change < -2 ? "BUY" : change > 2 ? "SELL" : "HOLD";
      reason = `Price ${Math.abs(change).toFixed(2)}% from mean`;
    } else {
      action = Math.random() > 0.5 ? "BUY" : "SELL";
      reason = "Grid level hit";
    }

    if (action === "HOLD") return;

    const size = parseFloat(tradeSize) || 1;
    const slippage = (Math.random() * 0.002);
    const execPrice = action==="BUY" ? currentPrice*(1+slippage) : currentPrice*(1-slippage);
    const pnl = action==="BUY" ? -size : size * (Math.random()*0.01 - 0.003);
    const usdcCost = size * 0.0008;

    setTotalPnl(prev => prev + pnl);
    setTotalTrades(prev => prev + 1);

    const entry = {
      id: Date.now()+Math.random(),
      pair: pair.symbol,
      action,
      price: execPrice,
      size,
      pnl,
      usdcFee: usdcCost,
      reason,
      time: new Date().toLocaleTimeString("en-US",{hour12:false}),
      txHash: generateTxHash(),
    };

    setTradeLog(prev => [entry, ...prev].slice(0,30));
    setStatus(action==="BUY"?"buying":"selling");
    setTimeout(()=>setStatus("watching"),1200);
  }, [prices, selectedPair, strategy, tradeSize]);

  const startTrading = () => {
    if (!walletConnected) { onOpenPay(); return; }
    setIsTrading(true);
    setStatus("watching");
    setTradeLog([]);
    setTotalPnl(0);
    setTotalTrades(0);
    tradeRef.current = setInterval(runTrade, 3000 + Math.random()*2000);
    intervalRef.current = true;
  };

  const stopTrading = () => {
    setIsTrading(false);
    setStatus("idle");
    clearInterval(tradeRef.current);
  };

  useEffect(()=>()=>clearInterval(tradeRef.current),[]);

  const statusColor = agentStatus==="buying"?"#00FFB2":agentStatus==="selling"?"#FF6B35":agentStatus==="watching"?"#FFD700":"#444";

  return (
    <div>
      {/* Header */}
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:20}}>
        <div>
          <div style={{fontSize:14,fontWeight:700,color:"#fff",marginBottom:2}}>
            <span style={{color:"#FFD700"}}>◎</span> Agent TRADE
          </div>
          <div style={{fontSize:11,color:"#444"}}>
            AI-powered market agent · Settles in USDC on Arc
          </div>
        </div>
        <div style={{textAlign:"right"}}>
          <div style={{fontSize:9,color:"#444",textTransform:"uppercase",marginBottom:2}}>Status</div>
          <div style={{fontSize:11,fontWeight:700,color:statusColor,textTransform:"uppercase",letterSpacing:"0.1em"}}>
            {agentStatus}
          </div>
        </div>
      </div>

      {/* Live Price Grid */}
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:20}}>
        {TRADE_PAIRS.map(pair => {
          const data = prices[pair.symbol];
          const prev = prevPrices[pair.symbol];
          const up = data && prev ? data.price >= prev.price : true;
          const isSelected = selectedPair === pair.symbol;
          return (
            <div key={pair.symbol}
              onClick={()=>setSelected(pair.symbol)}
              style={{
                background:isSelected?"rgba(255,215,0,0.06)":"rgba(255,255,255,0.02)",
                border:`1px solid ${isSelected?"#FFD70044":"#141414"}`,
                borderRadius:10,padding:"12px 14px",cursor:"pointer",
                transition:"all 0.2s",
              }}>
              <div style={{display:"flex",justifyContent:"space-between",marginBottom:4}}>
                <span style={{fontSize:11,color:pair.color,fontWeight:700}}>{pair.symbol}</span>
                <span style={{fontSize:10,color:data?.change24h>=0?"#00FFB2":"#FF6B35"}}>
                  {data ? `${data.change24h>=0?"+":""}${data.change24h?.toFixed(2)}%` : "..."}
                </span>
              </div>
              <div style={{fontSize:18,fontWeight:700,color:up?"#00FFB2":"#FF6B35",fontFamily:"monospace"}}>
                {data ? `$${data.price.toLocaleString("en-US",{minimumFractionDigits:2,maximumFractionDigits:2})}` : "Loading..."}
              </div>
              <div style={{fontSize:9,color:"#333",marginTop:2}}>Arc Testnet · USDC pair</div>
            </div>
          );
        })}
      </div>

      {/* Trade Config */}
      <div style={{background:"rgba(255,255,255,0.02)",border:"1px solid #141414",borderRadius:12,padding:"16px",marginBottom:16}}>
        <div style={{fontSize:11,color:"#555",textTransform:"uppercase",letterSpacing:"0.08em",marginBottom:14}}>
          Agent Configuration
        </div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:12}}>
          <div>
            <label style={{fontSize:10,color:"#444",textTransform:"uppercase",display:"block",marginBottom:5}}>Strategy</label>
            <select value={strategy} onChange={e=>setStrategy(e.target.value)}
              style={{background:"rgba(255,255,255,0.04)",border:"1px solid #1f1f1f",borderRadius:6,color:"#fff",fontSize:12,padding:"8px 10px",width:"100%",outline:"none"}}>
              <option value="momentum">Momentum</option>
              <option value="mean_revert">Mean Reversion</option>
              <option value="grid">Grid Trading</option>
            </select>
          </div>
          <div>
            <label style={{fontSize:10,color:"#444",textTransform:"uppercase",display:"block",marginBottom:5}}>Size (USDC)</label>
            <input type="number" value={tradeSize} onChange={e=>setTradeSize(e.target.value)} step="0.5" min="0.1"
              style={{background:"rgba(255,255,255,0.04)",border:"1px solid #1f1f1f",borderRadius:6,color:"#fff",fontSize:12,padding:"8px 10px",width:"100%",outline:"none",boxSizing:"border-box"}}/>
          </div>
        </div>

        {/* PnL Stats */}
        {totalTrades > 0 && (
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8,marginBottom:12}}>
            {[
              {label:"Total Trades", value:totalTrades, color:"#fff"},
              {label:"Est. PnL", value:`${totalPnl>=0?"+":""}$${Math.abs(totalPnl).toFixed(2)}`, color:totalPnl>=0?"#00FFB2":"#FF6B35"},
              {label:"Win Rate", value:`${Math.round((tradeLog.filter(t=>t.pnl>0).length/Math.max(totalTrades,1))*100)}%`, color:"#FFD700"},
            ].map((s,i)=>(
              <div key={i} style={{background:"rgba(0,0,0,0.3)",borderRadius:8,padding:"8px 10px",textAlign:"center"}}>
                <div style={{fontSize:9,color:"#444",marginBottom:4,textTransform:"uppercase"}}>{s.label}</div>
                <div style={{fontSize:14,fontWeight:700,color:s.color,fontFamily:"monospace"}}>{s.value}</div>
              </div>
            ))}
          </div>
        )}

        {isTrading
          ? <button onClick={stopTrading} style={{width:"100%",padding:"12px",background:"transparent",border:"1px solid #FF6B3544",color:"#FF6B35",borderRadius:8,fontSize:13,fontWeight:700,letterSpacing:"0.08em",textTransform:"uppercase",cursor:"pointer"}}>
              ■ Stop Agent TRADE
            </button>
          : <button onClick={startTrading} style={{width:"100%",padding:"12px",background:"linear-gradient(135deg,#FFD700,#FF8C00)",border:"none",color:"#080808",borderRadius:8,fontSize:13,fontWeight:700,letterSpacing:"0.08em",textTransform:"uppercase",cursor:"pointer",boxShadow:"0 0 24px rgba(255,215,0,0.2)"}}>
              ◎ Launch Trade Agent
            </button>
        }
      </div>

      {/* Trade Log */}
      <div style={{background:"rgba(0,0,0,0.4)",border:"1px solid #111",borderRadius:12,padding:14,maxHeight:300,overflowY:"auto"}}>
        <div style={{fontSize:10,color:"#333",textTransform:"uppercase",letterSpacing:"0.1em",marginBottom:10}}>
          Live Trade Log
        </div>
        {tradeLog.length===0
          ? <div style={{textAlign:"center",color:"#2a2a2a",padding:"40px 0",fontSize:12}}>
              {isTrading?"Agent scanning markets...":"Launch agent to start trading"}
            </div>
          : tradeLog.map((t,i)=>(
            <div key={t.id} style={{display:"flex",alignItems:"center",gap:8,padding:"7px 10px",borderLeft:`2px solid ${t.action==="BUY"?"#00FFB2":"#FF6B35"}22`,marginBottom:4,background:"rgba(255,255,255,0.02)",borderRadius:"0 6px 6px 0",fontSize:11}}>
              <span style={{color:t.action==="BUY"?"#00FFB2":"#FF6B35",fontWeight:700,fontSize:10,minWidth:30}}>{t.action}</span>
              <span style={{color:"#888",fontFamily:"monospace",fontSize:10}}>{t.time}</span>
              <span style={{color:"#aaa",flex:1}}>{t.pair}</span>
              <span style={{color:"#666",fontFamily:"monospace",fontSize:10}}>${t.price.toLocaleString("en-US",{maximumFractionDigits:2})}</span>
              <span style={{color:t.pnl>=0?"#00FFB2":"#FF6B35",fontFamily:"monospace",fontSize:10}}>
                {t.pnl>=0?"+":""}{t.pnl.toFixed(3)}
              </span>
            </div>
          ))
        }
      </div>
    </div>
  );
}

// ── MAIN APP ──────────────────────────────────────────────────────────
export default function BondApp() {
  const [tab, setTab]               = useState("agent");
  const [isRunning, setIsRunning]   = useState(false);
  const [task, setTask]             = useState(TASKS[0]);
  const [budget, setBudget]         = useState("5.00");
  const [logs, setLogs]             = useState([]);
  const [settlements, setSettlements] = useState([]);
  const [agentStates, setAgentStates] = useState({
    alpha:{status:"idle",task:null,spent:0},
    beta:{status:"idle",task:null,spent:0},
    gamma:{status:"idle",task:null,spent:0},
    trade:{status:"idle",task:null,spent:0},
  });
  const [totalSpent, setTotalSpent] = useState(0);
  const [streamActive, setStreamActive] = useState(false);
  const [walletConnected, setWalletConnected] = useState(false);
  const [walletAddr, setWalletAddr] = useState("");
  const [showModal, setShowModal]   = useState(false);
  const [showPay, setShowPay]       = useState(false);
  const [showMenu, setShowMenu]     = useState(false);
  const intervalRef = useRef(null);
  const logsEndRef  = useRef(null);
  const { connect, disconnect, wallet, balance, loading, error, status: walletStatus } = useCircleWallet();

  useEffect(() => {
    const savedAddr = localStorage.getItem("bond_waddr");
    const savedId   = localStorage.getItem("bond_wid");
    if (savedAddr && savedId) {
      setWalletConnected(true);
      setWalletAddr(savedAddr);
    }
  }, []);

  useEffect(()=>{ if(logsEndRef.current) logsEndRef.current.scrollIntoView({behavior:"smooth"}); },[logs]);

  const addLog = useCallback((agentId,service,amount,type,chain)=>{
    const time=new Date().toLocaleTimeString("en-US",{hour12:false});
    setLogs(prev=>[...prev.slice(-50),{agentId,service,amount,type,chain,time,id:Date.now()+Math.random()}]);
    setTotalSpent(prev=>prev+amount);
    setAgentStates(prev=>({...prev,[agentId]:{...prev[agentId],spent:prev[agentId].spent+amount}}));
  },[]);

  const runCycle = useCallback(()=>{
    const pick=arr=>arr[Math.floor(Math.random()*arr.length)];
    const agentId=pick(["alpha","beta","gamma"]);
    const service=pick(SERVICES);
    const isStream=Math.random()>0.5;
    const amount=service.price*(0.8+Math.random()*0.4);
    setAgentStates(prev=>({...prev,[agentId]:{...prev[agentId],status:"active",task:`Calling ${service.name}...`}}));
    addLog(agentId,service.name,amount,isStream?"stream":"inference",service.chain);
    setTimeout(()=>setAgentStates(prev=>({...prev,[agentId]:{...prev[agentId],status:"idle",task:null}})),900+Math.random()*600);
    if(Math.random()>0.75){
      const merchants=["Merchant A","Merchant B","Merchant C","DataFeed Inc","Oracle Corp"];
      const chains=["Arc","Arc","Arc","Arc"];
      setTimeout(()=>setSettlements(prev=>[...prev.slice(-10),{merchant:pick(merchants),txHash:generateTxHash(),amount:parseFloat((0.5+Math.random()*4).toFixed(2)),chain:pick(chains),status:Math.random()>0.1?"settled":"pending",time:new Date().toLocaleTimeString("en-US",{hour12:false}),id:Date.now()+Math.random()}]),1200);
    }
  },[addLog]);

  const startAgent=()=>{
    if(!walletConnected){setShowModal(true);return;}
    setIsRunning(true);setStreamActive(true);setLogs([]);setSettlements([]);setTotalSpent(0);
    setAgentStates({alpha:{status:"idle",task:"Initializing...",spent:0},beta:{status:"idle",task:"Standby...",spent:0},gamma:{status:"idle",task:"Standby...",spent:0},trade:{status:"idle",task:null,spent:0}});
    intervalRef.current=setInterval(runCycle,700+Math.random()*300);
  };
  const stopAgent=()=>{
    setIsRunning(false);setStreamActive(false);clearInterval(intervalRef.current);
    setAgentStates(prev=>Object.fromEntries(Object.entries(prev).map(([k,v])=>[k,{...v,status:"idle",task:null}])));
  };
  const handleConnected=(result)=>{
    setWalletConnected(true);
    setWalletAddr(result?.wallet?.address||result?.wallet?.id||generateAddress());
    setShowModal(false);
  };
  useEffect(()=>()=>clearInterval(intervalRef.current),[]);
  const budgetUsed=Math.min((totalSpent/parseFloat(budget||1))*100,100);

  const TABS = [
    { id:"trade",     label:"◎ Trade"    },
    { id:"dashboard", label:"Dashboard"  },
    { id:"stream",    label:"Stream"     },
    { id:"settle",    label:"Settle"     },
  ];

  return (
    <div style={{minHeight:"100vh",background:"#080808",color:"#fff",fontFamily:"sans-serif",display:"flex",flexDirection:"column"}}>

      {/* ── HEADER ── */}
      <header style={{padding:"12px 20px",borderBottom:"1px solid #111",display:"flex",alignItems:"center",justifyContent:"space-between",background:"rgba(8,8,8,0.97)",position:"sticky",top:0,zIndex:100}}>
        {/* Logo */}
        <div style={{display:"flex",alignItems:"center",gap:10}}>
          <div style={{position:"relative"}}>
            <div style={{width:30,height:30,borderRadius:7,background:"linear-gradient(135deg,#00FFB2,#00a876)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:15,fontWeight:900,color:"#080808"}}>B</div>
            {isRunning && <div style={{position:"absolute",top:-2,right:-2,width:7,height:7,borderRadius:"50%",background:"#00FFB2",boxShadow:"0 0 6px #00FFB2"}}/>}
          </div>
          <div>
            <div style={{fontSize:20,letterSpacing:"0.12em",lineHeight:1,color:"#fff",fontWeight:900}}>BOND</div>
            <div style={{fontSize:8,color:"#333",letterSpacing:"0.15em",textTransform:"uppercase"}}>Autonomous Commerce Agent</div>
          </div>
        </div>

        {/* RIGHT SIDE: Tabs + Wallet */}
        <div style={{display:"flex",alignItems:"center",gap:6}}>
          {/* HAMBURGER */}
          <div style={{position:"relative"}}>
            <button onClick={()=>setShowMenu(p=>!p)}
              style={{background:"rgba(255,255,255,0.08)",border:"1px solid #2a2a2a",borderRadius:10,padding:"9px 11px",cursor:"pointer",display:"flex",flexDirection:"column",gap:"5px",alignItems:"center"}}>
              <div style={{width:18,height:2,background:"#fff",borderRadius:1}}/>
              <div style={{width:18,height:2,background:"#fff",borderRadius:1}}/>
              <div style={{width:18,height:2,background:"#fff",borderRadius:1}}/>
            </button>
            {showMenu && (
              <div style={{position:"absolute",top:"calc(100% + 8px)",right:0,background:"#111",border:"1px solid #222",borderRadius:12,padding:"6px",minWidth:160,zIndex:999,boxShadow:"0 16px 40px rgba(0,0,0,0.9)"}}>
                {[
                  {id:"trade",     label:"Trade",     icon:"◎"},
                  {id:"dashboard", label:"Dashboard", icon:"⬡"},
                  {id:"stream",    label:"Stream",    icon:"≋"},
                  {id:"settle",    label:"Settle",    icon:"◈"},
                ].map(t=>(
                  <button key={t.id} onClick={()=>{setTab(t.id);setShowMenu(false);}}
                    style={{display:"flex",alignItems:"center",gap:10,width:"100%",background:tab===t.id?"rgba(0,255,178,0.1)":"none",border:"none",cursor:"pointer",fontFamily:"sans-serif",fontSize:13,fontWeight:600,padding:"11px 14px",borderRadius:8,color:tab===t.id?"#00FFB2":"#888",textAlign:"left",marginBottom:2}}>
                    <span style={{fontSize:16}}>{t.icon}</span>{t.label}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Wallet */}
          {isRunning && <div style={{fontSize:10,color:"#00FFB2",padding:"3px 8px",borderRadius:20,border:"1px solid #00FFB222",background:"rgba(0,255,178,0.05)"}}>● LIVE</div>}
          {walletConnected
            ? <div style={{display:"flex",gap:4,alignItems:"center"}}>
                <div style={{fontSize:10,color:"#555",fontFamily:"monospace",padding:"5px 10px",border:"1px solid #1a1a1a",borderRadius:6,maxWidth:100,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>
                  {walletAddr.slice(0,8)}... · <span style={{color:"#00FFB2"}}>{balance} USDC</span>
                </div>
                <button onClick={()=>setShowPay(true)} style={{background:"rgba(0,255,178,0.1)",border:"1px solid #00FFB233",color:"#00FFB2",fontSize:10,fontWeight:600,padding:"5px 10px",borderRadius:6,cursor:"pointer"}}>Pay</button>
              </div>
            : <button onClick={()=>setShowModal(true)} style={{background:"transparent",border:"1px solid #222",color:"#888",fontSize:10,fontWeight:600,padding:"5px 12px",borderRadius:6,cursor:"pointer",textTransform:"uppercase"}}>Connect</button>
          }
        </div>
      </header>

      {/* ── CONTENT ── */}
      <div style={{flex:1,padding:"20px",maxWidth:900,margin:"0 auto",width:"100%",boxSizing:"border-box"}}>

        {/* AGENT TAB */}
        {tab==="agent" && (
          <AgentChat
            walletConnected={walletConnected}
            walletAddress={walletAddr}
            balance={balance}
            onBalanceRefresh={() => {}}
          />
        )}

        {/* TRADE TAB */}
        {tab==="trade" && (
          <TradeAgent walletConnected={walletConnected} onOpenPay={()=>setShowModal(true)} />
        )}

        {/* DASHBOARD TAB */}
        {tab==="dashboard" && (
          <div>
            <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(120px,1fr))",gap:10,marginBottom:20}}>
              {[{label:"Total USDC Spent",value:`$${totalSpent.toFixed(4)}`,color:"#00FFB2"},{label:"Payments Made",value:`${logs.length}`,color:"#A78BFA"},{label:"Settlements",value:`${settlements.filter(s=>s.status==="settled").length}`,color:"#FF6B35"}].map((s,i)=>(
                <div key={i} style={{background:"rgba(255,255,255,0.02)",border:"1px solid #141414",borderRadius:12,padding:"14px 16px"}}>
                  <div style={{fontSize:9,color:"#444",letterSpacing:"0.1em",textTransform:"uppercase",marginBottom:8}}>{s.label}</div>
                  <div style={{fontSize:20,fontWeight:700,color:s.color,fontFamily:"monospace"}}>{s.value}</div>
                </div>
              ))}
            </div>
            <div style={{marginBottom:20}}>
              <div style={{display:"flex",justifyContent:"space-between",marginBottom:6}}>
                <span style={{fontSize:10,color:"#444",textTransform:"uppercase"}}>Budget Consumed</span>
                <span style={{fontSize:10,color:"#666",fontFamily:"monospace"}}>${totalSpent.toFixed(4)} / ${parseFloat(budget||0).toFixed(2)}</span>
              </div>
              <div style={{height:3,background:"#111",borderRadius:2,overflow:"hidden"}}>
                <div style={{height:"100%",borderRadius:2,width:`${budgetUsed}%`,background:budgetUsed>80?"linear-gradient(90deg,#FF6B35,#ff3535)":"linear-gradient(90deg,#00FFB2,#00a876)",transition:"width 0.5s ease"}}/>
              </div>
            </div>
            <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(140px,1fr))",gap:10,marginBottom:20}}>
              {AGENTS.map(agent=><AgentCard key={agent.id} agent={agent} status={agentStates[agent.id].status} task={agentStates[agent.id].task} totalSpent={agentStates[agent.id].spent}/>)}
            </div>
            <div style={{background:"rgba(255,255,255,0.02)",border:"1px solid #141414",borderRadius:12,padding:"18px",marginBottom:14}}>
              <div style={{fontSize:11,color:"#555",textTransform:"uppercase",marginBottom:14}}>Agent Configuration</div>
              <div style={{display:"grid",gridTemplateColumns:"1fr auto",gap:10,marginBottom:12}}>
                <div>
                  <label style={{fontSize:10,color:"#444",textTransform:"uppercase",display:"block",marginBottom:5}}>Task</label>
                  <select value={task} onChange={e=>setTask(e.target.value)} style={{background:"rgba(255,255,255,0.04)",border:"1px solid #1f1f1f",borderRadius:7,color:"#fff",fontSize:12,padding:"9px 12px",width:"100%",outline:"none"}}>
                    {TASKS.map(t=><option key={t}>{t}</option>)}
                  </select>
                </div>
                <div style={{width:120}}>
                  <label style={{fontSize:10,color:"#444",textTransform:"uppercase",display:"block",marginBottom:5}}>Budget</label>
                  <input type="number" value={budget} step="0.5" min="0.5" onChange={e=>setBudget(e.target.value)} style={{background:"rgba(255,255,255,0.04)",border:"1px solid #1f1f1f",borderRadius:7,color:"#fff",fontSize:12,padding:"9px 12px",width:"100%",outline:"none",boxSizing:"border-box"}}/>
                </div>
              </div>
              {isRunning
                ? <button onClick={stopAgent} style={{background:"transparent",border:"1px solid #FF6B3544",color:"#FF6B35",fontSize:12,fontWeight:700,letterSpacing:"0.1em",textTransform:"uppercase",padding:"12px",borderRadius:8,cursor:"pointer",width:"100%"}}>■ Stop Agent</button>
                : <button onClick={startAgent} style={{background:"#00FFB2",border:"none",color:"#080808",fontSize:12,fontWeight:700,letterSpacing:"0.1em",textTransform:"uppercase",padding:"12px",borderRadius:8,cursor:"pointer",width:"100%",boxShadow:"0 0 24px rgba(0,255,178,0.2)"}}>▶ Launch Agent</button>
              }
            </div>
          </div>
        )}

        {/* STREAM TAB */}
        {tab==="stream" && (
          <div>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:18}}>
              <div>
                <div style={{fontSize:13,fontWeight:600,marginBottom:2}}>Live Payment Stream</div>
                <div style={{fontSize:11,color:"#444"}}>Per-inference micropayments · Arc testnet</div>
              </div>
              <div style={{textAlign:"right"}}>
                <div style={{fontSize:9,color:"#444",textTransform:"uppercase"}}>Streaming</div>
                <StreamTicker isActive={streamActive}/>
              </div>
            </div>
            <div style={{background:"rgba(0,0,0,0.4)",border:"1px solid #111",borderRadius:12,padding:14,height:380,overflowY:"auto"}}>
              {logs.length===0
                ? <div style={{textAlign:"center",color:"#2a2a2a",paddingTop:60,fontSize:12}}>{isRunning?"Initializing...":"Launch agent from Dashboard"}</div>
                : <>{logs.map((item,i)=><PaymentLogItem key={item.id} item={item} index={i}/>)}<div ref={logsEndRef}/></>
              }
            </div>
            {logs.length>0 && (
              <div style={{marginTop:12,display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:8}}>
                {["Arc","Base","Polygon"].map(chain=>{
                  const count=logs.filter(l=>l.chain===chain).length;
                  const spent=logs.filter(l=>l.chain===chain).reduce((s,l)=>s+l.amount,0);
                  return <div key={chain} style={{background:"rgba(255,255,255,0.02)",border:"1px solid #141414",borderRadius:8,padding:"10px 12px",textAlign:"center"}}><div style={{fontSize:9,color:"#555",marginBottom:4}}>{chain}</div><div style={{fontSize:13,fontWeight:700,color:"#fff"}}>{count}</div><div style={{fontSize:9,color:"#00FFB2",fontFamily:"monospace"}}>${spent.toFixed(3)}</div></div>;
                })}
              </div>
            )}
          </div>
        )}

        {/* SETTLE TAB */}
        {tab==="settle" && (
          <div>
            <div style={{marginBottom:18}}>
              <div style={{fontSize:13,fontWeight:600,marginBottom:2}}>Autonomous Settlements</div>
              <div style={{fontSize:11,color:"#444"}}>Agent GAMMA settles with onchain counterparties · Arc testnet</div>
            </div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:18}}>
              {[{label:"Total Settled",value:`$${settlements.filter(s=>s.status==="settled").reduce((a,s)=>a+s.amount,0).toFixed(2)}`,color:"#00FFB2"},{label:"Pending",value:`${settlements.filter(s=>s.status==="pending").length}`,color:"#FF6B35"}].map((s,i)=>(
                <div key={i} style={{background:"rgba(255,255,255,0.02)",border:"1px solid #141414",borderRadius:10,padding:"14px 16px"}}><div style={{fontSize:9,color:"#444",textTransform:"uppercase",marginBottom:6}}>{s.label}</div><div style={{fontSize:22,fontWeight:700,color:s.color,fontFamily:"monospace"}}>{s.value}</div></div>
              ))}
            </div>
            <div style={{height:360,overflowY:"auto"}}>
              {settlements.length===0
                ? <div style={{textAlign:"center",color:"#2a2a2a",paddingTop:60,fontSize:12}}>{isRunning?"Negotiating...":"Launch agent from Dashboard"}</div>
                : [...settlements].reverse().map((s,i)=><SettlementCard key={s.id} s={s} index={i}/>)
              }
            </div>
          </div>
        )}
      </div>

      {/* ── FOOTER ── */}
      <footer style={{padding:"10px 20px",borderTop:"1px solid #0e0e0e",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
        <div style={{fontSize:9,color:"#2a2a2a",letterSpacing:"0.1em",textTransform:"uppercase"}}>BOND · Circle Wallets · USDC · CCTP</div>
        <div style={{fontSize:9,color:"#222",fontFamily:"monospace"}}>Arc testnet · 5042002</div>
      </footer>

      {showModal && <WalletModal onClose={()=>setShowModal(false)} onConnected={handleConnected}/>}
      {showPay   && <PayPanel onClose={()=>setShowPay(false)}/>}
    </div>
  );
}
