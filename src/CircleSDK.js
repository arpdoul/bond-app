import { W3SSdk } from "@circle-fin/w3s-pw-web-sdk";

let sdk = null;

export function getSDK() {
  if (!sdk) {
    sdk = new W3SSdk();
  }
  return sdk;
}

export async function initSDK(appId) {
  const instance = getSDK();
  await instance.init({
    appId,
    settingsManagement: {
      disableConfirmationUI: false,
    },
  });
  return instance;
}

export async function executeWithPIN(userToken, encryptionKey, challengeId) {
  const instance = getSDK();
  return new Promise((resolve, reject) => {
    instance.setAuthentication({
      userToken,
      encryptionKey,
    });
    instance.execute(challengeId, (error, result) => {
      if (error) return reject(error);
      resolve(result);
    });
  });
}
