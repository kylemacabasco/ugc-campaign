"use client";

import React, { FC, ReactNode, useMemo } from "react";
import {
  ConnectionProvider,
  WalletProvider,
} from "@solana/wallet-adapter-react";
import { WalletAdapterNetwork } from "@solana/wallet-adapter-base";
import { WalletModalProvider } from "@solana/wallet-adapter-react-ui";
import { clusterApiUrl } from "@solana/web3.js";

// Import the wallet adapter styles
import "@solana/wallet-adapter-react-ui/styles.css";

interface SolanaProviderProps {
  children: ReactNode;
}

export const SolanaProvider: FC<SolanaProviderProps> = ({ children }) => {
  // Use custom RPC endpoint from environment variables or fallback to mainnet
  const endpoint = useMemo(() => {
    const rpcUrl = process.env.NEXT_PUBLIC_SOLANA_RPC_URL;
    if (rpcUrl) {
      return rpcUrl;
    }
    // Fallback to mainnet-beta if no RPC URL is provided
    const network = WalletAdapterNetwork.Mainnet;
    return clusterApiUrl(network);
  }, []);

  return (
    <ConnectionProvider endpoint={endpoint}>
      <WalletProvider wallets={[]} autoConnect>
        <WalletModalProvider>{children}</WalletModalProvider>
      </WalletProvider>
    </ConnectionProvider>
  );
};