import { useState, useCallback } from "react";
import { createUser, getUserToken, getWallets, getWalletBalance, sendUSDC } from "./circle.js";

export function useCircleWallet() {
  const [userToken, setUserToken] = useState(null);
  const [wallet, setWallet] = useState(null);
  const [balance, setBalance] = useState("0.00");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const connect = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const userId = `bond-user-${crypto.randomUUID()}`;
      await createUser(userId);
      const tokenRes = await getUserToken(userId);
      const token = tokenRes.data?.userToken;
      if (!token) throw new Error("Failed to get user token");
      setUserToken(token);
      const walletsRes = await getWallets(token);
      const wallets = walletsRes.data?.wallets || [];
      if (wallets.length > 0) {
        const w = wallets[0];
        setWallet(w);
        const balRes = await getWalletBalance(token, w.id);
        const usdc = balRes.data?.tokenBalances?.find(b => b.token?.symbol === "USDC");
        setBalance(usdc?.amount || "0.00");
      }
      return token;
    } catch (err) {
      setError(err.message);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const send = useCallback(async (toAddress, amount) => {
    if (!userToken || !wallet) throw new Error("Wallet not connected");
    return sendUSDC(userToken, wallet.id, toAddress, amount);
  }, [userToken, wallet]);

  const refreshBalance = useCallback(async () => {
    if (!userToken || !wallet) return;
    const balRes = await getWalletBalance(userToken, wallet.id);
    const usdc = balRes.data?.tokenBalances?.find(b => b.token?.symbol === "USDC");
    setBalance(usdc?.amount || "0.00");
  }, [userToken, wallet]);

  return { connect, send, refreshBalance, wallet, balance, userToken, loading, error };
}
