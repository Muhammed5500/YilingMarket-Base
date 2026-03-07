import express from "express";
import cors from "cors";
import OpenAI from "openai";
import { AGENT_PROFILES } from "./profiles.js";
import { AGENT_KEYS, OPENAI_API_KEY } from "./config.js";
import { ethers } from "ethers";

let _marketClient = null;
let _orchestrator = null;

export function setSharedState(marketClient, orchestrator) {
  _marketClient = marketClient;
  _orchestrator = orchestrator;
}

function getAgentNameMap() {
  const mapping = {};
  for (let i = 0; i < AGENT_PROFILES.length; i++) {
    const key = AGENT_KEYS[i];
    if (key) {
      try {
        const wallet = new ethers.Wallet(key);
        mapping[wallet.address.toLowerCase()] = AGENT_PROFILES[i].name;
      } catch {}
    }
  }
  return mapping;
}

export function startApiServer(port = 8000) {
  const app = express();
  app.use(cors());
  app.use(express.json());

  app.get("/api/health", (req, res) => {
    res.json({
      status: "ok",
      mode: _orchestrator ? "orchestrate" : "standalone",
      market_client: !!_marketClient,
      orchestrator: !!_orchestrator,
    });
  });

  app.get("/api/markets", async (req, res) => {
    if (!_marketClient) return res.status(503).json({ detail: "Not initialized" });
    try {
      const count = await _marketClient.getMarketCount();
      const markets = [];
      for (let i = 0; i < count; i++) {
        try {
          const [info, active] = await Promise.all([
            _marketClient.getMarketInfo(i),
            _marketClient.isMarketActive(i),
          ]);
          markets.push({
            market_id: i,
            question: info.question,
            creator: info.creator,
            current_price: Number(info.currentPrice) / 1e18,
            resolved: info.resolved,
            is_active: active,
            prediction_count: info.predictionCount,
            total_pool: Number(info.totalPool) / 1e18,
          });
        } catch {}
      }
      res.json(markets);
    } catch (e) {
      res.status(500).json({ detail: e.message });
    }
  });

  app.get("/api/markets/count", async (req, res) => {
    if (!_marketClient) return res.status(503).json({ detail: "Not initialized" });
    try {
      const count = await _marketClient.getMarketCount();
      res.json({ count });
    } catch (e) {
      res.status(500).json({ detail: e.message });
    }
  });

  app.get("/api/markets/:id", async (req, res) => {
    if (!_marketClient) return res.status(503).json({ detail: "Not initialized" });
    const marketId = parseInt(req.params.id);
    try {
      const info = await _marketClient.getMarketInfo(marketId);
      const params = await _marketClient.getMarketParams(marketId);
      const predictions = await _marketClient.getPredictions(marketId);
      res.json({
        market_id: marketId,
        question: info.question,
        current_price: Number(info.currentPrice) / 1e18,
        creator: info.creator,
        resolved: info.resolved,
        total_pool: Number(info.totalPool) / 1e18,
        prediction_count: info.predictionCount,
        params: {
          alpha: Number(params.alpha) / 1e18,
          k: params.k,
          flat_reward: Number(params.flatReward) / 1e18,
          bond_amount: Number(params.bondAmount) / 1e18,
          liquidity_param: Number(params.liquidityParam) / 1e18,
          created_at: params.createdAt,
        },
        predictions: predictions.map((p, i) => ({
          index: i,
          predictor: p.predictor,
          probability: Number(p.probability) / 1e18,
          price_before: Number(p.priceBefore) / 1e18,
          price_after: Number(p.priceAfter) / 1e18,
          bond: Number(p.bond) / 1e18,
          timestamp: p.timestamp,
        })),
      });
    } catch (e) {
      res.status(404).json({ detail: `Market not found: ${e.message}` });
    }
  });

  app.get("/api/leaderboard", async (req, res) => {
    if (!_marketClient) return res.json({ rankings: [] });
    try {
      const nameMap = getAgentNameMap(); // { address_lower: name }
      const agentAddresses = Object.keys(nameMap);
      if (!agentAddresses.length) return res.json({ rankings: [] });

      const marketCount = await _marketClient.getMarketCount();
      const totals = {}; // address -> total ETH earned
      for (const addr of agentAddresses) {
        totals[addr] = 0;
      }

      for (let i = 0; i < marketCount; i++) {
        const info = await _marketClient.getMarketInfo(i);
        if (!info.resolved) continue;

        await Promise.all(agentAddresses.map(async (addr) => {
          try {
            const predicted = await _marketClient.hasPredicted(i, addr);
            if (!predicted) return;
            const payout = await _marketClient.getPayout(i, addr);
            const params = await _marketClient.getMarketParams(i);
            const net = Number(payout) / 1e18 - Number(params.bondAmount) / 1e18;
            totals[addr] += net;
          } catch {}
        }));
      }

      const sorted = Object.entries(totals).sort((a, b) => b[1] - a[1]);
      res.json({
        rankings: sorted.map(([addr, eth], i) => ({
          rank: i + 1,
          agent: nameMap[addr] || addr,
          total_eth: Math.round(eth * 1e6) / 1e6,
        })),
      });
    } catch (e) {
      res.status(500).json({ detail: e.message });
    }
  });

  app.get("/api/markets/:id/leaderboard", async (req, res) => {
    if (!_marketClient) return res.json({ rankings: [] });
    const marketId = parseInt(req.params.id);
    try {
      const info = await _marketClient.getMarketInfo(marketId);
      if (!info.resolved) return res.json({ rankings: [] });

      const nameMap = getAgentNameMap();
      const predictions = await _marketClient.getPredictions(marketId);
      const params = await _marketClient.getMarketParams(marketId);
      const bondAmt = Number(params.bondAmount) / 1e18;

      const rankings = await Promise.all(predictions.map(async (p, i) => {
        const addr = p.predictor.toLowerCase();
        try {
          const payout = await _marketClient.getPayout(marketId, p.predictor);
          const net = Number(payout) / 1e18 - bondAmt;
          return {
            rank: 0,
            agent: nameMap[addr] || `${p.predictor.slice(0, 6)}...${p.predictor.slice(-4)}`,
            address: p.predictor,
            total_eth: Math.round(net * 1e6) / 1e6,
            probability: Number(p.probability) / 1e18,
          };
        } catch {
          return null;
        }
      }));

      const valid = rankings.filter(Boolean).sort((a, b) => b.total_eth - a.total_eth);
      valid.forEach((r, i) => r.rank = i + 1);

      res.json({ rankings: valid });
    } catch (e) {
      res.status(500).json({ detail: e.message });
    }
  });

  app.post("/api/validate-question", async (req, res) => {
    const { question } = req.body;
    if (!question || question.trim().length < 10) {
      return res.json({ valid: false, reason: "Question is too short. Please provide a more detailed question." });
    }

    try {
      const openai = new OpenAI({ apiKey: OPENAI_API_KEY });
      const response = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: `You are a question validator for a self-resolving prediction market (based on the paper "Self-Resolving Prediction Markets for Unverifiable Outcomes" by Yiling Chen et al.).

This market is designed for questions that are either:
1. UNVERIFIABLE — No oracle, API, or data source can definitively determine the true answer. These are subjective, philosophical, or opinion-based questions.
2. LONG-HORIZON — The outcome is so far in the future (years/decades) that no current oracle can resolve it, and locking capital until resolution is impractical.

REJECT questions that are:
- Short-term verifiable facts (e.g., "Will ETH hit $5000 tomorrow?" — a price oracle can verify this)
- Already known or easily googleable (e.g., "Is the Earth round?")
- Binary sports/election results with near-term resolution dates and available oracles

Respond in JSON: {"valid": true/false, "reason": "brief explanation in English"}`
          },
          {
            role: "user",
            content: `Is this question suitable for a self-resolving prediction market?\n\nQuestion: "${question.trim()}"`
          }
        ],
        response_format: { type: "json_object" },
        temperature: 0.3,
      });

      const result = JSON.parse(response.choices[0].message.content);
      res.json({ valid: !!result.valid, reason: result.reason || "" });
    } catch (e) {
      // On LLM failure, allow the question (don't block users)
      console.error(`[Validate] LLM error: ${e.message}`);
      res.json({ valid: true, reason: "Validation unavailable, proceeding." });
    }
  });

  app.get("/api/agent-names", (req, res) => {
    res.json(getAgentNameMap());
  });

  app.get("/api/protocol", async (req, res) => {
    if (!_marketClient) return res.status(503).json({ detail: "Not initialized" });
    try {
      const config = await _marketClient.getProtocolConfig();
      res.json({
        owner: config.owner,
        treasury: config.treasury,
        protocol_fee_bps: config.protocolFeeBps,
        protocol_fee_percent: config.protocolFeeBps / 100,
      });
    } catch (e) {
      res.status(500).json({ detail: e.message });
    }
  });

  const server = app.listen(port, "0.0.0.0", () => {
    console.log(`[API] REST server running on http://0.0.0.0:${port}`);
    console.log(`[API] Docs: http://localhost:${port}/api/health`);
  });

  return server;
}
