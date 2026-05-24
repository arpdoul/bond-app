import { useState, useCallback } from "react";
import { createUser, getUserToken, initWallet, getWallets, getWalletBalance, getAppId } from "./circle.js";

const USER_KEY = "bond_user_id";
const WALLET_KEY = "bond_wallet_id";

export function useCircleWallet() {
  const [wallet, setWallet]   = useState(null);
  const [balance, setBalance] = useState("0.00");
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState(null);
  const [status, setStatus]   = useState("idle");

  const connect = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setStatus("Fetching app config...");
      const appRes = await getAppId();
      const appId = appRes?.appId;
      if (!appId) throw new Error("CIRCLE_APP_ID not set in Vercel env vars");

      // Reuse existing userId if available
      let userId = localStorage.getItem(USER_KEY);
      if (!userId) {
        userId = "bond-" + crypto.randomUUID();
        localStorage.setItem(USER_KEY, userId);
        setStatus("Creating secure user...");
        const userRes = await createUser(userId);
        if (userRes?.code && userRes.code !== 0) {
          // User may already exist, continue
        }
      } else {
        setStatus("Restoring existing user...");
      }

      setStatus("Getting auth token...");
      const tokenRes = await getUserToken(userId);
      const userToken = tokenRes?.data?.userToken;
      if (!userToken) throw new Error("Token failed: " + JSON.stringify(tokenRes));

      // Check for existing wallets first
      setStatus("Loading wallet...");
      const walletsRes = await getWallets();
      let allWallets = walletsRes?.data?.wallets || [];

      // Filter to previously saved wallet if exists
      const savedWalletId = localStorage.getItem(WALLET_KEY);
      let activeWallet = savedWalletId
        ? allWallets.find(w => w.id === savedWalletId) || allWallets[0]
        : allWallets[0];

      // Only create new wallet if none exist
      if (!activeWallet) {
        setStatus("Creating agent wallet...");
        const walletRes = await initWallet();
        const newWallets = walletRes?.data?.wallets || [];
        activeWallet = newWallets[0];

        if (!activeWallet) {
          // Fetch again after creation
          const retry = await getWallets();
          activeWallet = retry?.data?.wallets?.[0];
        }
      }

      if (activeWallet) {
        localStorage.setItem(WALLET_KEY, activeWallet.id);
        setWallet(activeWallet);
        setStatus("Fetching USDC balance...");
        const balRes = await getWalletBalance(activeWallet.id);
        const usdc = balRes?.data?.tokenBalances?.find(b => b.token?.symbol === "USDC");
        setBalance(usdc?.amount || "0.00");
      }

      setStatus("connected");
      return { userToken, wallet: activeWallet };

    } catch (err) {
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
    setWallet(null);
    setBalance("0.00");
    setStatus("idle");
  }, []);

  const refreshBalance = useCallback(async () => {
    if (!wallet) return;
    const balRes = await getWalletBalance(wallet.id);
    const usdc = balRes?.data?.tokenBalances?.find(b => b.token?.symbol === "USDC");
    setBalance(usdc?.amount || "0.00");
  }, [wallet]);

  return { connect, disconnect, refreshBalance, wallet, balance, loading, error, status };
}
