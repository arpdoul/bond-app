import { useState, useEffect, useRef, useCallback } from "react";
import WalletModal from "./WalletModal.jsx";
import PayPanel from "./PayPanel.jsx";
import AgentChat from "./AgentChat.jsx";
import { getUSDCBalance } from "./wallet.js";

const AGENTS = [
  { id:"alpha", name:"Agent ALPHA", role:"Researcher", color:"#00FFB2", icon:"◈" },
  { id:"beta",  name:"Agent BETA",  role:"Negotiator", color:"#FF6B35", icon:"◉" },
  { id:"gamma", name:"Agent GAMMA", role:"Settler",    color:"#A78BFA", icon:"◆" },
  { id:"trade", name:"Agent TRADE", role:"Trader",     color:"#FFD700", icon:"◎" },
];
const SERVICES = [
  { id:"coingecko", name:"CoinGecko API",    price:0.0004, chain:"Arc" },
  { id:"chainlink", name:"Chainlink Oracle", price:0.0007, chain:"Arc" },
  { id:"openai",    name:"GPT-4o Inference", price:0.0012, chain:"Arc" },
  { id:"pinata",    name:"IPFS Storage",     price:0.0003, chain:"Arc" },
  { id:"dune",      name:"Dune Analytics",   price:0.0009, chain:"Arc" },
];
const TASKS = [
  "Research best USDC liquidity pool across chains",
  "Fetch real-time ETH/USD rate and settle invoice",
  "Negotiate batch settlement with 3 counterparties",
  "Stream micropayments for live data feed access",
  "Execute cross-chain arbitrage and settle in USDC",
];
const TRADE_PAIRS = [
  { symbol:"ETH/USDC", base:"ethereum", color:"#627EEA" },
  { symbol:"BTC/USDC", base:"bitcoin",  color:"#F7931A" },
  { symbol:"SOL/USDC", base:"solana",   color:"#9945FF" },
  { symbol:"ARB/USDC", base:"arbitrum", color:"#28A0F0" },
];
const TABS = [
    { id:"agent",     label:"Agent",      icon:"▲" },
    { id:"trade",     label:"Trade",      icon:"◎" },
    { id:"dashboard", label:"Dashboard",  icon:"○" },
    { id:"stream",    label:"Stream",     icon:"≋" },
    { id:"settle",    label:"Settle",     icon:"◇" },
    { id:"agentnet",  label:"AgentNet",   icon:"⛓" },
    { id:"streampay", label:"Stream Pay", icon:"⏱" },
    { id:"creator",   label:"Creator",    icon:"📄" },
];

function generateTxHash() {
  return "0x"+Array.from({length:12},()=>Math.floor(Math.random()*256).toString(16).padStart(2,"0")).join("");
}

function StreamTicker({ isActive }) {
  const [d,setD]=useState(0);
  useEffect(()=>{
    if(!isActive)return;
    const i=setInterval(()=>setD(p=>p+Math.random()*0.000008),80);
    return()=>clearInterval(i);
  },[isActive]);
  return <span style={{fontFamily:"monospace",color:"#00FFB2"}}>${d.toFixed(6)}</span>;
}

function AgentCard({ agent, status, task, totalSpent }) {
  const sc=status==="active"?agent.color:status==="idle"?"#444":"#FF6B35";
  return (
    <div style={{background:"rgba(255,255,255,0.03)",border:`1px solid ${status==="active"?agent.color+"33":"#1a1a1a"}`,borderRadius:12,padding:"14px 16px",transition:"all 0.4s"}}>
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
      {task&&<div style={{fontSize:10,color:"#666",marginBottom:8,lineHeight:1.5}}>{task}</div>}
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
        <span style={{fontSize:10,color:"#444"}}>USDC SPENT</span>
        <span style={{fontFamily:"monospace",fontSize:12,color:agent.color}}>${totalSpent.toFixed(4)}</span>
      </div>
    </div>
  );
}

function SettlementCard({ s, index }) {
  const [show,setShow]=useState(false);
  useEffect(()=>{setTimeout(()=>setShow(true),index*120);},[index]);
  return (
    <div style={{opacity:show?1:0,transform:show?"translateX(0)":"translateX(20px)",transition:"all 0.4s",background:"rgba(255,255,255,0.02)",border:"1px solid #1f1f1f",borderRadius:10,padding:"12px 14px",marginBottom:8}}>
      <div style={{display:"flex",justifyContent:"space-between",marginBottom:6}}>
        <span style={{fontSize:11,color:"#aaa",fontWeight:600}}>{s.merchant}</span>
        <span style={{fontSize:9,color:s.status==="settled"?"#00FFB2":"#FF6B35",border:`1px solid ${s.status==="settled"?"#00FFB244":"#FF6B3544"}`,padding:"2px 6px",borderRadius:3}}>{s.status}</span>
      </div>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
        <span style={{fontFamily:"monospace",fontSize:10,color:"#444"}}>{s.txHash}</span>
        <span style={{fontFamily:"monospace",fontSize:13,color:"#00FFB2",fontWeight:700}}>${s.amount.toFixed(2)}</span>
      </div>
      <div style={{marginTop:6,fontSize:10,color:"#333"}}>via CCTP → {s.chain} · {s.time}</div>
    </div>
  );
}

function TradeAgent({ walletConnected, onOpenModal }) {
  const [prices,setPrices]=useState({});
  const [tradeLog,setTradeLog]=useState([]);
  const [isTrading,setIsTrading]=useState(false);
  const [strategy,setStrategy]=useState("momentum");
  const [tradeSize,setTradeSize]=useState("1.00");
  const [totalPnl,setTotalPnl]=useState(0);
  const [totalTrades,setTotalTrades]=useState(0);
  const [agentStatus,setStatus]=useState("idle");
  const tradeRef=useRef(null);

  const fetchPrices=useCallback(async()=>{
    try{
      const ids=TRADE_PAIRS.map(p=>p.base).join(",");
      const r=await fetch(`https://api.coingecko.com/api/v3/simple/price?ids=${ids}&vs_currencies=usd&include_24hr_change=true`);
      const d=await r.json();
      const np={};
      TRADE_PAIRS.forEach(p=>{if(d[p.base])np[p.symbol]={price:d[p.base].usd,change24h:d[p.base].usd_24h_change||0};});
      setPrices(np);
    }catch(e){
      setPrices(prev=>{
        const u={...prev};
        TRADE_PAIRS.forEach(p=>{const b=prev[p.symbol]?.price||(p.symbol==="ETH/USDC"?3200:p.symbol==="BTC/USDC"?65000:p.symbol==="SOL/USDC"?180:1.2);u[p.symbol]={price:b*(1+(Math.random()-0.5)*0.002),change24h:(Math.random()-0.5)*5};});
        return u;
      });
    }
  },[]);

  useEffect(()=>{fetchPrices();const i=setInterval(fetchPrices,15000);return()=>clearInterval(i);},[]);

  const runTrade=useCallback(()=>{
    const pick=arr=>arr[Math.floor(Math.random()*arr.length)];
    const pair=pick(TRADE_PAIRS);
    const data=prices[pair.symbol];
    if(!data)return;
    const change=data.change24h||0;
    let action=strategy==="momentum"?(change>0?"BUY":"SELL"):strategy==="mean_revert"?(change<-2?"BUY":change>2?"SELL":"HOLD"):(Math.random()>0.5?"BUY":"SELL");
    if(action==="HOLD")return;
    const size=parseFloat(tradeSize)||1;
    const pnl=action==="BUY"?-size*0.001:size*(Math.random()*0.01-0.003);
    setTotalPnl(p=>p+pnl);setTotalTrades(p=>p+1);
    setTradeLog(prev=>[{id:Date.now()+Math.random(),pair:pair.symbol,action,price:data.price*(1+(Math.random()-0.5)*0.002),size,pnl,time:new Date().toLocaleTimeString("en-US",{hour12:false}),txHash:generateTxHash()},...prev].slice(0,30));
    setStatus(action==="BUY"?"buying":"selling");
    setTimeout(()=>setStatus("watching"),1200);
  },[prices,strategy,tradeSize]);

  const startTrading=()=>{if(!walletConnected){onOpenModal();return;}setIsTrading(true);setStatus("watching");setTradeLog([]);setTotalPnl(0);setTotalTrades(0);tradeRef.current=setInterval(runTrade,3000+Math.random()*2000);};
  const stopTrading=()=>{setIsTrading(false);setStatus("idle");clearInterval(tradeRef.current);};
  useEffect(()=>()=>clearInterval(tradeRef.current),[]);

  const statusColor=agentStatus==="buying"?"#00FFB2":agentStatus==="selling"?"#FF6B35":agentStatus==="watching"?"#FFD700":"#444";

  return (
    <div>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:20}}>
        <div>
          <div style={{fontSize:14,fontWeight:700,color:"#fff",marginBottom:2}}><span style={{color:"#FFD700"}}>◎</span> Agent TRADE</div>
          <div style={{fontSize:11,color:"#444"}}>AI-powered · Settles in USDC on Arc</div>
        </div>
        <div style={{textAlign:"right"}}>
          <div style={{fontSize:9,color:"#444",textTransform:"uppercase",marginBottom:2}}>Status</div>
          <div style={{fontSize:11,fontWeight:700,color:statusColor,textTransform:"uppercase"}}>{agentStatus}</div>
        </div>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:20}}>
        {TRADE_PAIRS.map(pair=>{
          const data=prices[pair.symbol];
          return (
            <div key={pair.symbol} style={{background:"rgba(255,255,255,0.02)",border:"1px solid #141414",borderRadius:10,padding:"12px 14px"}}>
              <div style={{display:"flex",justifyContent:"space-between",marginBottom:4}}>
                <span style={{fontSize:11,color:pair.color,fontWeight:700}}>{pair.symbol}</span>
                <span style={{fontSize:10,color:data?.change24h>=0?"#00FFB2":"#FF6B35"}}>{data?`${data.change24h>=0?"+":""}${data.change24h?.toFixed(2)}%`:"..."}</span>
              </div>
              <div style={{fontSize:18,fontWeight:700,color:"#fff",fontFamily:"monospace"}}>{data?`$${data.price.toLocaleString("en-US",{maximumFractionDigits:2})}`:"Loading..."}</div>
              <div style={{fontSize:9,color:"#333",marginTop:2}}>Arc Testnet · USDC pair</div>
            </div>
          );
        })}
      </div>
      <div style={{background:"rgba(255,255,255,0.02)",border:"1px solid #141414",borderRadius:12,padding:"16px",marginBottom:16}}>
        <div style={{fontSize:11,color:"#555",textTransform:"uppercase",marginBottom:14}}>Agent Configuration</div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:12}}>
          <div>
            <label style={{fontSize:10,color:"#444",textTransform:"uppercase",display:"block",marginBottom:5}}>Strategy</label>
            <select value={strategy} onChange={e=>setStrategy(e.target.value)} style={{background:"rgba(255,255,255,0.04)",border:"1px solid #1f1f1f",borderRadius:6,color:"#fff",fontSize:12,padding:"8px 10px",width:"100%",outline:"none"}}>
              <option value="momentum">Momentum</option>
              <option value="mean_revert">Mean Reversion</option>
              <option value="grid">Grid Trading</option>
            </select>
          </div>
          <div>
            <label style={{fontSize:10,color:"#444",textTransform:"uppercase",display:"block",marginBottom:5}}>Size (USDC)</label>
            <input type="number" value={tradeSize} onChange={e=>setTradeSize(e.target.value)} step="0.5" min="0.1" style={{background:"rgba(255,255,255,0.04)",border:"1px solid #1f1f1f",borderRadius:6,color:"#fff",fontSize:12,padding:"8px 10px",width:"100%",outline:"none",boxSizing:"border-box"}}/>
          </div>
        </div>
        {totalTrades>0&&(
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8,marginBottom:12}}>
            {[{label:"Trades",value:totalTrades,color:"#fff"},{label:"Est. PnL",value:`${totalPnl>=0?"+":""}$${Math.abs(totalPnl).toFixed(2)}`,color:totalPnl>=0?"#00FFB2":"#FF6B35"},{label:"Win Rate",value:`${Math.round((tradeLog.filter(t=>t.pnl>0).length/Math.max(totalTrades,1))*100)}%`,color:"#FFD700"}].map((s,i)=>(
              <div key={i} style={{background:"rgba(0,0,0,0.3)",borderRadius:8,padding:"8px 10px",textAlign:"center"}}>
                <div style={{fontSize:9,color:"#444",marginBottom:4,textTransform:"uppercase"}}>{s.label}</div>
                <div style={{fontSize:14,fontWeight:700,color:s.color,fontFamily:"monospace"}}>{s.value}</div>
              </div>
            ))}
          </div>
        )}
        {isTrading
          ?<button onClick={stopTrading} style={{width:"100%",padding:"12px",background:"transparent",border:"1px solid #FF6B3544",color:"#FF6B35",borderRadius:8,fontSize:13,fontWeight:700,cursor:"pointer"}}>■ Stop Agent TRADE</button>
          :<button onClick={startTrading} style={{width:"100%",padding:"12px",background:"linear-gradient(135deg,#FFD700,#FF8C00)",border:"none",color:"#080808",borderRadius:8,fontSize:13,fontWeight:700,cursor:"pointer",boxShadow:"0 0 24px rgba(255,215,0,0.2)"}}>◎ Launch Trade Agent</button>
        }
      </div>
      <div style={{background:"rgba(0,0,0,0.4)",border:"1px solid #111",borderRadius:12,padding:14,maxHeight:280,overflowY:"auto"}}>
        <div style={{fontSize:10,color:"#333",textTransform:"uppercase",marginBottom:10}}>Live Trade Log</div>
        {tradeLog.length===0
          ?<div style={{textAlign:"center",color:"#2a2a2a",padding:"40px 0",fontSize:12}}>{isTrading?"Agent scanning markets...":"Launch agent to start trading"}</div>
          :tradeLog.map(t=>(
            <div key={t.id} style={{display:"flex",alignItems:"center",gap:8,padding:"7px 10px",borderLeft:`2px solid ${t.action==="BUY"?"#00FFB2":"#FF6B35"}22`,marginBottom:4,background:"rgba(255,255,255,0.02)",borderRadius:"0 6px 6px 0",fontSize:11}}>
              <span style={{color:t.action==="BUY"?"#00FFB2":"#FF6B35",fontWeight:700,fontSize:10,minWidth:30}}>{t.action}</span>
              <span style={{color:"#888",fontFamily:"monospace",fontSize:10}}>{t.time}</span>
              <span style={{color:"#aaa",flex:1}}>{t.pair}</span>
              <span style={{color:t.pnl>=0?"#00FFB2":"#FF6B35",fontFamily:"monospace",fontSize:10}}>{t.pnl>=0?"+":""}{t.pnl.toFixed(3)}</span>
            </div>
          ))
        }
      </div>
    </div>
  );
}

export default function BondApp() {
  const [tab,setTab]             = useState("agent");
  const [isRunning,setIsRunning] = useState(false);
  const [task,setTask]           = useState(TASKS[0]);
  const [budget,setBudget]       = useState("5.00");
  const [logs,setLogs]           = useState([]);
  const [settlements,setSettlements] = useState([]);
  const [agentStates,setAgentStates] = useState({
    alpha:{status:"idle",task:null,spent:0},
    beta:{status:"idle",task:null,spent:0},
    gamma:{status:"idle",task:null,spent:0},
    trade:{status:"idle",task:null,spent:0},
  });
  const [totalSpent,setTotalSpent]     = useState(0);
  const [streamActive,setStreamActive] = useState(false);
  const [walletConnected,setWalletConnected] = useState(()=>!!localStorage.getItem("bond_waddr"));
  const [walletAddr,setWalletAddr]     = useState(()=>localStorage.getItem("bond_waddr")||"");
  const [balance,setBalance]           = useState(()=>localStorage.getItem("bond_wbal")||"0.00");
  const [showModal,setShowModal]       = useState(false);
  const [showPay,setShowPay]           = useState(false);
  const [showMenu,setShowMenu]         = useState(false);
  const intervalRef = useRef(null);
  const logsEndRef  = useRef(null);

  // Auto-restore wallet on load
  useEffect(()=>{
    const addr=localStorage.getItem("bond_waddr");
    if(addr){
      setWalletConnected(true);
      setWalletAddr(addr);
      // Refresh balance
      getUSDCBalance(addr).then(bal=>{
        setBalance(bal);
        localStorage.setItem("bond_wbal",bal);
      }).catch(()=>{});
    }
    // Listen for wallet changes
    if(window.ethereum){
      window.ethereum.on("accountsChanged",accounts=>{
        if(accounts.length===0){
          setWalletConnected(false);setWalletAddr("");setBalance("0.00");
          localStorage.removeItem("bond_waddr");localStorage.removeItem("bond_wbal");
        } else {
          setWalletAddr(accounts[0]);
          localStorage.setItem("bond_waddr",accounts[0]);
          getUSDCBalance(accounts[0]).then(bal=>{setBalance(bal);localStorage.setItem("bond_wbal",bal);}).catch(()=>{});
        }
      });
    }
  },[]);

  useEffect(()=>{if(logsEndRef.current)logsEndRef.current.scrollIntoView({behavior:"smooth"});},[logs]);

  const addLog=useCallback((agentId,service,amount,type,chain)=>{
    const time=new Date().toLocaleTimeString("en-US",{hour12:false});
    setLogs(prev=>[...prev.slice(-50),{agentId,service,amount,type,chain,time,id:Date.now()+Math.random()}]);
    setTotalSpent(prev=>prev+amount);
    setAgentStates(prev=>({...prev,[agentId]:{...prev[agentId],spent:prev[agentId].spent+amount}}));
  },[]);

  const runCycle=useCallback(()=>{
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
      setTimeout(()=>setSettlements(prev=>[...prev.slice(-10),{merchant:pick(merchants),txHash:generateTxHash(),amount:parseFloat((0.5+Math.random()*4).toFixed(2)),chain:"Arc",status:Math.random()>0.1?"settled":"pending",time:new Date().toLocaleTimeString("en-US",{hour12:false}),id:Date.now()+Math.random()}]),1200);
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
    const addr=result?.wallet?.address||result?.wallet?.id||"";
    setWalletConnected(true);
    setWalletAddr(addr);
    setBalance(result?.balance||localStorage.getItem("bond_wbal")||"0.00");
    setShowModal(false);
  };
  useEffect(()=>()=>clearInterval(intervalRef.current),[]);
  const budgetUsed=Math.min((totalSpent/parseFloat(budget||1))*100,100);

  return (
    <div style={{minHeight:"100vh",background:"#080808",color:"#fff",fontFamily:"sans-serif",display:"flex",flexDirection:"column"}}>
      {/* HEADER */}
      <header style={{padding:"10px 14px",borderBottom:"1px solid #111",display:"flex",alignItems:"center",justifyContent:"space-between",background:"rgba(8,8,8,0.97)",position:"sticky",top:0,zIndex:100}}>
        {/* Logo */}
        <div style={{display:"flex",alignItems:"center",gap:8,flexShrink:0}}>
          <div style={{position:"relative"}}>
            <div style={{width:28,height:28,borderRadius:7,background:"linear-gradient(135deg,#00FFB2,#00a876)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:14,fontWeight:900,color:"#080808"}}>B</div>
            {isRunning&&<div style={{position:"absolute",top:-2,right:-2,width:7,height:7,borderRadius:"50%",background:"#00FFB2",boxShadow:"0 0 6px #00FFB2"}}/>}
          </div>
          <span style={{fontSize:18,letterSpacing:"0.1em",color:"#fff",fontWeight:900}}>BOND</span>
        </div>

        {/* Right: hamburger + wallet */}
        <div style={{display:"flex",alignItems:"center",gap:6,flexShrink:0}}>

          {/* HAMBURGER MENU */}
          <div style={{position:"relative"}}>
            <button
              onClick={()=>setShowMenu(p=>!p)}
              style={{background:"rgba(255,255,255,0.08)",border:"1px solid #2a2a2a",borderRadius:8,padding:"7px 10px",cursor:"pointer",display:"flex",alignItems:"center",gap:6}}>
              <div style={{display:"flex",flexDirection:"column",gap:"4px"}}>
                <div style={{width:16,height:2,background:"#fff",borderRadius:1}}/>
                <div style={{width:16,height:2,background:"#fff",borderRadius:1}}/>
                <div style={{width:16,height:2,background:"#fff",borderRadius:1}}/>
              </div>
              <span style={{fontSize:10,color:"#00FFB2",fontWeight:700}}>
                {TABS.find(t=>t.id===tab)?.label||"Menu"}
              </span>
            </button>
            {showMenu&&(
              <div style={{position:"absolute",top:"calc(100% + 8px)",right:0,background:"#111",border:"1px solid #222",borderRadius:12,padding:"6px",minWidth:160,zIndex:999,boxShadow:"0 16px 40px rgba(0,0,0,0.9)"}}>
                {TABS.map(t=>(
                  <button key={t.id} onClick={()=>{setTab(t.id);setShowMenu(false);}}
                    style={{display:"flex",alignItems:"center",gap:10,width:"100%",background:tab===t.id?"rgba(0,255,178,0.1)":"none",border:"none",cursor:"pointer",fontFamily:"sans-serif",fontSize:13,fontWeight:600,padding:"11px 14px",borderRadius:8,color:tab===t.id?"#00FFB2":"#888",textAlign:"left",marginBottom:2}}>
                    <span style={{fontSize:16}}>{t.icon}</span>{t.label}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* WALLET */}
          {walletConnected
            ?<div style={{display:"flex",gap:4,alignItems:"center"}}>
               <button onClick={()=>setShowModal(true)} style={{fontSize:9,color:"#555",fontFamily:"monospace",padding:"4px 8px",border:"1px solid #1a1a1a",borderRadius:6,maxWidth:85,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",background:"transparent",cursor:"pointer"}}>
                 {walletAddr.slice(0,6)}...<span style={{color:"#00FFB2"}}> {parseFloat(balance).toFixed(1)}</span>
               </button>
               <button onClick={()=>setShowPay(true)} style={{background:"rgba(0,255,178,0.1)",border:"1px solid #00FFB233",color:"#00FFB2",fontSize:10,fontWeight:700,padding:"5px 10px",borderRadius:6,cursor:"pointer"}}>Pay</button>
             </div>
            :<button onClick={()=>setShowModal(true)} style={{background:"#00FFB2",border:"none",color:"#080808",fontSize:11,fontWeight:700,padding:"7px 14px",borderRadius:7,cursor:"pointer"}}>
               Connect
             </button>
          }
        </div>
      </header>

      {/* CONTENT */}
      <div style={{flex:1,padding:"20px",maxWidth:900,margin:"0 auto",width:"100%",boxSizing:"border-box"}}>

        {tab==="agent"&&(
          <AgentChat walletConnected={walletConnected} walletAddress={walletAddr} balance={balance} onBalanceRefresh={()=>getUSDCBalance(walletAddr).then(b=>{setBalance(b);localStorage.setItem("bond_wbal",b);}).catch(()=>{})}/>
        )}

        {tab==="trade"&&(
          <TradeAgent walletConnected={walletConnected} onOpenModal={()=>setShowModal(true)}/>
        )}

        {tab==="dashboard"&&(
          <div>
            <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(120px,1fr))",gap:10,marginBottom:20}}>
              {[{label:"USDC Spent",value:`$${totalSpent.toFixed(4)}`,color:"#00FFB2"},{label:"Payments",value:`${logs.length}`,color:"#A78BFA"},{label:"Settlements",value:`${settlements.filter(s=>s.status==="settled").length}`,color:"#FF6B35"}].map((s,i)=>(
                <div key={i} style={{background:"rgba(255,255,255,0.02)",border:"1px solid #141414",borderRadius:12,padding:"14px 16px"}}>
                  <div style={{fontSize:9,color:"#444",textTransform:"uppercase",marginBottom:8}}>{s.label}</div>
                  <div style={{fontSize:20,fontWeight:700,color:s.color,fontFamily:"monospace"}}>{s.value}</div>
                </div>
              ))}
            </div>
            <div style={{marginBottom:20}}>
              <div style={{display:"flex",justifyContent:"space-between",marginBottom:6}}>
                <span style={{fontSize:10,color:"#444",textTransform:"uppercase"}}>Budget</span>
                <span style={{fontSize:10,color:"#666",fontFamily:"monospace"}}>${totalSpent.toFixed(4)} / ${parseFloat(budget||0).toFixed(2)}</span>
              </div>
              <div style={{height:3,background:"#111",borderRadius:2,overflow:"hidden"}}>
                <div style={{height:"100%",borderRadius:2,width:`${budgetUsed}%`,background:budgetUsed>80?"linear-gradient(90deg,#FF6B35,#ff3535)":"linear-gradient(90deg,#00FFB2,#00a876)",transition:"width 0.5s"}}/>
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
                <div style={{width:110}}>
                  <label style={{fontSize:10,color:"#444",textTransform:"uppercase",display:"block",marginBottom:5}}>Budget</label>
                  <input type="number" value={budget} step="0.5" min="0.5" onChange={e=>setBudget(e.target.value)} style={{background:"rgba(255,255,255,0.04)",border:"1px solid #1f1f1f",borderRadius:7,color:"#fff",fontSize:12,padding:"9px 12px",width:"100%",outline:"none",boxSizing:"border-box"}}/>
                </div>
              </div>
              {isRunning
                ?<button onClick={stopAgent} style={{background:"transparent",border:"1px solid #FF6B3544",color:"#FF6B35",fontSize:12,fontWeight:700,padding:"12px",borderRadius:8,cursor:"pointer",width:"100%"}}>■ Stop Agent</button>
                :<button onClick={startAgent} style={{background:"#00FFB2",border:"none",color:"#080808",fontSize:12,fontWeight:700,padding:"12px",borderRadius:8,cursor:"pointer",width:"100%"}}>▶ Launch Agent</button>
              }
            </div>
          </div>
        )}

        {tab==="stream"&&(
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
                ?<div style={{textAlign:"center",color:"#2a2a2a",paddingTop:60,fontSize:12}}>{isRunning?"Initializing...":"Launch agent from Dashboard"}</div>
                :<>{logs.map((item,i)=>(
                  <div key={item.id} style={{display:"flex",alignItems:"center",gap:10,padding:"8px 12px",borderLeft:`2px solid ${AGENTS.find(a=>a.id===item.agentId)?.color||"#00FFB2"}22`,marginBottom:4,background:"rgba(255,255,255,0.02)",borderRadius:"0 6px 6px 0",fontSize:12}}>
                    <span style={{color:AGENTS.find(a=>a.id===item.agentId)?.color,fontSize:14}}>{AGENTS.find(a=>a.id===item.agentId)?.icon}</span>
                    <span style={{color:"#888",fontFamily:"monospace",fontSize:11}}>{item.time}</span>
                    <span style={{color:"#ccc",flex:1}}>{item.service}</span>
                    <span style={{color:"#00FFB2",fontFamily:"monospace"}}>${item.amount.toFixed(4)}</span>
                  </div>
                ))}<div ref={logsEndRef}/></>
              }
            </div>
          </div>
        )}

        {tab==="settle"&&(
          <div>
            <div style={{marginBottom:18}}>
              <div style={{fontSize:13,fontWeight:600,marginBottom:2}}>Autonomous Settlements</div>
              <div style={{fontSize:11,color:"#444"}}>Agent GAMMA settles with counterparties · Arc testnet</div>
            </div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:18}}>
              {[{label:"Total Settled",value:`$${settlements.filter(s=>s.status==="settled").reduce((a,s)=>a+s.amount,0).toFixed(2)}`,color:"#00FFB2"},{label:"Pending",value:`${settlements.filter(s=>s.status==="pending").length}`,color:"#FF6B35"}].map((s,i)=>(
                <div key={i} style={{background:"rgba(255,255,255,0.02)",border:"1px solid #141414",borderRadius:10,padding:"14px 16px"}}>
                  <div style={{fontSize:9,color:"#444",textTransform:"uppercase",marginBottom:6}}>{s.label}</div>
                  <div style={{fontSize:22,fontWeight:700,color:s.color,fontFamily:"monospace"}}>{s.value}</div>
                </div>
              ))}
            </div>
            <div style={{height:360,overflowY:"auto"}}>
              {settlements.length===0
                ?<div style={{textAlign:"center",color:"#2a2a2a",paddingTop:60,fontSize:12}}>{isRunning?"Negotiating...":"Launch agent from Dashboard"}</div>
                :[...settlements].reverse().map((s,i)=><SettlementCard key={s.id} s={s} index={i}/>)
              }
            </div>
          </div>
        )}
      </div>

      {/* FOOTER */}
      <footer style={{padding:"10px 20px",borderTop:"1px solid #0e0e0e",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
        <div style={{fontSize:9,color:"#2a2a2a",textTransform:"uppercase"}}>BOND · Web3 · USDC · Arc</div>
        <div style={{fontSize:9,color:"#222",fontFamily:"monospace"}}>Arc testnet · 5042002</div>
      </footer>

      {showModal&&<WalletModal
        onClose={()=>setShowModal(false)}
        onConnected={handleConnected}
        isConnected={walletConnected}
        currentAddress={walletAddr}
        onDisconnect={()=>{
          setWalletConnected(false);
          setWalletAddr("");
          setBalance("0.00");
        }}
      />}
      {showPay&&<PayPanel onClose={()=>setShowPay(false)}/>}
    </div>
  );
}
