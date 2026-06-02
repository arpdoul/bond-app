export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();

  const { messages, walletAddress, balance } = req.body || {};

  try {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": process.env.ANTHROPIC_API_KEY || "",
        "anthropic-beta": "messages-2023-06-01",
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-opus-4-5",
        max_tokens: 500,
        system: `You are BOND Agent — an autonomous USDC payment AI on Arc testnet.
Help users send USDC and bridge across chains via natural language.

User wallet: ${walletAddress || "not connected"}
Current USDC balance: ${balance || "0"} USDC
Supported chains: Arc Testnet, Polygon Amoy, Arbitrum Sepolia, Base Sepolia

When user wants to send USDC, extract amount and address then reply ONLY with this JSON:
{"action":"send","amount":"X","to":"0x...","confirmed":true,"message":"Sending X USDC to 0x..."}

When user wants to bridge, reply ONLY with:
{"action":"bridge","amount":"X","to":"0x...","destChain":"CHAIN-ID","confirmed":true,"message":"Bridging X USDC to CHAIN"}

When user asks balance, reply naturally in plain text.
For anything unclear, ask for the missing info (amount or address).
Keep replies under 2 sentences. No markdown.`,
        messages: messages || [],
      }),
    });

    const data = await response.json();
    const text = data.content?.[0]?.text || "Sorry, I couldn't process that.";
    return res.status(200).json({ text });
  } catch(err) {
    console.error("Agent error:", err);
    return res.status(500).json({ error: err.message, hint: "Check ANTHROPIC_API_KEY in Vercel env vars" });
  }
}
