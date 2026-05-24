import { useState, useCallback, useEffect } from "react";
import { getUserToken, getWallets, getWalletBalance, createUser, initWallet, getAppId } from "./circle.js";

const USER_KEY   = "bond_user_id";
const WALLET_KEY = "bond_wallet_id";
const ADDR_KEY   = "bond_wallet_addr";

export function useCircleWallet() {
  const [wallet,  setWallet]  = useState(null);
  const [balance, setBalance] = useState("0.00");
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState(null);
  const [status,  setStatus]  = useState("idle");

  // AUTO-RESTORE on page load
  useEffect(() => {
    const savedId   = localStorage.getItem(WALLET_KEY);
    const savedAddr = localStorage.getItem(ADDR_KEY);
    if (savedId && savedAddr) {
      setWallet({ id: savedId, address: savedAddr });
      setStatus("connected");
      // Refresh balance in background
      getWalletBalance(savedId).then(balRes => {
        const usdc = balRes?.data?.tokenBalances?.find(b => b.token?.symbol === "USDC");
        if (usdc?.amount) setBalance(usdc.amount);
      }).catch(() => {});
    }
  }, []);

  const connect = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setStatus("Fetching app config...");
      const appRes = await getAppId();
      if (!appRes?.appId) throw new Error("CIRCLE_APP_ID missing in Vercel env vars");

      // Reuse or create userId
      let userId = localStorage.getItem(USER_KEY);
      if (!userId) {
        userId = "bond-" + crypto.randomUUID();
        localStorage.setItem(USER_KEY, userId);
        setStatus("Creating user...");
        await createUser(userId);
      } else {
        setStatus("Restoring user...");
      }

      setStatus("Getting auth token...");
      const tokenRes = await getUserToken(userId);
      const userToken = tokenRes?.data?.userToken;
      if (!userToken) throw new Error("Token failed: " + JSON.stringify(tokenRes));

      // Load existing wallets
      setStatus("Loading wallet...");
      const walletsRes = await getWallets();
      let allWallets = walletsRes?.data?.wallets || [];

      const savedId = localStorage.getItem(WALLET_KEY);
      let activeWallet = savedId
        ? allWallets.find(w => w.id === savedId) || allWallets[0]
        : allWallets[0];

      // Create wallet only if none exist
      if (!activeWallet) {
        setStatus("Creating agent wallet...");
        const walletRes = await initWallet();
        const created = walletRes?.data?.wallets || [];
        activeWallet = created[0];
        if (!activeWallet) {
          const retry = await getWallets();
          activeWallet = retry?.data?.wallets?.[0];
        }
      }

      if (!activeWallet) throw new Error("Could not create or load wallet");

      // Persist wallet
      localStorage.setItem(WALLET_KEY, activeWallet.id);
      localStorage.setItem(ADDR_KEY,   activeWallet.address || activeWallet.id);

      setWallet(activeWallet);

      setStatus("Fetching balance...");
      const balRes = await getWalletBalance(activeWallet.id);
      const usdc = balRes?.data?.tokenBalances?.find(b => b.token?.symbol === "USDC");
      setBalance(usdc?.amount || "0.00");

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
    localStorage.removeItem(USER_KEY);
    localStorage.removeItem(WALLET_KEY);
    localStorage.removeItem(ADDR_KEY);
    setWallet(null);
    setBalance("0.00");
    setStatus("idle");
  }, []);

  const refreshBalance = useCallback(async () => {
    if (!wallet?.id) return;
    const balRes = await getWalletBalance(wallet.id);
    const usdc = balRes?.data?.tokenBalances?.find(b => b.token?.symbol === "USDC");
    setBalance(usdc?.amount || "0.00");
  }, [wallet]);

  return { connect, disconnect, refreshBalance, wallet, balance, loading, error, status };
}
