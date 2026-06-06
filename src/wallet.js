// Arc Testnet chain config
export const ARC_TESTNET = {
  id: 5042002,
  name: "Arc Testnet",
  network: "arc-testnet",
  nativeCurrency: { name: "USDC", symbol: "USDC", decimals: 18 },
  rpcUrls: { default: { http: ["https://rpc.arc.fun"] } },
  blockExplorers: { default: { name: "ArcScan", url: "https://testnet.arcscan.app" } },
};

export const USDC_CONTRACT = "0x3600000000000000000000000000000000000000";

// Add Arc Testnet to MetaMask
export async function addArcNetwork() {
  await window.ethereum.request({
    method: "wallet_addEthereumChain",
    params: [{
      chainId: "0x4CEF52",
      chainName: "Arc Testnet",
      nativeCurrency: { name: "USDC", symbol: "USDC", decimals: 18 },
      rpcUrls: ["https://rpc.arc.fun"],
      blockExplorerUrls: ["https://testnet.arcscan.app"],
    }],
  });
}

// Switch to Arc Testnet
export async function switchToArc() {
  try {
    await window.ethereum.request({
      method: "wallet_switchEthereumChain",
      params: [{ chainId: "0x4CEF52" }],
    });
  } catch(e) {
    if (e.code === 4902) await addArcNetwork();
    else throw e;
  }
}

// Connect wallet
export async function connectWallet() {
  if (!window.ethereum) throw new Error("No wallet found. Install MetaMask or use a Web3 browser.");
  const accounts = await window.ethereum.request({ method: "eth_requestAccounts" });
  await switchToArc();
  return accounts[0];
}

// Get USDC balance
export async function getUSDCBalance(address) {
  try {
    const data = "0x70a08231" + address.replace("0x","").padStart(64,"0");
    const result = await window.ethereum.request({
      method: "eth_call",
      params: [{ to: USDC_CONTRACT, data }, "latest"],
    });
    const balance = parseInt(result, 16) / 1e6;
    return balance.toFixed(4);
  } catch(e) {
    return "0.0000";
  }
}

// Send USDC
export async function sendUSDCWeb3(fromAddress, toAddress, amount) {
  const amountWei = BigInt(Math.floor(parseFloat(amount) * 1e6)).toString(16).padStart(64,"0");
  const to = toAddress.replace("0x","").padStart(64,"0");
  const data = "0xa9059cbb" + to + amountWei;

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

// Listen for account/chain changes
export function onAccountChange(cb) {
  window.ethereum?.on("accountsChanged", cb);
}
export function onChainChange(cb) {
  window.ethereum?.on("chainChanged", cb);
}
