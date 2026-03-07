"use client";

import { MarketCard } from "./MarketCard";
import type { MarketListItem } from "@/lib/types";
import { BarChart3 } from "lucide-react";

function SkeletonCard({ index }: { index: number }) {
  return (
    <div
      className="bg-card/60 border border-border/40 rounded-2xl p-5 animate-pulse"
      style={{ animationDelay: `${index * 0.06}s` }}
    >
      <div className="flex justify-between mb-3.5">
        <div className="h-3.5 w-12 bg-secondary rounded" />
        <div className="h-3.5 w-10 bg-secondary rounded" />
      </div>
      <div className="space-y-2 mb-5">
        <div className="h-3.5 w-full bg-secondary rounded" />
        <div className="h-3.5 w-2/3 bg-secondary rounded" />
      </div>
      <div className="h-7 w-14 bg-secondary rounded mb-4" />
      <div className="h-1 w-full bg-secondary rounded-full mb-4" />
      <div className="flex justify-between">
        <div className="h-3 w-12 bg-secondary rounded" />
        <div className="h-3 w-16 bg-secondary rounded" />
      </div>
    </div>
  );
}

interface MarketGridProps {
  markets: MarketListItem[];
  isLoading: boolean;
}

export function MarketGrid({ markets, isLoading }: MarketGridProps) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <SkeletonCard key={i} index={i} />
        ))}
      </div>
    );
  }

  if (markets.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 animate-fadeUp">
        <div className="size-11 rounded-xl bg-secondary/40 flex items-center justify-center mb-3">
          <BarChart3 className="size-5 text-muted-foreground/40" />
        </div>
        <div className="text-foreground text-sm font-medium mb-0.5">
          No markets found
        </div>
        <p className="text-muted-foreground/60 text-xs text-center">
          Try a different filter or create a new market.
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
      {markets.map((market, i) => (
        <MarketCard key={market.id} market={market} index={i} />
      ))}
    </div>
  );
}
