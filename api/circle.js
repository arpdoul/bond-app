const BASE_URL = "https://api.circle.com/v1/w3s";

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(200).end();

  const { action, userId, userToken, walletId } = req.body || {};
  const API_KEY = process.env.CIRCLE_API_KEY;

  const headers = {
    "Content-Type": "application/json",
    "Authorization": `Bearer ${API_KEY}`,
  };

  try {
    let response, data;

    if (action === "createUser") {
      response = await fetch(`${BASE_URL}/users`, {
        method: "POST", headers,
        body: JSON.stringify({ userId }),
      });
      data = await response.json();

    } else if (action === "getUserToken") {
      response = await fetch(`${BASE_URL}/users/token`, {
        method: "POST", headers,
        body: JSON.stringify({ userId }),
      });
      data = await response.json();

    } else if (action === "getWallets") {
      response = await fetch(`${BASE_URL}/user/wallets`, {
        method: "GET",
        headers: { ...headers, "X-User-Token": userToken },
      });
      data = await response.json();

    } else if (action === "getBalance") {
      response = await fetch(`${BASE_URL}/user/wallets/${walletId}/balances`, {
        method: "GET",
        headers: { ...headers, "X-User-Token": userToken },
      });
      data = await response.json();

    } else {
      return res.status(400).json({ error: "Unknown action" });
    }

    return res.status(200).json(data);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
