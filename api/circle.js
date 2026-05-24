
const BASE = "https://api.circle.com/v1/w3s";

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();

  const { action, userId, userToken, walletId, toAddress, amount, chain, destinationChain } = req.body || {};
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
      // Get ALL developer wallets
      r = await fetch(`${BASE}/wallets?pageSize=50`, { method:"GET", headers:H });
      d = await r.json();

    } else if (action === "initWallet") {
      // Check if walletSet already exists
      const wsListR = await fetch(`${BASE}/walletSets?pageSize=10`, { method:"GET", headers:H });
      const wsListD = await wsListR.json();
      let walletSetId = wsListD.data?.walletSets?.[0]?.id;

      // Create walletSet only if none exists
      if (!walletSetId) {
        const wsR = await fetch(`${BASE}/walletSets`, {
          method:"POST", headers:H,
          body: JSON.stringify({ idempotencyKey: crypto.randomUUID(), name:"BOND Agent Wallets" }),
        });
        const wsD = await wsR.json();
        walletSetId = wsD.data?.walletSet?.id;
      }

      if (!walletSetId) return res.status(500).json({ error: "Could not get or create walletSet" });

      // Check if wallet already exists in this walletSet
      const wListR = await fetch(`${BASE}/wallets?walletSetId=${walletSetId}&pageSize=10`, { method:"GET", headers:H });
      const wListD = await wListR.json();
      const existing = wListD.data?.wallets?.[0];

      if (existing) {
        // Return existing wallet instead of creating new one
        return res.status(200).json({ data: { wallets: [existing] } });
      }

      // Create wallet only if none in this walletSet
      r = await fetch(`${BASE}/wallets`, {
        method:"POST", headers:H,
        body: JSON.stringify({
          idempotencyKey: crypto.randomUUID(),
          accountType: "SCA",
          blockchains: ["ETH-SEPOLIA"],
          count: 1,
          walletSetId,
        }),
      });
      d = await r.json();

    } else if (action === "getBalance") {
      r = await fetch(`${BASE}/wallets/${walletId}/balances`, { method:"GET", headers:H });
      d = await r.json();

    } else if (action === "getTokenId") {
      r = await fetch(`${BASE}/tokens?blockchain=ETH-SEPOLIA&pageSize=20`, { method:"GET", headers:H });
      d = await r.json();
      const usdc = d.data?.tokens?.find(t => t.symbol === "USDC");
      return res.status(200).json({ tokenId: usdc?.id, token: usdc });

    } else if (action === "sendUSDC") {
      const tR = await fetch(`${BASE}/tokens?blockchain=ETH-SEPOLIA&pageSize=20`, { method:"GET", headers:H });
      const tD = await tR.json();
      const usdc = tD.data?.tokens?.find(t => t.symbol === "USDC");
      if (!usdc) return res.status(400).json({ error: "USDC token not found on ETH-SEPOLIA" });
      r = await fetch(`${BASE}/transactions/transfer`, {
        method:"POST", headers:H,
        body: JSON.stringify({
          idempotencyKey: crypto.randomUUID(),
          amounts: [amount.toString()],
          destinationAddress: toAddress,
          feeLevel: "MEDIUM",
          tokenId: usdc.id,
          walletId,
        }),
      });
      d = await r.json();

    } else if (action === "cctpTransfer") {
      const srcChain = chain || "ETH-SEPOLIA";
      const tR = await fetch(`${BASE}/tokens?blockchain=${srcChain}&pageSize=20`, { method:"GET", headers:H });
      const tD = await tR.json();
      const usdc = tD.data?.tokens?.find(t => t.symbol === "USDC");
      if (!usdc) return res.status(400).json({ error: `USDC not found on ${srcChain}` });
      r = await fetch(`${BASE}/transactions/transfer`, {
        method:"POST", headers:H,
        body: JSON.stringify({
          idempotencyKey: crypto.randomUUID(),
          amounts: [amount.toString()],
          destinationAddress: toAddress,
          feeLevel: "MEDIUM",
          tokenId: usdc.id,
          walletId,
          destinationAddressTag: destinationChain || "MATIC-AMOY",
        }),
      });
      d = await r.json();

    } else if (action === "requestFaucet") {
      r = await fetch("https://api.circle.com/v1/faucet/drips", {
        method:"POST", headers:H,
        body: JSON.stringify({
          address: toAddress,
          blockchain: "ETH-SEPOLIA",
          native: false,
          usdc: true,
        }),
      });
      d = await r.json();

    } else if (action === "getTransactions") {
      r = await fetch(`${BASE}/transactions?walletIds=${walletId}&pageSize=20`, { method:"GET", headers:H });
      d = await r.json();

    } else {
      return res.status(400).json({ error: "Unknown action: " + action });
    }

    return res.status(200).json(d);
  } catch(err) {
    return res.status(500).json({ error: err.message });
  }
}
