// src/services/provider.js
import React, { useState, useEffect } from "react"
import { RainbowKitSiweNextAuthProvider } from "@rainbow-me/rainbowkit-siwe-next-auth"
import {
  WagmiConfig,
  configureChains,
  createConfig,
} from "wagmi"
import {
  getDefaultWallets,
  RainbowKitProvider,
  darkTheme,
} from "@rainbow-me/rainbowkit"
import { SessionProvider } from "next-auth/react"
import { jsonRpcProvider } from "wagmi/providers/jsonRpc"

// ✅ Define Onino Testnet inline
const oninoTestnet = {
  id: 211223, // use the correct Onino chainId
  name: "Onino Testnet",
  network: "onino-testnet",
  nativeCurrency: {
    name: "ONI",
    symbol: "ONI",
    decimals: 18,
  },
  rpcUrls: {
    default: { http: ["https://rpctestnet.onino.io"] },
    public: { http: ["https://rpctestnet.onino.io"] },
  },
  blockExplorers: {
    default: { name: "Onino Explorer", url: "https://explorer.onino.io" },
  },
  testnet: true,
  iconUrl: "/onino.jpg",
}

const { chains, publicClient, webSocketPublicClient } = configureChains(
  [oninoTestnet],
  [jsonRpcProvider({ rpc: () => ({ http: "https://rpctestnet.onino.io" }) })]
)

// 👇 RainbowKit default wallets (MetaMask, Coinbase, WalletConnect, etc.)
const { connectors } = getDefaultWallets({
  appName: "RentalDapp",
  projectId: "YOUR_WALLETCONNECT_PROJECT_ID", // you can use a real projectId if you want WalletConnect
  chains,
})

// ✅ Wagmi config
const config = createConfig({
  autoConnect: true,
  connectors,
  publicClient,
  webSocketPublicClient,
})

const demoAppInfo = {
  appName: "RentalDapp",
}

const getSiweMessageOptions = () => ({
  statement: `
  Once you're signed in, you'll be able to access all of our dApp's features.
  Thank you for partnering with Rental dApp!`,
})

const Providers = ({ children, pageProps }) => {
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])

  return (
    <WagmiConfig config={config}>
      <SessionProvider refetchInterval={0} session={pageProps.session}>
        <RainbowKitSiweNextAuthProvider
          getSiweMessageOptions={getSiweMessageOptions}
        >
          <RainbowKitProvider chains={chains} theme={darkTheme()} appInfo={demoAppInfo}>
            {mounted && children}
          </RainbowKitProvider>
        </RainbowKitSiweNextAuthProvider>
      </SessionProvider>
    </WagmiConfig>
  )
}

export default Providers

