import { useState, useCallback } from "react";
import { createUser, getUserToken, initWallet, getWallets, getWalletBalance, getAppId } from "./circle.js";

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
      // 1. Get App ID
      setStatus("Fetching app config...");
      const appRes = await getAppId();
      const appId = appRes?.appId;
      if (!appId) throw new Error("CIRCLE_APP_ID not set in Vercel env vars");

      // 2. Create user
      setStatus("Creating secure user...");
      const userId = `bond-${crypto.randomUUID()}`;
      const userRes = await createUser(userId);
      if (userRes?.code) throw new Error(`Create user failed: ${userRes.message}`);

      // 3. Get token
      setStatus("Getting auth token...");
      const tokenRes = await getUserToken(userId);
      const userToken = tokenRes?.data?.userToken;
      if (!userToken) throw new Error(`Token failed: ${JSON.stringify(tokenRes)}`);

      // 4. Create wallet (developer-controlled, no PIN needed)
      setStatus("Creating agent wallet...");
      const walletRes = await initWallet();
      const wallets = walletRes?.data?.wallets || [];

      // 5. Get wallets list
      setStatus("Loading wallet address...");
      const walletsRes = await getWallets();
      const allWallets = walletsRes?.data?.wallets || [];

      let activeWallet = allWallets[0] || wallets[0];

      if (activeWallet) {
        setWallet(activeWallet);
        // 6. Get balance
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

  const refreshBalance = useCallback(async () => {
    if (!wallet) return;
    const balRes = await getWalletBalance(wallet.id);
    const usdc = balRes?.data?.tokenBalances?.find(b => b.token?.symbol === "USDC");
    setBalance(usdc?.amount || "0.00");
  }, [wallet]);

  return { connect, refreshBalance, wallet, balance, loading, error, status };
}
