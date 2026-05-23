const BASE = "https://api.circle.com/v1/w3s";

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();

  const { action, userId, userToken, walletId, toAddress, amount, chain } = req.body || {};
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
      r = await fetch(`${BASE}/users`, {
        method: "POST", headers: H,
        body: JSON.stringify({ userId }),
      });
      d = await r.json();

    } else if (action === "getUserToken") {
      r = await fetch(`${BASE}/users/token`, {
        method: "POST", headers: H,
        body: JSON.stringify({ userId }),
      });
      d = await r.json();

    } else if (action === "initWallet") {
      const wsR = await fetch(`${BASE}/developer/walletSets`, {
        method: "POST", headers: H,
        body: JSON.stringify({
          idempotencyKey: crypto.randomUUID(),
          name: "BOND Agent Wallets",
        }),
      });
      const wsD = await wsR.json();
      const walletSetId = wsD.data?.walletSet?.id;
      r = await fetch(`${BASE}/developer/wallets`, {
        method: "POST", headers: H,
        body: JSON.stringify({
          idempotencyKey: crypto.randomUUID(),
          accountType: "SCA",
          blockchains: ["ETH-SEPOLIA"],
          count: 1,
          walletSetId,
        }),
      });
      d = await r.json();

    } else if (action === "getWallets") {
      r = await fetch(`${BASE}/wallets?blockchain=ETH-SEPOLIA&pageSize=10`, {
        method: "GET", headers: H,
      });
      d = await r.json();

    } else if (action === "getBalance") {
      r = await fetch(`${BASE}/wallets/${walletId}/balances`, {
        method: "GET", headers: H,
      });
      d = await r.json();

    } else if (action === "getTokenId") {
      // Get USDC token ID for ETH-SEPOLIA
      r = await fetch(`${BASE}/tokens?blockchain=ETH-SEPOLIA&pageSize=20`, {
        method: "GET", headers: H,
      });
      d = await r.json();
      const usdc = d.data?.tokens?.find(t => t.symbol === "USDC");
      return res.status(200).json({ tokenId: usdc?.id, token: usdc });

    } else if (action === "sendUSDC") {
      // Get USDC token ID first
      const tR = await fetch(`${BASE}/tokens?blockchain=ETH-SEPOLIA&pageSize=20`, {
        method: "GET", headers: H,
      });
      const tD = await tR.json();
      const usdc = tD.data?.tokens?.find(t => t.symbol === "USDC");
      if (!usdc) return res.status(400).json({ error: "USDC token not found on ETH-SEPOLIA" });

      r = await fetch(`${BASE}/developer/transactions/transfer`, {
        method: "POST", headers: H,
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

    } else if (action === "getTransactions") {
      r = await fetch(`${BASE}/transactions?walletIds=${walletId}&pageSize=20`, {
        method: "GET", headers: H,
      });
      d = await r.json();

    } else if (action === "cctpTransfer") {
      // CCTP cross-chain USDC transfer
      const srcChain = chain || "ETH-SEPOLIA";
      const tR = await fetch(`${BASE}/tokens?blockchain=${srcChain}&pageSize=20`, {
        method: "GET", headers: H,
      });
      const tD = await tR.json();
      const usdc = tD.data?.tokens?.find(t => t.symbol === "USDC");
      if (!usdc) return res.status(400).json({ error: `USDC not found on ${srcChain}` });

      r = await fetch(`${BASE}/developer/transactions/transfer`, {
        method: "POST", headers: H,
        body: JSON.stringify({
          idempotencyKey: crypto.randomUUID(),
          amounts: [amount.toString()],
          destinationAddress: toAddress,
          feeLevel: "MEDIUM",
          tokenId: usdc.id,
          walletId,
          destinationAddressTag: req.body.destinationChain || "MATIC-AMOY",
        }),
      });
      d = await r.json();

    } else if (action === "requestFaucet") {
      // Circle testnet faucet
      r = await fetch("https://api.circle.com/v1/faucet/drips", {
        method: "POST",
        headers: H,
        body: JSON.stringify({
          address: toAddress,
          blockchain: "ETH-SEPOLIA",
          native: false,
          usdc: true,
        }),
      });
      d = await r.json();

    } else {
      return res.status(400).json({ error: "Unknown action" });
    }

    return res.status(200).json(d);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
