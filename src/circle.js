const API = "/api/circle";
async function call(body) {
  const res = await fetch(API, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return res.json();
}
export const getAppId         = ()                                    => call({ action: "getAppId" });
export const createUser       = (userId)                              => call({ action: "createUser", userId });
export const getUserToken     = (userId)                              => call({ action: "getUserToken", userId });
export const initWallet       = ()                                    => call({ action: "initWallet" });
export const getWallets       = ()                                    => call({ action: "getWallets" });
export const getWalletBalance = (walletId)                            => call({ action: "getBalance", walletId });
export const getTransactions  = (walletId)                            => call({ action: "getTransactions", walletId });
export const sendUSDC         = (walletId, toAddress, amount)         => call({ action: "sendUSDC", walletId, toAddress, amount });
export const cctpTransfer     = (walletId, toAddress, amount, chain, destinationChain) => call({ action: "cctpTransfer", walletId, toAddress, amount, chain, destinationChain });
export const requestFaucet    = (toAddress)                           => call({ action: "requestFaucet", toAddress });
