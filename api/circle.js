const BASE_URL = "https://api.circle.com/v1/w3s";

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();

  const body = req.body || {};
  const { action, userId, userToken, walletId, toAddress, amount } = body;
  const API_KEY = process.env.CIRCLE_API_KEY;
  const APP_ID  = process.env.CIRCLE_APP_ID;

  const headers = {
    "Content-Type": "application/json",
    "Authorization": `Bearer ${API_KEY}`,
  };

  try {
    let response, data;

    if (action === "createUser") {
      response = await fetch(`${BASE_URL}/users`, {
        method: "POST", headers,
        body: JSON.stringify({ userId }),
      });
      data = await response.json();

    } else if (action === "getUserToken") {
      response = await fetch(`${BASE_URL}/users/token`, {
        method: "POST", headers,
        body: JSON.stringify({ userId }),
      });
      data = await response.json();

    } else if (action === "initWallet") {
      // Create wallet set first
      const wsRes = await fetch(`${BASE_URL}/developer/walletSets`, {
        method: "POST", headers,
        body: JSON.stringify({
          idempotencyKey: crypto.randomUUID(),
          name: "BOND Agent Wallets",
        }),
      });
      const wsData = await wsRes.json();
      const walletSetId = wsData.data?.walletSet?.id;

      // Create wallet for user
      response = await fetch(`${BASE_URL}/developer/wallets`, {
        method: "POST", headers,
        body: JSON.stringify({
          idempotencyKey: crypto.randomUUID(),
          accountType: "SCA",
          blockchains: ["ETH-SEPOLIA"],
          count: 1,
          walletSetId,
        }),
      });
      data = await response.json();

    } else if (action === "getWallets") {
      response = await fetch(`${BASE_URL}/wallets?blockchain=ETH-SEPOLIA`, {
        method: "GET", headers,
      });
      data = await response.json();

    } else if (action === "getBalance") {
      response = await fetch(`${BASE_URL}/wallets/${walletId}/balances`, {
        method: "GET", headers,
      });
      data = await response.json();

    } else if (action === "sendUSDC") {
      response = await fetch(`${BASE_URL}/developer/transactions/transfer`, {
        method: "POST", headers,
        body: JSON.stringify({
          idempotencyKey: crypto.randomUUID(),
          amounts: [amount.toString()],
          destinationAddress: toAddress,
          feeLevel: "MEDIUM",
          tokenId: process.env.USDC_TOKEN_ID || "",
          walletId,
        }),
      });
      data = await response.json();

    } else if (action === "getTransactions") {
      response = await fetch(`${BASE_URL}/transactions?walletIds=${walletId}`, {
        method: "GET", headers,
      });
      data = await response.json();

    } else if (action === "getAppId") {
      return res.status(200).json({ appId: APP_ID });

    } else {
      return res.status(400).json({ error: "Unknown action" });
    }

    return res.status(200).json(data);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
