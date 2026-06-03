import { useState, useCallback, useEffect } from "react";
import { createUser, getUserToken, initWallet, getWallets, getWalletBalance, getAppId } from "./circle.js";

const K = {
  user:   "bond_uid",
  token:  "bond_utoken",
  wallet: "bond_wid",
  addr:   "bond_waddr",
  bal:    "bond_wbal",
};

export function useCircleWallet() {
  const [wallet,  setWallet]  = useState(() => {
    const id   = localStorage.getItem(K.wallet);
    const addr = localStorage.getItem(K.addr);
    return id && addr ? { id, address: addr } : null;
  });
  const [balance, setBalance] = useState(() => localStorage.getItem(K.bal) || "0.00");
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState(null);
  const [status,  setStatus]  = useState(() => localStorage.getItem(K.wallet) ? "connected" : "idle");
  const [challengeId, setChallengeId] = useState(null);

  // Auto-refresh balance on load
  useEffect(() => {
    const id    = localStorage.getItem(K.wallet);
    const token = localStorage.getItem(K.token);
    if (!id || !token) return;
    getWalletBalance(id, token).then(r => {
      const usdc = r?.data?.tokenBalances?.find(b => b.token?.symbol === "USDC");
      if (usdc?.amount) {
        setBalance(usdc.amount);
        localStorage.setItem(K.bal, usdc.amount);
      }
    }).catch(() => {});
  }, []);

  const connect = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // 1. Get App ID
      setStatus("Checking config...");
      const appRes = await getAppId();
      if (!appRes?.appId) throw new Error("CIRCLE_APP_ID not configured");

      // 2. Reuse or create userId
      let userId = localStorage.getItem(K.user);
      if (!userId) {
        userId = "bond-" + crypto.randomUUID();
        setStatus("Creating account...");
        await createUser(userId);
        localStorage.setItem(K.user, userId);
      } else {
        setStatus("Loading account...");
      }

      // 3. Get user token
      setStatus("Authenticating...");
      const tokenRes = await getUserToken(userId);
      const userToken     = tokenRes?.data?.userToken;
      const encryptionKey = tokenRes?.data?.encryptionKey;
      if (!userToken) throw new Error("Auth failed: " + JSON.stringify(tokenRes));
      localStorage.setItem(K.token, userToken);

      // 4. Check saved wallet first
      const savedId   = localStorage.getItem(K.wallet);
      const savedAddr = localStorage.getItem(K.addr);
      if (savedId && savedAddr) {
        const w = { id: savedId, address: savedAddr };
        setWallet(w);
        setStatus("connected");
        const balRes = await getWalletBalance(savedId, userToken);
        const usdc = balRes?.data?.tokenBalances?.find(b => b.token?.symbol === "USDC");
        const bal = usdc?.amount || "0.00";
        setBalance(bal);
        localStorage.setItem(K.bal, bal);
        return { userToken, encryptionKey, wallet: w };
      }

      // 5. Get existing wallets
      setStatus("Loading wallet...");
      const walletsRes = await getWallets(userToken);
      let wallets = walletsRes?.data?.wallets || [];
      let activeWallet = wallets[0];

      // 6. Create wallet if none exists — returns challengeId for PIN
      if (!activeWallet) {
        setStatus("Creating wallet...");
        const walletRes = await initWallet(userToken);
        const challenge = walletRes?.data?.challengeId;
        if (challenge) {
          setChallengeId(challenge);
          setStatus("pin_required");
          setLoading(false);
          return { userToken, encryptionKey, challengeId: challenge };
        }
        // If no challenge, check wallets again
        const retry = await getWallets(userToken);
        activeWallet = retry?.data?.wallets?.[0];
      }

      if (!activeWallet) throw new Error("Could not create wallet");

      localStorage.setItem(K.wallet, activeWallet.id);
      localStorage.setItem(K.addr,   activeWallet.address || activeWallet.id);
      setWallet(activeWallet);

      setStatus("Fetching balance...");
      const balRes = await getWalletBalance(activeWallet.id, userToken);
      const usdc = balRes?.data?.tokenBalances?.find(b => b.token?.symbol === "USDC");
      const bal = usdc?.amount || "0.00";
      setBalance(bal);
      localStorage.setItem(K.bal, bal);

      setStatus("connected");
      return { userToken, encryptionKey, wallet: activeWallet };

    } catch(err) {
      setError(err.message);
      setStatus("error");
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const disconnect = useCallback(() => {
    Object.values(K).forEach(k => localStorage.removeItem(k));
    setWallet(null);
    setBalance("0.00");
    setStatus("idle");
    setChallengeId(null);
  }, []);

  const refreshBalance = useCallback(async () => {
    const id    = wallet?.id    || localStorage.getItem(K.wallet);
    const token = localStorage.getItem(K.token);
    if (!id || !token) return;
    const r = await getWalletBalance(id, token);
    const usdc = r?.data?.tokenBalances?.find(b => b.token?.symbol === "USDC");
    const bal = usdc?.amount || balance;
    setBalance(bal);
    localStorage.setItem(K.bal, bal);
  }, [wallet, balance]);

  return {
    connect, disconnect, refreshBalance,
    wallet, balance, loading, error, status, challengeId,
  };
}
