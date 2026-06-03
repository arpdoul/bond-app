const API = "/api/circle";

function getToken() { return localStorage.getItem("bond_utoken") || ""; }
function getWid()   { return localStorage.getItem("bond_wid")    || ""; }

async function call(body) {
  const res = await fetch(API, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      userToken: getToken(),
      ...body,
    }),
  });
  return res.json();
}

export const getAppId         = ()                                              => call({ action: "getAppId" });
export const createUser       = (userId)                                        => call({ action: "createUser", userId });
export const getUserToken     = (userId)                                        => call({ action: "getUserToken", userId });
export const initWallet       = (userToken)                                     => call({ action: "initWallet", userToken });
export const getWallets       = (userToken)                                     => call({ action: "getWallets", userToken });
export const getWalletBalance = (walletId, userToken)                           => call({ action: "getBalance", walletId, userToken });
export const getTransactions  = (walletId)                                      => call({ action: "getTransactions", walletId });
export const sendUSDC         = (walletId, toAddress, amount)                   => call({ action: "sendUSDC", walletId, toAddress, amount });
export const cctpTransfer     = (walletId, toAddress, amount, chain, destChain) => call({ action: "cctpTransfer", walletId, toAddress, amount, chain, destinationChain: destChain });
export const requestFaucet    = (toAddress)                                     => call({ action: "requestFaucet", toAddress });
