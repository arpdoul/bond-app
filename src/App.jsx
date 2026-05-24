import { useState, useEffect, useRef, useCallback } from "react";
import { useCircleWallet } from "./useCircleWallet.js";
import WalletModal from "./WalletModal.jsx";
import PayPanel from "./PayPanel.jsx";

const AGENTS = [
  { id: "alpha", name: "Agent ALPHA", role: "Researcher", color: "#00FFB2", icon: "◈" },
  { id: "beta",  name: "Agent BETA",  role: "Negotiator", color: "#FF6B35", icon: "◉" },
  { id: "gamma", name: "Agent GAMMA", role: "Settler",    color: "#A78BFA", icon: "◆" },
];
const SERVICES = [
  { id: "coingecko", name: "CoinGecko API",    price: 0.0004, chain: "Base"     },
  { id: "chainlink", name: "Chainlink Oracle", price: 0.0007, chain: "Ethereum" },
  { id: "openai",    name: "GPT-4o Inference", price: 0.0012, chain: "Polygon"  },
  { id: "pinata",    name: "IPFS Storage",     price: 0.0003, chain: "Base"     },
  { id: "dune",      name: "Dune Analytics",   price: 0.0009, chain: "Arbitrum" },
];
const TASKS = [
  "Research best USDC liquidity pool across chains",
  "Fetch real-time ETH/USD rate and settle invoice",
  "Negotiate batch settlement with 3 counterparties",
  "Stream micropayments for live data feed access",
  "Execute cross-chain arbitrage and settle in USDC",
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
    <div style={{background:"rgba(255,255,255,0.03)",border:`1px solid ${status==="active"?agent.color+"33":"#1a1a1a"}`,borderRadius:12,padding:"16px 18px",transition:"all 0.4s ease"}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:10}}>
        <div style={{display:"flex",alignItems:"center",gap:8}}>
          <span style={{fontSize:20,color:agent.color}}>{agent.icon}</span>
          <div>
            <div style={{fontSize:13,fontWeight:700,color:"#fff"}}>{agent.name}</div>
            <div style={{fontSize:10,color:"#555",textTransform:"uppercase",letterSpacing:"0.1em"}}>{agent.role}</div>
          </div>
        </div>
        <div style={{fontSize:9,fontWeight:700,textTransform:"uppercase",color:sc,padding:"3px 8px",border:`1px solid ${sc}44`,borderRadius:4}}>{status}</div>
      </div>
      {task && <div style={{fontSize:11,color:"#666",marginBottom:10,lineHeight:1.5}}>{task}</div>}
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
        <span style={{fontSize:10,color:"#444"}}>USDC SPENT</span>
        <span style={{fontFamily:"monospace",fontSize:13,color:agent.color}}><AnimCounter value={totalSpent} decimals={4} prefix="$"/></span>
      </div>
    </div>
  );
}
function SettlementCard({ s, index }) {
  const [show, setShow] = useState(false);
  useEffect(()=>{setTimeout(()=>setShow(true),index*120);},[index]);
  return (
    <div style={{opacity:show?1:0,transform:show?"translateX(0)":"translateX(20px)",transition:"all 0.4s ease",background:"rgba(255,255,255,0.02)",border:"1px solid #1f1f1f",borderRadius:10,padding:"14px 16px",marginBottom:8}}>
      <div style={{display:"flex",justifyContent:"space-between",marginBottom:6}}>
        <span style={{fontSize:11,color:"#aaa",fontWeight:600}}>{s.merchant}</span>
        <span style={{fontSize:9,color:s.status==="settled"?"#00FFB2":"#FF6B35",textTransform:"uppercase",border:`1px solid ${s.status==="settled"?"#00FFB244":"#FF6B3544"}`,padding:"2px 6px",borderRadius:3}}>{s.status}</span>
      </div>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
        <span style={{fontFamily:"monospace",fontSize:10,color:"#444"}}>{s.txHash}</span>
        <span style={{fontFamily:"monospace",fontSize:14,color:"#00FFB2",fontWeight:700}}>${s.amount.toFixed(2)}</span>
      </div>
      <div style={{marginTop:6,fontSize:10,color:"#333"}}>via CCTP → {s.chain} · {s.time}</div>
    </div>
  );
}
export default function BondApp() {
  const [tab, setTab] = useState("dashboard");
  const [isRunning, setIsRunning] = useState(false);
  const [task, setTask] = useState(TASKS[0]);
  const [budget, setBudget] = useState("5.00");
  const [logs, setLogs] = useState([]);
  const [settlements, setSettlements] = useState([]);
  const [agentStates, setAgentStates] = useState({
    alpha:{status:"idle",task:null,spent:0},
    beta:{status:"idle",task:null,spent:0},
    gamma:{status:"idle",task:null,spent:0},
  });
  const [totalSpent, setTotalSpent] = useState(0);
  const [streamActive, setStreamActive] = useState(false);
  const [walletConnected, setWalletConnected] = useState(false);
  const [walletAddr, setWalletAddr] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [showPay, setShowPay] = useState(false);
  const intervalRef = useRef(null);
  const logsEndRef = useRef(null);
  const { connect, disconnect, wallet, balance, loading, error, status: walletStatus } = useCircleWallet();

  // Auto-restore wallet state on page load
  useEffect(() => {
    const savedAddr = localStorage.getItem("bond_wallet_addr");
    const savedId   = localStorage.getItem("bond_wallet_id");
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
      const chains=["Ethereum","Base","Polygon","Arbitrum"];
      setTimeout(()=>setSettlements(prev=>[...prev.slice(-10),{merchant:pick(merchants),txHash:generateTxHash(),amount:parseFloat((0.5+Math.random()*4).toFixed(2)),chain:pick(chains),status:Math.random()>0.1?"settled":"pending",time:new Date().toLocaleTimeString("en-US",{hour12:false}),id:Date.now()+Math.random()}]),1200);
    }
  },[addLog]);

  const startAgent=()=>{
    if(!walletConnected){setShowModal(true);return;}
    setIsRunning(true);setStreamActive(true);setLogs([]);setSettlements([]);setTotalSpent(0);
    setAgentStates({alpha:{status:"idle",task:"Initializing...",spent:0},beta:{status:"idle",task:"Standby...",spent:0},gamma:{status:"idle",task:"Standby...",spent:0}});
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
  const TabBtn=({id,label})=>(
    <button onClick={()=>setTab(id)} style={{background:tab===id?"rgba(0,255,178,0.08)":"none",border:"none",cursor:"pointer",fontFamily:"sans-serif",fontSize:12,fontWeight:500,letterSpacing:"0.08em",textTransform:"uppercase",padding:"8px 16px",borderRadius:6,color:tab===id?"#00FFB2":"#444",transition:"all 0.2s"}}>{label}</button>
  );
  return (
    <div style={{minHeight:"100vh",background:"#080808",color:"#fff",fontFamily:"sans-serif",display:"flex",flexDirection:"column"}}>
      <header style={{padding:"16px 24px",borderBottom:"1px solid #111",display:"flex",alignItems:"center",justifyContent:"space-between",background:"rgba(8,8,8,0.95)",position:"sticky",top:0,zIndex:100}}>
        <div style={{display:"flex",alignItems:"center",gap:12}}>
          <div style={{position:"relative"}}>
            <div style={{width:32,height:32,borderRadius:8,background:"linear-gradient(135deg,#00FFB2,#00a876)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:16,fontWeight:900,color:"#080808"}}>B</div>
            {isRunning && <div style={{position:"absolute",top:-2,right:-2,width:8,height:8,borderRadius:"50%",background:"#00FFB2",boxShadow:"0 0 6px #00FFB2"}}/>}
          </div>
          <div>
            <div style={{fontSize:22,letterSpacing:"0.12em",lineHeight:1,color:"#fff",fontWeight:900}}>BOND</div>
            <div style={{fontSize:9,color:"#333",letterSpacing:"0.15em",textTransform:"uppercase"}}>Autonomous Commerce Agent</div>
          </div>
        </div>
        <div style={{display:"flex",alignItems:"center",gap:8}}>
          {isRunning && <div style={{fontSize:11,color:"#00FFB2",padding:"4px 10px",borderRadius:20,border:"1px solid #00FFB222",background:"rgba(0,255,178,0.05)"}}>● LIVE</div>}
          {walletConnected
            ? <div style={{display:"flex",gap:6}}>
    <div style={{fontSize:11,color:"#555",fontFamily:"monospace",padding:"6px 12px",border:"1px solid #1a1a1a",borderRadius:6}}>{walletAddr} · <span style={{color:"#00FFB2"}}>{balance} USDC</span></div>
    <button onClick={()=>setShowPay(true)} style={{background:"rgba(0,255,178,0.1)",border:"1px solid #00FFB233",color:"#00FFB2",fontSize:11,fontWeight:600,padding:"6px 12px",borderRadius:6,cursor:"pointer"}}>Pay</button>
  </div>
            : <button onClick={()=>setShowModal(true)} style={{background:"transparent",border:"1px solid #222",color:"#888",fontSize:11,fontWeight:600,padding:"6px 14px",borderRadius:6,cursor:"pointer",textTransform:"uppercase"}}>Connect Wallet</button>
          }
        </div>
      </header>
      <div style={{display:"flex",gap:4,padding:"12px 24px 0",borderBottom:"1px solid #111"}}>
        <TabBtn id="dashboard" label="Dashboard"/>
        <TabBtn id="stream" label="Payment Stream"/>
        <TabBtn id="settle" label="Settlements"/>
      </div>
      <div style={{flex:1,padding:"24px",maxWidth:900,margin:"0 auto",width:"100%"}}>
        {tab==="dashboard" && (
          <div>
            <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(140px,1fr))",gap:12,marginBottom:24}}>
              {[{label:"Total USDC Spent",value:`$${totalSpent.toFixed(4)}`,color:"#00FFB2"},{label:"Payments Made",value:`${logs.length}`,color:"#A78BFA"},{label:"Settlements",value:`${settlements.filter(s=>s.status==="settled").length}`,color:"#FF6B35"}].map((s,i)=>(
                <div key={i} style={{background:"rgba(255,255,255,0.02)",border:"1px solid #141414",borderRadius:12,padding:"16px 18px"}}>
                  <div style={{fontSize:10,color:"#444",letterSpacing:"0.1em",textTransform:"uppercase",marginBottom:8}}>{s.label}</div>
                  <div style={{fontSize:22,fontWeight:700,color:s.color,fontFamily:"monospace"}}>{s.value}</div>
                </div>
              ))}
            </div>
            <div style={{marginBottom:24}}>
              <div style={{display:"flex",justifyContent:"space-between",marginBottom:6}}>
                <span style={{fontSize:11,color:"#444",textTransform:"uppercase"}}>Budget Consumed</span>
                <span style={{fontSize:11,color:"#666",fontFamily:"monospace"}}>${totalSpent.toFixed(4)} / ${parseFloat(budget||0).toFixed(2)}</span>
              </div>
              <div style={{height:4,background:"#111",borderRadius:2,overflow:"hidden"}}>
                <div style={{height:"100%",borderRadius:2,width:`${budgetUsed}%`,background:budgetUsed>80?"linear-gradient(90deg,#FF6B35,#ff3535)":"linear-gradient(90deg,#00FFB2,#00a876)",transition:"width 0.5s ease"}}/>
              </div>
            </div>
            <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(140px,1fr))",gap:12,marginBottom:24}}>
              {AGENTS.map(agent=><AgentCard key={agent.id} agent={agent} status={agentStates[agent.id].status} task={agentStates[agent.id].task} totalSpent={agentStates[agent.id].spent}/>)}
            </div>
            <div style={{background:"rgba(255,255,255,0.02)",border:"1px solid #141414",borderRadius:12,padding:"20px",marginBottom:16}}>
              <div style={{fontSize:12,color:"#555",letterSpacing:"0.08em",textTransform:"uppercase",marginBottom:16}}>Agent Configuration</div>
              <div style={{display:"grid",gridTemplateColumns:"1fr auto",gap:12,marginBottom:12}}>
                <div>
                  <label style={{fontSize:11,color:"#444",textTransform:"uppercase",display:"block",marginBottom:6}}>Task</label>
                  <select value={task} onChange={e=>setTask(e.target.value)} style={{background:"rgba(255,255,255,0.04)",border:"1px solid #1f1f1f",borderRadius:8,color:"#fff",fontSize:13,padding:"10px 14px",width:"100%",outline:"none"}}>
                    {TASKS.map(t=><option key={t}>{t}</option>)}
                  </select>
                </div>
                <div style={{width:130}}>
                  <label style={{fontSize:11,color:"#444",textTransform:"uppercase",display:"block",marginBottom:6}}>USDC Budget</label>
                  <input type="number" value={budget} step="0.5" min="0.5" onChange={e=>setBudget(e.target.value)} style={{background:"rgba(255,255,255,0.04)",border:"1px solid #1f1f1f",borderRadius:8,color:"#fff",fontSize:13,padding:"10px 14px",width:"100%",outline:"none"}}/>
                </div>
              </div>
              {isRunning
                ? <button onClick={stopAgent} style={{background:"transparent",border:"1px solid #FF6B3544",color:"#FF6B35",fontSize:13,fontWeight:700,letterSpacing:"0.1em",textTransform:"uppercase",padding:"14px 32px",borderRadius:8,cursor:"pointer",width:"100%"}}>■ Stop Agent</button>
                : <button onClick={startAgent} style={{background:"#00FFB2",border:"none",color:"#080808",fontSize:13,fontWeight:700,letterSpacing:"0.1em",textTransform:"uppercase",padding:"14px 32px",borderRadius:8,cursor:"pointer",width:"100%",boxShadow:"0 0 30px rgba(0,255,178,0.25)"}}>▶ Launch Agent</button>
              }
            </div>
            {!walletConnected && <div style={{textAlign:"center",padding:12,fontSize:12,color:"#333",border:"1px dashed #1a1a1a",borderRadius:8}}>Connect your wallet to activate agents and authorize USDC spending</div>}
          </div>
        )}
        {tab==="stream" && (
          <div>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:20}}>
              <div>
                <div style={{fontSize:14,fontWeight:600,marginBottom:2}}>Live Payment Stream</div>
                <div style={{fontSize:11,color:"#444"}}>Per-inference and streaming micropayments via USDC nanopayments</div>
              </div>
              <div style={{textAlign:"right"}}>
                <div style={{fontSize:10,color:"#444",textTransform:"uppercase"}}>Streaming</div>
                <StreamTicker isActive={streamActive}/>
              </div>
            </div>
            <div style={{background:"rgba(0,0,0,0.4)",border:"1px solid #111",borderRadius:12,padding:16,height:420,overflowY:"auto"}}>
              {logs.length===0
                ? <div style={{textAlign:"center",color:"#2a2a2a",paddingTop:80,fontSize:13}}>{isRunning?"Initializing payment stream...":"Launch an agent to start streaming payments"}</div>
                : <>{logs.map((item,i)=><PaymentLogItem key={item.id} item={item} index={i}/>)}<div ref={logsEndRef}/></>
              }
            </div>
            {logs.length>0 && (
              <div style={{marginTop:16,display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:8}}>
                {["Base","Ethereum","Polygon","Arbitrum"].map(chain=>{
                  const count=logs.filter(l=>l.chain===chain).length;
                  const spent=logs.filter(l=>l.chain===chain).reduce((s,l)=>s+l.amount,0);
                  return <div key={chain} style={{background:"rgba(255,255,255,0.02)",border:"1px solid #141414",borderRadius:8,padding:"10px 12px",textAlign:"center"}}><div style={{fontSize:10,color:"#555",marginBottom:4}}>{chain}</div><div style={{fontSize:14,fontWeight:700,color:"#fff"}}>{count}</div><div style={{fontSize:10,color:"#00FFB2",fontFamily:"monospace"}}>${spent.toFixed(3)}</div></div>;
                })}
              </div>
            )}
          </div>
        )}
        {tab==="settle" && (
          <div>
            <div style={{marginBottom:20}}>
              <div style={{fontSize:14,fontWeight:600,marginBottom:2}}>Autonomous Settlements</div>
              <div style={{fontSize:11,color:"#444"}}>Agent GAMMA negotiates and settles with onchain counterparties via CCTP</div>
            </div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:20}}>
              {[{label:"Total Settled",value:`$${settlements.filter(s=>s.status==="settled").reduce((a,s)=>a+s.amount,0).toFixed(2)}`,color:"#00FFB2"},{label:"Pending",value:`${settlements.filter(s=>s.status==="pending").length}`,color:"#FF6B35"}].map((s,i)=>(
                <div key={i} style={{background:"rgba(255,255,255,0.02)",border:"1px solid #141414",borderRadius:10,padding:"14px 16px"}}><div style={{fontSize:10,color:"#444",textTransform:"uppercase",letterSpacing:"0.08em",marginBottom:6}}>{s.label}</div><div style={{fontSize:24,fontWeight:700,color:s.color,fontFamily:"monospace"}}>{s.value}</div></div>
              ))}
            </div>
            <div style={{height:380,overflowY:"auto"}}>
              {settlements.length===0
                ? <div style={{textAlign:"center",color:"#2a2a2a",paddingTop:80,fontSize:13}}>{isRunning?"Agent negotiating with counterparties...":"Launch agent to begin autonomous settlement"}</div>
                : [...settlements].reverse().map((s,i)=><SettlementCard key={s.id} s={s} index={i}/>)
              }
            </div>
          </div>
        )}
      </div>
      <footer style={{padding:"12px 24px",borderTop:"1px solid #0e0e0e",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
        <div style={{fontSize:10,color:"#2a2a2a",letterSpacing:"0.1em",textTransform:"uppercase"}}>BOND · Powered by Circle Wallets · USDC · CCTP</div>
        <div style={{fontSize:10,color:"#222",fontFamily:"monospace"}}>chain id: arc testnet · 5042002</div>
      </footer>
      {showModal && <WalletModal onClose={()=>setShowModal(false)} onConnected={handleConnected}/>}
      {showPay && walletConnected && <PayPanel wallet={wallet} onClose={()=>setShowPay(false)}/>}
    </div>
  );
}
