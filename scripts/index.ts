import { ethers } from "ethers";
import { deployAndSet } from "./deploy/BridgeManager_LZ";
import { setNewChain } from "./interact/setNewChain";
import { getSignature } from "./interact/getSignature";
import { bridgeToken } from "./interact/bridgeToken";
const chainData = {
  mumbai: {
    chainId: "80001",
    endpoint: "0x6edce65403992e310a62460808c4b910d972f10f",
    endpointId: "40109", // *  https://docs.layerzero.network/contracts/endpoint-addresses
    MintableToken: "0x6Bce6E6b4a9d6ba75F35d2f5544f7852730ea5c2", // Not needed for deployAndSet Method
    MintableTokenOwner: "0x843b0A0fe67de38D6eB08953bbC20797476F8BA1", // Not needed for deployAndSet Method
    BridgeManagerLZ: "0xD20E7D5C2076A2Db4660Cf360C66B9eBa03411ef", // Not needed for deployAndSet Method
  },
  arbitrum_sepolia: {
    chainId: "421614",
    endpoint: "0x6edce65403992e310a62460808c4b910d972f10f",
    endpointId: "40231", // * https://docs.layerzero.network/contracts/endpoint-addresses
    MintableToken: "0x46d646ee8bB64dADD6d33B8AD2AfE6a28082B440", // Not needed for deployAndSet Method
    MintableTokenOwner: "0xBEca4B8070dC7BF6d4b3AEEe9216D234751C72bF", // Not needed for deployAndSet Method
    BridgeManagerLZ: "0x4e28D34D488F09c56818B616Ec0cd0da37469162", // Not needed for deployAndSet Method
  },
};

// * npx hardhat run ./scripts/BridgeManager_LZ.ts --network <NETWORK NAME>
// Todo! Test it on a fork
async function main() {
  //* */ Step 1: Deploy contract
  // await deployAndSet(chainData.mumbai);
  // await deployAndSet(chainData.arbitrum_sepolia);
  //* */ Step 2:
  await setNewChain(chainData.mumbai, chainData.arbitrum_sepolia);
  // await setNewChain(chainData.arbitrum_sepolia, chainData.mumbai);
  //* */ Step 3:
  const amount = ethers.parseUnits("1", "ether").toString();
  const { signature, isVerified } = await getSignature(
    chainData.mumbai,
    chainData.arbitrum_sepolia,
    amount
  );
  if (!isVerified) return;
  await bridgeToken(
    chainData.mumbai,
    chainData.arbitrum_sepolia,
    amount,
    signature
  );
}
main();
