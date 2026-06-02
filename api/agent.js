export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();

  const { messages, walletAddress, balance } = req.body || {};

  const ANTHROPIC_KEY = process.env.ANTHROPIC_API_KEY;
  if (!ANTHROPIC_KEY) {
    return res.status(200).json({ text: "Agent offline — API key not configured." });
  }

  try {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": ANTHROPIC_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 500,
        system: `You are BOND Agent — an autonomous USDC payment AI on Arc testnet.
User wallet: ${walletAddress || "not connected"}
Balance: ${balance || "0"} USDC

RULES:
- When user wants to send USDC, reply ONLY with this exact JSON (no other text):
{"action":"send","amount":"X","to":"0xADDRESS","confirmed":true,"message":"Sending X USDC to 0xADDRESS"}

- When user wants to bridge to another chain, reply ONLY with:
{"action":"bridge","amount":"X","to":"0xADDRESS","destChain":"MATIC-AMOY","confirmed":true,"message":"Bridging X USDC to Polygon"}

- For balance queries reply: "Your balance is ${balance} USDC on Arc Testnet."
- If address is missing, ask: "Please provide the destination wallet address (0x...)"
- If amount is missing, ask: "How much USDC would you like to send?"
- Keep all replies under 2 sentences. No markdown.`,
        messages: (messages || []).map(m => ({ role: m.role, content: m.content })),
      }),
    });

    const raw = await response.text();
    
    // Log for debugging
    console.log("Anthropic status:", response.status);
    console.log("Anthropic raw:", raw.slice(0, 200));

    if (!response.ok) {
      const errData = JSON.parse(raw);
      return res.status(200).json({ 
        text: `Agent error: ${errData.error?.message || "API error " + response.status}` 
      });
    }

    const data = JSON.parse(raw);
    const text = data.content?.[0]?.text || "I couldn't understand that. Try: Send 0.5 USDC to 0x...";
    return res.status(200).json({ text });

  } catch(err) {
    console.error("Agent error:", err);
    return res.status(200).json({ 
      text: `Agent error: ${err.message}` 
    });
  }
}
