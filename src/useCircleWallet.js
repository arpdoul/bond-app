import { useState, useCallback } from "react";
import { initSDK, executeWithPIN } from "./CircleSDK.js";
import { createUser, getUserToken, initWallet, getWallets, getWalletBalance, getAppId } from "./circle.js";

export function useCircleWallet() {
  const [wallet, setWallet]       = useState(null);
  const [balance, setBalance]     = useState("0.00");
  const [loading, setLoading]     = useState(false);
  const [error, setError]         = useState(null);
  const [status, setStatus]       = useState("idle");

  const connect = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // 1. Get App ID from backend
      setStatus("Fetching app config...");
      const { appId } = await getAppId();

      // 2. Init Circle SDK
      setStatus("Initializing Circle SDK...");
      await initSDK(appId);

      // 3. Create user
      setStatus("Creating secure user...");
      const userId = `bond-${crypto.randomUUID()}`;
      await createUser(userId);

      // 4. Get user token
      setStatus("Getting user token...");
      const tokenRes = await getUserToken(userId);
      const userToken     = tokenRes.data?.userToken;
      const encryptionKey = tokenRes.data?.encryptionKey;
      if (!userToken) throw new Error("Failed to get user token from Circle");

      // 5. Create wallet — triggers PIN UI
      setStatus("Setting up wallet (PIN required)...");
      const walletRes = await initWallet();
      const challengeId = walletRes.data?.challengeId;

      if (challengeId) {
        setStatus("Waiting for PIN...");
        await executeWithPIN(userToken, encryptionKey, challengeId);
      }

      // 6. Fetch wallets
      setStatus("Loading wallet...");
      const walletsRes = await getWallets();
      const wallets = walletsRes.data?.wallets || [];

      if (wallets.length > 0) {
        const w = wallets[0];
        setWallet(w);

        // 7. Get USDC balance
        const balRes = await getWalletBalance(w.id);
        const usdc = balRes.data?.tokenBalances?.find(b => b.token?.symbol === "USDC");
        setBalance(usdc?.amount || "0.00");
        setStatus("connected");
        return { userToken, wallet: w };
      } else {
        setStatus("connected");
        return { userToken, wallet: null };
      }
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
    const usdc = balRes.data?.tokenBalances?.find(b => b.token?.symbol === "USDC");
    setBalance(usdc?.amount || "0.00");
  }, [wallet]);

  return { connect, refreshBalance, wallet, balance, loading, error, status };
}
