import { http, createConfig } from "wagmi";
import { defineChain } from "viem";
import { injected } from "wagmi/connectors";
import { CHAINS } from "./contracts";

export const monadTestnet = defineChain({
  id: CHAINS.monad.chainId,
  name: CHAINS.monad.name,
  nativeCurrency: CHAINS.monad.nativeCurrency,
  rpcUrls: {
    default: { http: [CHAINS.monad.rpcUrl] },
  },
  blockExplorers: {
    default: { name: "Monad Explorer", url: CHAINS.monad.explorerUrl },
  },
  testnet: true,
});

export const config = createConfig({
  chains: [monadTestnet],
  connectors: [injected()],
  transports: {
    [monadTestnet.id]: http(CHAINS.monad.rpcUrl),
  },
  ssr: true,
  multiInjectedProviderDiscovery: false,
});
