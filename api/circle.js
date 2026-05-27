
const BASE = "https://api.circle.com/v1/w3s";

// Arc Testnet USDC — hardcoded from Circle API
// ERC20 USDC (6 decimals) — use for transfers
const ARC_USDC_TOKEN_ID = "ef87c8c3-85de-598a-af50-c5135eecfa74";
// Native USDC (18 decimals) — fallback
const ARC_USDC_NATIVE_ID = "15dc2b5d-0994-58b0-bf8c-3a0501148ee8";
const ARC_BLOCKCHAIN = "ARC-TESTNET";

// Cache token IDs to avoid repeated lookups
const tokenCache = {};

async function findUSDC(blockchain, headers) {
  if (tokenCache[blockchain]) return tokenCache[blockchain];
  const r = await fetch(`${BASE}/tokens?blockchain=${blockchain}&pageSize=50`, {
    method: "GET", headers,
  });
  const d = await r.json();
  const tokens = d.data?.tokens || [];
  const usdc = tokens.find(t => t.symbol === "USDC")
            || tokens.find(t => t.symbol?.startsWith("USD"))
            || tokens[0];
  if (usdc?.id) tokenCache[blockchain] = usdc.id;
  return usdc?.id || null;
}

async function getWalletBlockchain(walletId, headers) {
  const r = await fetch(`${BASE}/wallets/${walletId}`, { method:"GET", headers });
  const d = await r.json();
  return d.data?.wallet?.blockchain || "ETH-SEPOLIA";
}

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();

  const { action, userId, walletId, toAddress, amount, chain, destinationChain } = req.body || {};
  const KEY = process.env.CIRCLE_API_KEY;
  const APP = process.env.CIRCLE_APP_ID;
  const H = {
    "Content-Type": "application/json",
    "Authorization": `Bearer ${KEY}`,
  };

  try {
    let r, d;

    if (action === "getAppId") {
      return res.status(200).json({ appId: APP });

    } else if (action === "createUser") {
      r = await fetch(`${BASE}/users`, { method:"POST", headers:H, body:JSON.stringify({ userId }) });
      d = await r.json();

    } else if (action === "getUserToken") {
      r = await fetch(`${BASE}/users/token`, { method:"POST", headers:H, body:JSON.stringify({ userId }) });
      d = await r.json();

    } else if (action === "getWallets") {
      r = await fetch(`${BASE}/wallets?pageSize=50`, { method:"GET", headers:H });
      d = await r.json();

    } else if (action === "initWallet") {
      const wsListR = await fetch(`${BASE}/walletSets?pageSize=10`, { method:"GET", headers:H });
      const wsListD = await wsListR.json();
      let walletSetId = wsListD.data?.walletSets?.[0]?.id;

      if (!walletSetId) {
        const wsR = await fetch(`${BASE}/walletSets`, {
          method:"POST", headers:H,
          body: JSON.stringify({ idempotencyKey: crypto.randomUUID(), name: "BOND Wallets" }),
        });
        const wsD = await wsR.json();
        walletSetId = wsD.data?.walletSet?.id;
      }

      const wListR = await fetch(`${BASE}/wallets?walletSetId=${walletSetId}&pageSize=10`, { method:"GET", headers:H });
      const wListD = await wListR.json();
      const existing = wListD.data?.wallets?.[0];
      if (existing) return res.status(200).json({ data: { wallets: [existing] } });

      r = await fetch(`${BASE}/wallets`, {
        method:"POST", headers:H,
        body: JSON.stringify({
          idempotencyKey: crypto.randomUUID(),
          accountType: "EOA",
          blockchains: ["ETH-SEPOLIA"],
          count: 1,
          walletSetId,
        }),
      });
      d = await r.json();

    } else if (action === "getBalance") {
      const wid = walletId || req.body.walletId;
      r = await fetch(`${BASE}/wallets/${wid}/balances`, { method:"GET", headers:H });
      d = await r.json();

    } else if (action === "listTokens") {
      // Debug: list all tokens for a blockchain
      const bc = chain || "ETH-SEPOLIA";
      r = await fetch(`${BASE}/tokens?blockchain=${bc}&pageSize=50`, { method:"GET", headers:H });
      d = await r.json();
      const tokens = d.data?.tokens?.map(t => ({ id:t.id, symbol:t.symbol, blockchain:t.blockchain }));
      return res.status(200).json({ tokens });

    } else if (action === "sendUSDC") {
      // Use hardcoded Arc testnet USDC ERC20 token ID
      r = await fetch(`${BASE}/transactions/transfer`, {
        method:"POST", headers:H,
        body: JSON.stringify({
          idempotencyKey: crypto.randomUUID(),
          amounts: [parseFloat(amount).toFixed(6)],
          destinationAddress: toAddress,
          feeLevel: "MEDIUM",
          tokenId: ARC_USDC_TOKEN_ID,
          walletId,
        }),
      });
      d = await r.json();
      // If ERC20 fails, try native token
      if (d?.code && d.code !== 0) {
        const r2 = await fetch(`${BASE}/transactions/transfer`, {
          method:"POST", headers:H,
          body: JSON.stringify({
            idempotencyKey: crypto.randomUUID(),
            amounts: [parseFloat(amount).toFixed(18)],
            destinationAddress: toAddress,
            feeLevel: "MEDIUM",
            tokenId: ARC_USDC_NATIVE_ID,
            walletId,
          }),
        });
        d = await r2.json();
      }

    } else if (action === "cctpTransfer") {
      const srcChain = chain || "ETH-SEPOLIA";
      const tokenId = await findUSDC(srcChain, H);
      if (!tokenId) return res.status(400).json({ error: `No USDC on ${srcChain}` });

      r = await fetch(`${BASE}/transactions/transfer`, {
        method:"POST", headers:H,
        body: JSON.stringify({
          idempotencyKey: crypto.randomUUID(),
          amounts: [parseFloat(amount).toFixed(6)],
          destinationAddress: toAddress,
          feeLevel: "MEDIUM",
          tokenId,
          walletId,
        }),
      });
      d = await r.json();

    } else if (action === "requestFaucet") {
      return res.status(200).json({
        fallback: true,
        message: "Get testnet USDC — paste your wallet address at these faucets:",
        address: toAddress,
        links: [
          { name: "Circle USDC Faucet", url: "https://faucet.circle.com" },
          { name: "Alchemy ETH Faucet", url: "https://www.alchemy.com/faucets/ethereum-sepolia" },
        ],
      });

    } else if (action === "getTransactions") {
      r = await fetch(`${BASE}/transactions?walletIds=${walletId}&pageSize=20`, { method:"GET", headers:H });
      d = await r.json();

    } else {
      return res.status(400).json({ error: "Unknown action: " + action });
    }

    return res.status(200).json(d);
  } catch(err) {
    return res.status(500).json({ error: err.message, stack: err.stack });
  }
}
