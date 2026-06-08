
// Arc Testnet config
export const ARC_CHAIN_ID = "0x4CEF52"; // 5042002 in hex
export const USDC_CONTRACT = "0x3600000000000000000000000000000000000000";

export async function addArcNetwork() {
  await window.ethereum.request({
    method: "wallet_addEthereumChain",
    params: [{
      chainId: ARC_CHAIN_ID,
      chainName: "Arc Testnet",
      nativeCurrency: { name: "ETH", symbol: "ETH", decimals: 18 },
      rpcUrls: ["https://rpc.arc.fun"],
      blockExplorerUrls: ["https://testnet.arcscan.app"],
    }],
  });
}

export async function switchToArc() {
  try {
    await window.ethereum.request({
      method: "wallet_switchEthereumChain",
      params: [{ chainId: ARC_CHAIN_ID }],
    });
  } catch(e) {
    if (e.code === 4902) {
      await addArcNetwork();
    } else {
      throw e;
    }
  }
}

export async function connectWallet() {
  if (!window.ethereum) {
    throw new Error("No Web3 wallet found. Please install MetaMask or use a Web3 browser.");
  }
  const accounts = await window.ethereum.request({ method: "eth_requestAccounts" });
  if (!accounts || accounts.length === 0) throw new Error("No accounts found");
  try {
    await switchToArc();
  } catch(e) {
    console.warn("Could not switch to Arc testnet:", e.message);
  }
  return accounts[0];
}

export async function getUSDCBalance(address) {
  if (!address) return "0.0000";
  try {
    // Try Arc RPC directly
    const data = "0x70a08231" + address.replace("0x","").padStart(64,"0");
    const res = await fetch("https://rpc.arc.fun", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        jsonrpc: "2.0", id: 1,
        method: "eth_call",
        params: [{ to: USDC_CONTRACT, data }, "latest"],
      }),
    });
    const json = await res.json();
    if (json.result && json.result !== "0x") {
      const raw = parseInt(json.result, 16);
      if (!isNaN(raw)) return (raw / 1e6).toFixed(4);
    }
    // Fallback: try via window.ethereum
    if (window.ethereum) {
      const result = await window.ethereum.request({
        method: "eth_call",
        params: [{ to: USDC_CONTRACT, data }, "latest"],
      });
      if (result && result !== "0x") {
        const raw = parseInt(result, 16);
        if (!isNaN(raw)) return (raw / 1e6).toFixed(4);
      }
    }
    return "0.0000";
  } catch(e) {
    console.warn("Balance fetch failed:", e.message);
    return "0.0000";
  }
}

export async function sendUSDCWeb3(fromAddress, toAddress, amount) {
  if (!window.ethereum) throw new Error("No wallet connected");
  const amountHex = Math.floor(parseFloat(amount) * 1e6).toString(16).padStart(64,"0");
  const toHex = toAddress.replace("0x","").padStart(64,"0");
  const data = "0xa9059cbb" + toHex + amountHex;
  const txHash = await window.ethereum.request({
    method: "eth_sendTransaction",
    params: [{
      from: fromAddress,
      to: USDC_CONTRACT,
      data,
      gas: "0x15F90",
    }],
  });
  return txHash;
}
