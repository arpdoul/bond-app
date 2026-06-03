import crypto from "node:crypto";

const BASE = "https://api.circle.com/v1/w3s";

const ARC_USDC_TOKEN_ID  = "ef87c8c3-85de-598a-af50-c5135eecfa74";
const ARC_USDC_NATIVE_ID = "15dc2b5d-0994-58b0-bf8c-3a0501148ee8";

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
      // User-controlled: create wallet via challenge
      r = await fetch(`${BASE}/user/wallets`, {
        method: "POST",
        headers: { ...H, "X-User-Token": userToken },
        body: JSON.stringify({
          idempotencyKey: crypto.randomUUID(),
          accountType: "SCA",
          blockchains: ["ARC-TESTNET"],
        }),
      });
      d = await r.json();

    } else if (action === "getWallets") {
      r = await fetch(`${BASE}/user/wallets`, {
        method: "GET",
        headers: { ...H, "X-User-Token": userToken },
      });
      d = await r.json();

    } else if (action === "getBalance") {
      r = await fetch(`${BASE}/user/wallets/${walletId}/balances`, {
        method: "GET",
        headers: { ...H, "X-User-Token": userToken },
      });
      d = await r.json();

    } else if (action === "sendUSDC") {
      // User-controlled transfer — returns challengeId for PIN
      r = await fetch(`${BASE}/user/transactions/transfer`, {
        method: "POST",
        headers: { ...H, "X-User-Token": userToken },
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
      if (d?.code && d.code !== 0) {
        // Try native token
        r = await fetch(`${BASE}/user/transactions/transfer`, {
          method: "POST",
          headers: { ...H, "X-User-Token": userToken },
          body: JSON.stringify({
            idempotencyKey: crypto.randomUUID(),
            amounts: [parseFloat(amount).toFixed(6)],
            destinationAddress: toAddress,
            feeLevel: "MEDIUM",
            tokenId: ARC_USDC_NATIVE_ID,
            walletId,
          }),
        });
        d = await r.json();
      }

    } else if (action === "cctpTransfer") {
      r = await fetch(`${BASE}/user/transactions/transfer`, {
        method: "POST",
        headers: { ...H, "X-User-Token": userToken },
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

    } else if (action === "getTransactions") {
      r = await fetch(`${BASE}/user/transactions?walletIds=${walletId}`, {
        method: "GET",
        headers: { ...H, "X-User-Token": userToken },
      });
      d = await r.json();

    } else if (action === "requestFaucet") {
      return res.status(200).json({
        fallback: true,
        message: "Get testnet USDC from these faucets:",
        links: [
          { name: "Circle USDC Faucet", url: "https://faucet.circle.com" },
          { name: "Arc Testnet Faucet", url: "https://faucet.arc.fun" },
        ],
      });

    } else {
      return res.status(400).json({ error: "Unknown action: " + action });
    }

    return res.status(200).json(d);
  } catch(err) {
    return res.status(500).json({ error: err.message });
  }
}
