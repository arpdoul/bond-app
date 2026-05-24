import { useState, useCallback, useEffect } from "react";
import { getUserToken, getWallets, getWalletBalance, createUser, initWallet, getAppId } from "./circle.js";

const KEYS = {
  user:   "bond_uid",
  wallet: "bond_wid",
  addr:   "bond_waddr",
  bal:    "bond_wbal",
};

export function useCircleWallet() {
  const [wallet,  setWallet]  = useState(() => {
    const id   = localStorage.getItem(KEYS.wallet);
    const addr = localStorage.getItem(KEYS.addr);
    return id && addr ? { id, address: addr } : null;
  });
  const [balance, setBalance] = useState(() => localStorage.getItem(KEYS.bal) || "0.00");
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState(null);
  const [status,  setStatus]  = useState(() => localStorage.getItem(KEYS.wallet) ? "connected" : "idle");

  // Refresh balance on load if wallet exists
  useEffect(() => {
    const id = localStorage.getItem(KEYS.wallet);
    if (!id) return;
    getWalletBalance(id).then(r => {
      const usdc = r?.data?.tokenBalances?.find(b => b.token?.symbol === "USDC");
      if (usdc?.amount) {
        setBalance(usdc.amount);
        localStorage.setItem(KEYS.bal, usdc.amount);
      }
    }).catch(() => {});
  }, []);

  const connect = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // 1. App ID check
      setStatus("Checking config...");
      const appRes = await getAppId();
      if (!appRes?.appId) throw new Error("CIRCLE_APP_ID not set in Vercel");

      // 2. Reuse or create user
      let userId = localStorage.getItem(KEYS.user);
      if (!userId) {
        userId = "bond-" + crypto.randomUUID();
        setStatus("Creating user...");
        await createUser(userId);
        localStorage.setItem(KEYS.user, userId);
      } else {
        setStatus("Loading user...");
      }

      // 3. Get token
      setStatus("Authenticating...");
      const tokenRes = await getUserToken(userId);
      const userToken = tokenRes?.data?.userToken;
      if (!userToken) throw new Error("Auth failed: " + JSON.stringify(tokenRes));

      // 4. Check if we already have a saved wallet
      const savedId   = localStorage.getItem(KEYS.wallet);
      const savedAddr = localStorage.getItem(KEYS.addr);
      if (savedId && savedAddr) {
        setStatus("connected");
        const w = { id: savedId, address: savedAddr };
        setWallet(w);
        // Refresh balance
        const balRes = await getWalletBalance(savedId);
        const usdc = balRes?.data?.tokenBalances?.find(b => b.token?.symbol === "USDC");
        const bal = usdc?.amount || "0.00";
        setBalance(bal);
        localStorage.setItem(KEYS.bal, bal);
        return { userToken, wallet: w };
      }

      // 5. No saved wallet — get or create one
      setStatus("Loading wallet...");
      const walletsRes = await getWallets();
      let activeWallet = walletsRes?.data?.wallets?.[0];

      if (!activeWallet) {
        setStatus("Creating wallet...");
        const created = await initWallet();
        activeWallet = created?.data?.wallets?.[0];
      }

      if (!activeWallet) throw new Error("Could not create or load wallet");

      // 6. Save permanently
      localStorage.setItem(KEYS.wallet, activeWallet.id);
      localStorage.setItem(KEYS.addr,   activeWallet.address || activeWallet.id);
      setWallet(activeWallet);

      // 7. Get balance
      setStatus("Getting balance...");
      const balRes = await getWalletBalance(activeWallet.id);
      const usdc = balRes?.data?.tokenBalances?.find(b => b.token?.symbol === "USDC");
      const bal = usdc?.amount || "0.00";
      setBalance(bal);
      localStorage.setItem(KEYS.bal, bal);

      setStatus("connected");
      return { userToken, wallet: activeWallet };

    } catch(err) {
      setError(err.message);
      setStatus("error");
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const disconnect = useCallback(() => {
    Object.values(KEYS).forEach(k => localStorage.removeItem(k));
    setWallet(null);
    setBalance("0.00");
    setStatus("idle");
  }, []);

  const refreshBalance = useCallback(async () => {
    const id = wallet?.id || localStorage.getItem(KEYS.wallet);
    if (!id) return;
    const r = await getWalletBalance(id);
    const usdc = r?.data?.tokenBalances?.find(b => b.token?.symbol === "USDC");
    const bal = usdc?.amount || balance;
    setBalance(bal);
    localStorage.setItem(KEYS.bal, bal);
  }, [wallet, balance]);

  return { connect, disconnect, refreshBalance, wallet, balance, loading, error, status };
}
