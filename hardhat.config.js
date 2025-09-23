require("@nomicfoundation/hardhat-toolbox");
require("dotenv").config(); // Load .env variables

module.exports = {
  defaultNetwork: "hardhat",
  networks: {
    hardhat: {},
    localhost: {
      url: "http://127.0.0.1:8545",
    },
    oninoTestnet: {
      url: process.env.NEXT_PUBLIC_RPC_URL || "https://rpctestnet.onino.io", // ✅ uses your .env
      chainId: 211223, // ✅ confirm this is correct for Onino Testnet
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [],
    },
  },
  solidity: {
    version: "0.8.19",
    settings: {
      optimizer: { enabled: true, runs: 200 },
    },
  },
  mocha: {
    timeout: 40000,
  },
};
