// Developer-controlled wallets do not require PIN UI
// PIN flow is only needed for user-controlled wallets
export async function initSDK(appId) {
  return Promise.resolve(true);
}
export async function executeWithPIN(userToken, encryptionKey, challengeId) {
  return Promise.resolve(true);
}
