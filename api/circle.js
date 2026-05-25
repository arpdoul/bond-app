
const BASE = "https://api.circle.com/v1/w3s";

// Helper to get USDC token ID for a given blockchain
async function getUSDCTokenId(blockchain, headers) {
  const r = await fetch(`${BASE}/tokens?blockchain=${blockchain}&pageSize=50`, {
    method: "GET", headers,
  });
  const d = await r.json();
  const tokens = d.data?.tokens || [];
  // Try exact USDC match first, then any stablecoin
  const usdc = tokens.find(t => t.symbol === "USDC")
    || tokens.find(t => t.symbol?.includes("USD"))
    || tokens[0];
  return usdc?.id || null;
}

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();

  const {
    action, userId, userToken, walletId,
    toAddress, amount, chain, destinationChain
  } = req.body || {};

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
        method:"POST", headers:H,
        body: JSON.stringify({ userId }),
      });
      d = await r.json();

    } else if (action === "getUserToken") {
      r = await fetch(`${BASE}/users/token`, {
        method:"POST", headers:H,
        body: JSON.stringify({ userId }),
      });
      d = await r.json();

    } else if (action === "getWallets") {
      r = await fetch(`${BASE}/wallets?pageSize=50`, {
        method:"GET", headers:H,
      });
      d = await r.json();

    } else if (action === "initWallet") {
      // Check existing walletSets
      const wsListR = await fetch(`${BASE}/walletSets?pageSize=10`, {
        method:"GET", headers:H,
      });
      const wsListD = await wsListR.json();
      let walletSetId = wsListD.data?.walletSets?.[0]?.id;

      if (!walletSetId) {
        const wsR = await fetch(`${BASE}/walletSets`, {
          method:"POST", headers:H,
          body: JSON.stringify({
            idempotencyKey: crypto.randomUUID(),
            name: "BOND Agent Wallets",
          }),
        });
        const wsD = await wsR.json();
        walletSetId = wsD.data?.walletSet?.id;
      }

      if (!walletSetId) {
        return res.status(500).json({ error: "Could not get or create walletSet" });
      }

      // Check existing wallets
      const wListR = await fetch(`${BASE}/wallets?walletSetId=${walletSetId}&pageSize=10`, {
        method:"GET", headers:H,
      });
      const wListD = await wListR.json();
      const existing = wListD.data?.wallets?.[0];
      if (existing) {
        return res.status(200).json({ data: { wallets: [existing] } });
      }

      // Create new wallet — try ARB-SEPOLIA (Circle supported testnet)
      r = await fetch(`${BASE}/wallets`, {
        method:"POST", headers:H,
        body: JSON.stringify({
          idempotencyKey: crypto.randomUUID(),
          accountType: "SCA",
          blockchains: ["ARB-SEPOLIA"],
          count: 1,
          walletSetId,
        }),
      });
      d = await r.json();

    } else if (action === "getBalance") {
      r = await fetch(`${BASE}/wallets/${walletId}/balances`, {
        method:"GET", headers:H,
      });
      d = await r.json();

    } else if (action === "listTokens") {
      // List all available tokens so frontend can debug
      const blockchain = req.body.blockchain || "ARB-SEPOLIA";
      r = await fetch(`${BASE}/tokens?blockchain=${blockchain}&pageSize=50`, {
        method:"GET", headers:H,
      });
      d = await r.json();

    } else if (action === "sendUSDC") {
      // Get wallet info to find its blockchain
      const wR = await fetch(`${BASE}/wallets/${walletId}`, {
        method:"GET", headers:H,
      });
      const wD = await wR.json();
      const blockchain = wD.data?.wallet?.blockchain || "ARB-SEPOLIA";

      const tokenId = await getUSDCTokenId(blockchain, H);
      if (!tokenId) {
        return res.status(400).json({
          error: `No USDC token found on ${blockchain}. Available tokens listed.`,
        });
      }

      r = await fetch(`${BASE}/transactions/transfer`, {
        method:"POST", headers:H,
        body: JSON.stringify({
          idempotencyKey: crypto.randomUUID(),
          amounts: [amount.toString()],
          destinationAddress: toAddress,
          feeLevel: "MEDIUM",
          tokenId,
          walletId,
        }),
      });
      d = await r.json();

    } else if (action === "cctpTransfer") {
      const srcChain = chain || "ARB-SEPOLIA";
      const tokenId = await getUSDCTokenId(srcChain, H);
      if (!tokenId) {
        return res.status(400).json({ error: `No USDC token on ${srcChain}` });
      }

      r = await fetch(`${BASE}/transactions/transfer`, {
        method:"POST", headers:H,
        body: JSON.stringify({
          idempotencyKey: crypto.randomUUID(),
          amounts: [amount.toString()],
          destinationAddress: toAddress,
          feeLevel: "MEDIUM",
          tokenId,
          walletId,
        }),
      });
      d = await r.json();

    } else if (action === "requestFaucet") {
      // Try Circle faucet
      const fR = await fetch("https://api.circle.com/v1/faucet/drips", {
        method:"POST", headers:H,
        body: JSON.stringify({
          address: toAddress,
          blockchain: "ARB-SEPOLIA",
          native: false,
          usdc: true,
        }),
      });
      const raw = await fR.text();
      try {
        d = JSON.parse(raw);
        if (fR.status === 403 || fR.status === 429 || d?.code === 403) {
          return res.status(200).json({
            fallback: true,
            message: "Use external faucet — Circle faucet requires special access",
            links: [
              { name: "Circle Faucet (USDC)", url: "https://faucet.circle.com" },
              { name: "Arbitrum Sepolia Faucet", url: "https://www.alchemy.com/faucets/arbitrum-sepolia" },
            ],
          });
        }
      } catch(e) {
        return res.status(200).json({
          fallback: true,
          message: "Use external faucet to get testnet USDC",
          links: [
            { name: "Circle Faucet (USDC)", url: "https://faucet.circle.com" },
            { name: "Arbitrum Sepolia Faucet", url: "https://www.alchemy.com/faucets/arbitrum-sepolia" },
          ],
        });
      }

    } else if (action === "getTransactions") {
      r = await fetch(`${BASE}/transactions?walletIds=${walletId}&pageSize=20`, {
        method:"GET", headers:H,
      });
      d = await r.json();

    } else {
      return res.status(400).json({ error: "Unknown action: " + action });
    }

    return res.status(200).json(d);
  } catch(err) {
    return res.status(500).json({ error: err.message });
  }
}
