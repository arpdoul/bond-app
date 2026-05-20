const BASE_URL = "https://api.circle.com/v1/w3s";
const API_KEY = import.meta.env.VITE_CIRCLE_API_KEY;

const headers = {
  "Content-Type": "application/json",
  "Authorization": `Bearer ${API_KEY}`,
};

export async function createUser(userId) {
  const res = await fetch(`${BASE_URL}/users`, {
    method: "POST",
    headers,
    body: JSON.stringify({ userId }),
  });
  return res.json();
}

export async function getUserToken(userId) {
  const res = await fetch(`${BASE_URL}/users/token`, {
    method: "POST",
    headers,
    body: JSON.stringify({ userId }),
  });
  return res.json();
}

export async function createWallet(userToken, encryptionKey, appId) {
  const res = await fetch(`${BASE_URL}/user/wallets`, {
    method: "POST",
    headers: { ...headers, "X-User-Token": userToken },
    body: JSON.stringify({
      idempotencyKey: crypto.randomUUID(),
      accountType: "SCA",
      blockchains: ["ARB-SEPOLIA"],
      metadata: [{ name: "BOND Agent Wallet", refId: appId }],
    }),
  });
  return res.json();
}

export async function getWallets(userToken) {
  const res = await fetch(`${BASE_URL}/user/wallets`, {
    method: "GET",
    headers: { ...headers, "X-User-Token": userToken },
  });
  return res.json();
}

export async function getWalletBalance(userToken, walletId) {
  const res = await fetch(`${BASE_URL}/user/wallets/${walletId}/balances`, {
    method: "GET",
    headers: { ...headers, "X-User-Token": userToken },
  });
  return res.json();
}

export async function sendUSDC(userToken, walletId, toAddress, amount) {
  const res = await fetch(`${BASE_URL}/user/transactions/transfer`, {
    method: "POST",
    headers: { ...headers, "X-User-Token": userToken },
    body: JSON.stringify({
      idempotencyKey: crypto.randomUUID(),
      userId: walletId,
      destinationAddress: toAddress,
      amounts: [amount.toString()],
      feeLevel: "MEDIUM",
      tokenId: "USDC",
      walletId,
    }),
  });
  return res.json();
}

export async function getTransactions(userToken) {
  const res = await fetch(`${BASE_URL}/user/transactions`, {
    method: "GET",
    headers: { ...headers, "X-User-Token": userToken },
  });
  return res.json();
}
