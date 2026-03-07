"use client";

import Link from "next/link";
import type { MarketListItem } from "@/lib/types";
import { Progress } from "@/components/ui/progress";
import { Users, Wallet, TrendingUp, ArrowRight } from "lucide-react";

interface FeaturedMarketProps {
  market: MarketListItem;
}

export function FeaturedMarket({ market }: FeaturedMarketProps) {
  return (
    <Link href={`/market/${market.id}`}>
      <div className="group relative bg-card border border-border/50 rounded-2xl p-6 md:p-8 transition-all duration-300 cursor-pointer hover:border-border hover:shadow-lg hover:shadow-primary/5 h-full">
        {/* Top label */}
        <div className="flex items-center gap-2 mb-5">
          <TrendingUp className="size-3.5 text-primary" />
          <span className="text-xs font-medium text-primary uppercase tracking-wider">
            Featured
          </span>
          <span className="text-muted-foreground/30 text-xs">·</span>
          <span className="font-mono text-xs text-muted-foreground">#{String(market.id).padStart(2, "0")}</span>
        </div>

        {/* Question */}
        <h2 className="text-foreground text-xl md:text-2xl font-semibold mb-8 leading-snug max-w-lg">
          {market.question}
        </h2>

        {/* Probability bar */}
        <div className="mb-6">
          <div className="flex items-baseline gap-2 mb-3">
            <span className="text-4xl md:text-5xl font-bold tabular-nums text-foreground">
              {market.probability}
            </span>
            <span className="text-xl text-muted-foreground/50">%</span>
            <span className="text-sm text-muted-foreground ml-2">chance</span>
          </div>
          <Progress
            value={market.probability}
            className="h-2 bg-secondary/60 rounded-full"
            indicatorClassName="bg-primary transition-all duration-500 rounded-full"
          />
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-5 text-sm text-muted-foreground">
            <div className="flex items-center gap-1.5">
              <Users className="size-3.5" />
              <span className="tabular-nums">{market.predictionCount}</span>
              <span className="hidden sm:inline">predictions</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Wallet className="size-3.5" />
              <span className="font-mono tabular-nums">{market.totalPool}</span>
            </div>
          </div>
          <div className="flex items-center gap-1 text-sm text-primary opacity-0 group-hover:opacity-100 transition-opacity">
            <span>View</span>
            <ArrowRight className="size-3.5" />
          </div>
        </div>
      </div>
    </Link>
  );
}
