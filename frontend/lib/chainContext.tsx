"use client";

import { createContext, useContext, type ReactNode } from "react";
import { type ChainKey, CHAINS, DEFAULT_CHAIN, type ChainConfig } from "./contracts";

interface ChainContextValue {
  selectedChain: ChainKey;
  chainConfig: ChainConfig;
  setSelectedChain: (chain: ChainKey) => void;
}

const ChainContext = createContext<ChainContextValue | null>(null);

export function ChainProvider({ children }: { children: ReactNode }) {
  const selectedChain: ChainKey = DEFAULT_CHAIN;
  const chainConfig = CHAINS[selectedChain];

  return (
    <ChainContext.Provider value={{ selectedChain, chainConfig, setSelectedChain: () => {} }}>
      {children}
    </ChainContext.Provider>
  );
}

export function useChain() {
  const ctx = useContext(ChainContext);
  if (!ctx) throw new Error("useChain must be used within ChainProvider");
  return ctx;
}
