import { deployAndSet } from "./deploy/BridgeManager_LZ";
import { setNewChains } from "./interact/setNewChain";
import { bridgeToken } from "./interact/bridgeToken";
import hre from "hardhat";

const chainData = {
  mumbai: {
    chainId: "80001",
    endpoint: "0x6edce65403992e310a62460808c4b910d972f10f",
    endpointId: "40109", // *  https://docs.layerzero.network/contracts/endpoint-addresses
    MintableToken: "0xa4876B4e2D43e9523AEc0224Edf6EB2D5D8CAe41", // Not needed for deployAndSet Method
    MintableTokenOwner: "0x9e22dE41D0f1504ddC633788857E812A58641598", // Not needed for deployAndSet Method
    BridgeManagerLZ: "0xd34877A7fF9a117585e5A49BB15c3c4b225D2a51", // Not needed for deployAndSet Method
  },
  arbitrum_sepolia: {
    chainId: "421614",
    endpoint: "0x6edce65403992e310a62460808c4b910d972f10f",
    endpointId: "40231", // * https://docs.layerzero.network/contracts/endpoint-addresses
    MintableToken: "0x881D1b255c638169F4216c8D63be0e9Da21C745E", // Not needed for deployAndSet Method
    MintableTokenOwner: "0x62e6762EB9BB089Aaa7BFeF383384afAF64c9d28", // Not needed for deployAndSet Method
    BridgeManagerLZ: "0x2dA1BDFeD04206e5a8418EC9CFd0a19d806Fa7cA", // Not needed for deployAndSet Method
  },
  linea_testnet: {
    chainId: "59140",
    endpoint: "0x6edce65403992e310a62460808c4b910d972f10f",
    endpointId: "40157", // * https://docs.layerzero.network/contracts/endpoint-addresses
    MintableToken: "0xBA7999C79b63e155CfE5d51a44302F9384783b0B", // Not needed for deployAndSet Method
    MintableTokenOwner: "0x78e74CB5eBEf70f885C5f14CbCfCe905bd6a6b1E", // Not needed for deployAndSet Method
    BridgeManagerLZ: "0xAE7967127944B3eF3703a7D1E0BdE9473C609C07", // Not needed for deployAndSet Method
  },
};

// * npx hardhat run ./scripts/index.ts --network <NETWORK NAME>
const MUMBAI = chainData.mumbai;
const ARBITRUM_TESTNET = chainData.arbitrum_sepolia;
const LINEA_TESTNET = chainData.linea_testnet;
const chainId = hre.network.config.chainId?.toString();

//* Deploy Contracts on each chain
// if (chainId == MUMBAI.chainId) deployAndSet(MUMBAI); //* Step 1
// if (chainId == ARBITRUM_TESTNET.chainId) deployAndSet(ARBITRUM_TESTNET); //* Step 2
// if (chainId == LINEA_TESTNET.chainId) deployAndSet(LINEA_TESTNET); //* Step 3
//* Set contract on chain From to interact with chain To
// if (chainId == MUMBAI.chainId)
//   setNewChains(MUMBAI, [ARBITRUM_TESTNET, LINEA_TESTNET]); //* Step 4                    - 1.st batch MUMBAI
// if (chainId == ARBITRUM_TESTNET.chainId)
//   setNewChains(ARBITRUM_TESTNET, [MUMBAI, LINEA_TESTNET]); //* Step 5                    - 2.st batch ARBITRUM SEPOLIA
// if (chainId == LINEA_TESTNET.chainId)
//   setNewChains(LINEA_TESTNET, [MUMBAI, ARBITRUM_TESTNET]); //* Step 6                    - 3.st batch LINEA GOERLI

//* Step 3: Bridge from Chain A to Chain B
const amountToBridge = "1";
// bridgeToken(MUMBAI, ARBITRUM_TESTNET, amountToBridge); //* Step 10
