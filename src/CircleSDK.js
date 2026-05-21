// Circle PIN UI is loaded via CDN script tag instead of npm
export async function initSDK(appId) {
  return new Promise((resolve) => {
    if (window.W3SSdk) {
      const sdk = new window.W3SSdk();
      sdk.init({ appId }).then(() => resolve(sdk));
    } else {
      const script = document.createElement("script");
      script.src = "https://cdn.jsdelivr.net/npm/@circle-fin/w3s-pw-web-sdk/dist/browser.min.js";
      script.onload = () => {
        const sdk = new window.W3SSdk();
        sdk.init({ appId }).then(() => resolve(sdk));
      };
      document.head.appendChild(script);
    }
  });
}

export async function executeWithPIN(userToken, encryptionKey, challengeId) {
  return new Promise((resolve, reject) => {
    if (!window.W3SSdk) return reject(new Error("SDK not loaded"));
    const sdk = new window.W3SSdk();
    sdk.setAuthentication({ userToken, encryptionKey });
    sdk.execute(challengeId, (error, result) => {
      if (error) return reject(error);
      resolve(result);
    });
  });
}
