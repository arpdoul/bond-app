const API = "/api/circle";

async function call(body) {
  const res = await fetch(API, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return res.json();
}

export async function createUser(userId) {
  return call({ action: "createUser", userId });
}

export async function getUserToken(userId) {
  return call({ action: "getUserToken", userId });
}

export async function getWallets(userToken) {
  return call({ action: "getWallets", userToken });
}

export async function getWalletBalance(userToken, walletId) {
  return call({ action: "getBalance", userToken, walletId });
}

export async function sendUSDC(userToken, walletId, toAddress, amount) {
  return call({ action: "sendUSDC", userToken, walletId, toAddress, amount });
}
