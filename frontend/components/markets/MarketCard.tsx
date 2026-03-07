"use client";

import Link from "next/link";
import type { MarketListItem } from "@/lib/types";
import { Users, Wallet } from "lucide-react";

interface MarketCardProps {
  market: MarketListItem;
  index?: number;
}

export function MarketCard({ market, index = 0 }: MarketCardProps) {
  const isLive = market.status === "live";

  return (
    <Link href={`/market/${market.id}`}>
      <div
        className={`group relative bg-card/60 border border-border/40 rounded-2xl p-5 transition-all duration-300 cursor-pointer
          hover:border-border/80 hover:bg-card hover:shadow-md hover:shadow-primary/5
          animate-fadeUp`}
        style={{ animationDelay: `${index * 0.04}s` }}
      >
        {/* Top: category + status */}
        <div className="flex items-center justify-between mb-3.5">
          <span className="font-mono text-xs text-muted-foreground/60">
            #{String(market.id).padStart(2, "0")}
          </span>
          <div className="flex items-center gap-1.5">
            <div
              className={`size-1.5 rounded-full ${
                isLive ? "bg-primary animate-livePulse" : "bg-muted-foreground/30"
              }`}
            />
            <span className="text-[11px] capitalize text-muted-foreground/60">
              {market.status}
            </span>
          </div>
        </div>

        {/* Question */}
        <h3 className="text-foreground text-sm font-medium mb-5 leading-relaxed line-clamp-2 min-h-[2.5rem]">
          {market.question}
        </h3>

        {/* Probability - bold and prominent */}
        <div className="flex items-baseline gap-1 mb-4">
          <span className="text-2xl font-bold tabular-nums text-foreground">
            {market.probability}%
          </span>
          <span className="text-xs text-muted-foreground ml-1">chance</span>
        </div>

        {/* Minimal progress bar */}
        <div className="h-1 bg-secondary/50 rounded-full mb-4 overflow-hidden">
          <div
            className="h-full bg-primary/70 rounded-full transition-all duration-500"
            style={{ width: `${market.probability}%` }}
          />
        </div>

        {/* Footer Stats */}
        <div className="flex items-center justify-between text-xs text-muted-foreground/70">
          <div className="flex items-center gap-1.5">
            <Users className="size-3" />
            <span className="tabular-nums">{market.predictionCount}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Wallet className="size-3" />
            <span className="font-mono tabular-nums">{market.totalPool}</span>
          </div>
        </div>
      </div>
    </Link>
  );
}
