"use client";

import { useState, useEffect } from "react";
import { useAccount, useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { parseEther } from "viem";
import { CONTRACT_ADDRESS, CONTRACT_ABI } from "@/lib/contracts";
import { baseSepolia } from "@/lib/wagmi";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Slider } from "@/components/ui/slider";
import { ChevronDown, ChevronUp, Lock, Loader2, AlertTriangle, Info, HelpCircle } from "lucide-react";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "";

interface CreateMarketFormProps {
  onClose?: () => void;
  onSuccess?: () => void;
  alwaysOpen?: boolean;
}

export function CreateMarketForm({ onClose, onSuccess, alwaysOpen }: CreateMarketFormProps) {
  const { isConnected } = useAccount();
  const [isOpen, setIsOpen] = useState(alwaysOpen ?? false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [question, setQuestion] = useState("");
  const [probability, setProbability] = useState([50]);
  const [alpha, setAlpha] = useState("10");
  const [k, setK] = useState("2");
  const [r, setR] = useState("0.001");
  const [bond, setBond] = useState("0.001");
  const [b, setB] = useState("0.003");

  const { writeContract, data: txHash, isPending } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({
    hash: txHash,
  });

  const [isValidating, setIsValidating] = useState(false);
  const [validationError, setValidationError] = useState("");

  const cost = Number(k) * Number(r) + Number(b);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!question.trim()) return;

    // Validate question via AI
    setIsValidating(true);
    setValidationError("");
    try {
      const res = await fetch(`${API_URL}/api/validate-question`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: question.trim() }),
      });
      const result = await res.json();
      if (!result.valid) {
        setValidationError(result.reason || "This question is not suitable for this market type.");
        setIsValidating(false);
        return;
      }
    } catch {
      // If validation fails, allow through
    }
    setIsValidating(false);

    const alphaWad = parseEther((Number(alpha) / 100).toString());
    const flatReward = parseEther(r);
    const bondAmount = parseEther(bond);
    const liquidityParam = parseEther(b);
    const initialPrice = parseEther((probability[0] / 100).toString());
    const funding = flatReward * BigInt(k) + liquidityParam;

    writeContract({
      address: CONTRACT_ADDRESS,
      abi: CONTRACT_ABI,
      functionName: "createMarket",
      args: [question, alphaWad, BigInt(k), flatReward, bondAmount, liquidityParam, initialPrice],
      value: funding,
      chain: baseSepolia,
    });
  };

  useEffect(() => {
    if (isSuccess && isOpen) {
      setIsOpen(false);
      setQuestion("");
      onSuccess?.();
      onClose?.();
    }
  }, [isSuccess]);

  if (!isConnected) {
    if (alwaysOpen) {
      return (
        <div className="flex flex-col items-center justify-center gap-2 py-8 bg-secondary/50 rounded-lg border border-border/60">
          <Lock className="size-5 text-muted-foreground mb-1" />
          <span className="text-sm text-muted-foreground font-medium">
            Connect wallet to create market
          </span>
        </div>
      );
    }
    return null;
  }

  if (!isOpen) {
    return (
      <Button
        variant="outline"
        onClick={() => setIsOpen(true)}
        className="w-full mb-3"
      >
        + Ask a Question
      </Button>
    );
  }

  const [showGuide, setShowGuide] = useState(false);

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Market Creation Guide */}
      <div className="border border-blue-500/20 bg-blue-500/5 rounded-lg">
        <button
          type="button"
          onClick={() => setShowGuide(!showGuide)}
          className="w-full flex items-center gap-2 p-3.5 hover:bg-blue-500/10 transition-colors rounded-lg cursor-pointer"
        >
          <HelpCircle className="size-4 text-blue-500 shrink-0" />
          <span className="text-sm font-medium text-foreground">How to Create a Market</span>
          {showGuide ? (
            <ChevronUp className="h-4 w-4 text-muted-foreground ml-auto" />
          ) : (
            <ChevronDown className="h-4 w-4 text-muted-foreground ml-auto" />
          )}
        </button>

        {showGuide && (
          <div className="px-4 pb-4 space-y-4 border-t border-blue-500/20 pt-4 text-sm text-muted-foreground">
            {/* Question Requirements */}
            <div>
              <h4 className="font-semibold text-foreground mb-1.5 flex items-center gap-1.5">
                <Info className="size-3.5 text-blue-500" />
                Question Requirements
              </h4>
              <p className="mb-2 text-xs leading-relaxed">
                Yiling Market uses a self-resolving mechanism — there is no oracle or admin to settle outcomes.
                Questions must be <span className="text-foreground font-medium">inherently unverifiable</span> or have a <span className="text-foreground font-medium">long time horizon</span> so that the market converges to a consensus through agent predictions.
              </p>
              <div className="grid grid-cols-1 gap-2 text-xs">
                <div className="bg-green-500/10 border border-green-500/20 rounded-md p-2.5">
                  <span className="text-green-600 dark:text-green-400 font-medium">Good questions:</span>
                  <ul className="mt-1 space-y-0.5 text-muted-foreground">
                    <li>• &quot;Will AI surpass human reasoning by 2030?&quot;</li>
                    <li>• &quot;Will Mars be colonized before 2050?&quot;</li>
                    <li>• &quot;Is consciousness fundamentally computational?&quot;</li>
                  </ul>
                </div>
                <div className="bg-red-500/10 border border-red-500/20 rounded-md p-2.5">
                  <span className="text-red-600 dark:text-red-400 font-medium">Not allowed:</span>
                  <ul className="mt-1 space-y-0.5 text-muted-foreground">
                    <li>• &quot;Will Bitcoin hit $100k tomorrow?&quot; (short-term, verifiable)</li>
                    <li>• &quot;What is 2+2?&quot; (factual, not a prediction)</li>
                    <li>• &quot;Did Team X win yesterday?&quot; (already verifiable)</li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Parameter Explanations */}
            <div>
              <h4 className="font-semibold text-foreground mb-1.5 flex items-center gap-1.5">
                <Info className="size-3.5 text-blue-500" />
                Advanced Parameters Explained
              </h4>
              <div className="space-y-2.5 text-xs">
                <div className="bg-muted/50 rounded-md p-2.5">
                  <span className="text-foreground font-medium">Alpha (Stop Probability)</span>
                  <p className="mt-0.5 leading-relaxed">
                    The probability (%) that the market randomly stops after each prediction.
                    Lower alpha = longer-running market with more predictions.
                    Higher alpha = market resolves faster. Default: <code className="text-xs bg-muted px-1 rounded">10%</code>
                  </p>
                </div>
                <div className="bg-muted/50 rounded-md p-2.5">
                  <span className="text-foreground font-medium">Last-K Reward Count</span>
                  <p className="mt-0.5 leading-relaxed">
                    Number of final predictions that receive the flat reward (R) bonus.
                    Only the last K predictors get this extra incentive. Default: <code className="text-xs bg-muted px-1 rounded">2</code>
                  </p>
                </div>
                <div className="bg-muted/50 rounded-md p-2.5">
                  <span className="text-foreground font-medium">Flat Reward (R)</span>
                  <p className="mt-0.5 leading-relaxed">
                    ETH bonus paid to each of the last K predictors.
                    This incentivizes participation even when the market is close to consensus. Default: <code className="text-xs bg-muted px-1 rounded">0.001 ETH</code>
                  </p>
                </div>
                <div className="bg-muted/50 rounded-md p-2.5">
                  <span className="text-foreground font-medium">Bond Amount</span>
                  <p className="mt-0.5 leading-relaxed">
                    ETH each predictor must stake per prediction. Agents risk their bond — they can earn more than the bond if their prediction improves accuracy,
                    or lose part of it if it worsens. Default: <code className="text-xs bg-muted px-1 rounded">0.001 ETH</code>
                  </p>
                </div>
                <div className="bg-muted/50 rounded-md p-2.5">
                  <span className="text-foreground font-medium">Liquidity (b)</span>
                  <p className="mt-0.5 leading-relaxed">
                    The liquidity parameter controls how much a single prediction can move the market price.
                    Higher b = more stable price (harder to move). Lower b = more volatile.
                    This also sets the initial liquidity pool. Default: <code className="text-xs bg-muted px-1 rounded">0.003 ETH</code>
                  </p>
                </div>
              </div>
            </div>

            {/* Cost Breakdown */}
            <div className="bg-muted/50 rounded-md p-2.5 text-xs">
              <span className="text-foreground font-medium">Cost Breakdown</span>
              <p className="mt-0.5 leading-relaxed">
                Total cost = <code className="bg-muted px-1 rounded">K × R + b</code> (reward pool + liquidity).
                This funds the market&apos;s reward pool and initial liquidity. The market creator does not participate as a predictor.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Question */}
      <div className="space-y-2">
        <label className="text-sm font-medium text-foreground">
          Question
        </label>
        <Textarea
          placeholder="Will AI surpass human reasoning by 2030?"
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          className="min-h-24 resize-none"
        />
      </div>

      {/* Initial Probability Slider */}
      <div className="space-y-3">
        <label className="text-sm font-medium text-foreground">
          Initial Probability
        </label>
        <div className="text-center mb-4">
          <span className="text-5xl font-bold font-mono text-foreground tabular-nums">
            {probability[0]}
            <span className="text-3xl text-muted-foreground">%</span>
          </span>
        </div>
        <div className="space-y-3">
          <Slider
            value={probability}
            onValueChange={setProbability}
            min={1}
            max={99}
            step={1}
            className="w-full"
          />
          <div className="flex justify-between text-sm text-muted-foreground">
            <span>Unlikely</span>
            <span>Likely</span>
          </div>
        </div>
      </div>

      {/* Estimated Cost */}
      <div className="bg-primary/10 border border-primary/20 rounded-lg p-4">
        <div className="flex items-baseline gap-2 mb-1">
          <span className="text-sm text-muted-foreground">
            Estimated Cost
          </span>
          <span className="text-2xl font-bold font-mono text-primary tabular-nums">
            ~{cost.toFixed(4)} ETH
          </span>
        </div>
        <p className="text-xs text-muted-foreground">
          Includes liquidity provision and initial market setup fees
        </p>
      </div>

      {/* Advanced Parameters */}
      <div className="border border-border rounded-lg">
        <button
          type="button"
          onClick={() => setShowAdvanced(!showAdvanced)}
          className="w-full flex items-center justify-between p-4 hover:bg-muted/50 transition-colors rounded-lg cursor-pointer"
        >
          <span className="text-sm font-medium text-foreground">
            Advanced Parameters
          </span>
          {showAdvanced ? (
            <ChevronUp className="h-4 w-4 text-muted-foreground" />
          ) : (
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          )}
        </button>

        {showAdvanced && (
          <div className="px-4 pb-4 space-y-4 border-t border-border pt-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-xs font-medium text-muted-foreground">
                  Alpha (Stop Probability)
                </label>
                <div className="relative">
                  <Input
                    type="number"
                    value={alpha}
                    onChange={(e) => setAlpha(e.target.value)}
                    className="pr-8"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                    %
                  </span>
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-xs font-medium text-muted-foreground">
                  Last-K Reward Count
                </label>
                <Input
                  type="number"
                  value={k}
                  onChange={(e) => setK(e.target.value)}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-xs font-medium text-muted-foreground">
                  Flat Reward (R)
                </label>
                <div className="relative">
                  <Input
                    type="number"
                    step="0.01"
                    value={r}
                    onChange={(e) => setR(e.target.value)}
                    className="pr-14"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                    ETH
                  </span>
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-xs font-medium text-muted-foreground">
                  Bond Amount
                </label>
                <div className="relative">
                  <Input
                    type="number"
                    step="0.01"
                    value={bond}
                    onChange={(e) => setBond(e.target.value)}
                    className="pr-14"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                    ETH
                  </span>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-medium text-muted-foreground">
                Liquidity (b)
              </label>
              <div className="relative">
                <Input
                  type="number"
                  step="0.1"
                  value={b}
                  onChange={(e) => setB(e.target.value)}
                  className="pr-14"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                  ETH
                </span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Validation Error */}
      {validationError && (
        <div className="flex items-start gap-2.5 p-3.5 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-sm">
          <AlertTriangle className="size-4 mt-0.5 shrink-0" />
          <div>
            <p className="font-medium mb-0.5">Question not suitable</p>
            <p className="text-destructive/80 text-xs">{validationError}</p>
          </div>
        </div>
      )}

      {/* Submit */}
      <Button
        type="submit"
        className="w-full cursor-pointer transition-shadow hover:shadow-[0_0_16px_var(--color-glow-primary)]"
        size="lg"
        disabled={isPending || isConfirming || isValidating || !question.trim()}
      >
        {isValidating ? (
          <>
            <Loader2 className="size-4 animate-spin" />
            Validating question...
          </>
        ) : isPending || isConfirming ? (
          <>
            <Loader2 className="size-4 animate-spin" />
            {isPending ? "Sending Transaction..." : "Confirming..."}
          </>
        ) : (
          "Create Market"
        )}
      </Button>

      {!alwaysOpen && (
        <button
          type="button"
          onClick={() => { setIsOpen(false); onClose?.(); }}
          className="w-full text-sm py-1.5 border-none bg-transparent text-muted-foreground cursor-pointer hover:text-foreground transition-colors"
        >
          Cancel
        </button>
      )}
    </form>
  );
}
