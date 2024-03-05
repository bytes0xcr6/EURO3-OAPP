import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";
import "@nomicfoundation/hardhat-ignition-ethers";
import "hardhat-tracer";
require("dotenv").config();

const config: HardhatUserConfig = {
  defaultNetwork: "hardhat",
  networks: {
    hardhat: {
      chainId: 1337,
      forking: {
        url: process.env.RPC_PROVIDER_MUMBAI!,
        // url: "http://127.0.0.1:8545/",
      },
    },
    buildbear_eth: {
      url: process.env.RPC_PROVIDER_TESTNET_ETH!,
      accounts: [process.env.PRIVATE_KEY!],
    },
    buildbear_polygon: {
      url: process.env.RPC_PROVIDER_TESTNET_POLYGON_BUILDBEAR!,
      accounts: [process.env.PRIVATE_KEY!],
    },
    ethereum: {
      url: process.env.RPC_PROVIDER_MAINNET!,
      accounts: [process.env.PRIVATE_KEY!],
    },
    mumbai: {
      url: process.env.RPC_PROVIDER_MUMBAI,
      accounts: [process.env.PRIVATE_KEY!],
      chainId: 80001,
    },
    arbitrum_sepolia: {
      url: process.env.RPC_PROVIDER_TESTNET_ARBITRUM!,
      accounts: [process.env.PRIVATE_KEY!],
    },
  },
  etherscan: {
    apiKey: {
      ethereum: process.env.ETH_SCAN_API_KEY!,
      buildbear_eth: "verifyContract",
      buildbear_polygon: "verifyContract",
      polygonMumbai: process.env.SCAN_API_KEY_MUMBAI!,
      arbitrum_sepolia: process.env.SCAN_API_KEY_TESTNET_ARBITRUM!,
    },
    customChains: [
      {
        network: "buildbear_eth",
        chainId: Number(process.env.CHAIN_ID_TESTNET_ETH!),
        urls: {
          apiURL: process.env.VERIFY_PROVIDER_TESTNET_ETH!,
          browserURL: process.env.BROWSER_URL_PROVIDER_TESTNET_ETH!,
        },
      },
      {
        network: "buildbear_polygon",
        chainId: Number(process.env.CHAIN_ID_TESTNET_POLYGON_BUILDBEAR!),
        urls: {
          apiURL: process.env.VERIFY_PROVIDER_TESTNET_POLYGON_BUILDBEAR!,
          browserURL:
            process.env.BROWSER_URL_PROVIDER_TESTNET_POLYGON_BUILDBEAR!,
        },
      },
      {
        network: "ethereum",
        chainId: 1,
        urls: {
          apiURL: "https://api.basescan.org/api",
          browserURL: "https://etherscan.io",
        },
      },
      {
        network: "mumbai",
        chainId: Number(process.env.CHAIN_ID_TESTNET_MUMBAI)!,
        urls: {
          apiURL: process.env.VERIFY_PROVIDER_MUMBAI!,
          browserURL: process.env.BROWSER_URL_PROVIDER_MUMBAI!,
        },
      },
      {
        network: "arbitrum_sepolia",
        chainId: Number(process.env.CHAIN_ID_TESTNET_ARBITRUM)!,
        urls: {
          apiURL: process.env.VERIFY_PROVIDER_TESTNET_ARBITRUM!,
          browserURL: process.env.BROWSER_URL_PROVIDER_TESTNET_ARBITRUM!,
        },
      },
    ],
  },
  solidity: {
    compilers: [
      {
        version: "0.8.19",
      },
      {
        version: "0.8.20",
      },
      {
        version: "0.8.24",
      },
    ],
    settings: {
      optimizer: {
        enabled: true,
        runs: 200,
      },
    },
  },
  paths: {
    sources: "./contracts",
    tests: "./test",
    cache: "./cache",
    artifacts: "./artifacts",
  },
  mocha: {
    timeout: 40000,
  },
};

export default config;
