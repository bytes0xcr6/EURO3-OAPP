import { ethers } from "ethers";
import { deployAndSet } from "./deploy/BridgeManager_LZ";
import { setNewChain } from "./interact/setNewChain";
import { getSignature } from "./interact/getSignature";
import { bridgeToken } from "./interact/bridgeToken";
import { getOptions } from "./utils/getOptions";
const chainData = {
  mumbai: {
    chainId: "80001",
    endpoint: "0x6edce65403992e310a62460808c4b910d972f10f",
    endpointId: "40109", // *  https://docs.layerzero.network/contracts/endpoint-addresses
    MintableToken: "0x1651f92B23BACbE543B7BFf0B505AA24e60e20D5", // Not needed for deployAndSet Method
    MintableTokenOwner: "0xa003A38d0568A0E028CF6d69653C33F8be4B4AFd", // Not needed for deployAndSet Method
    BridgeManagerLZ: "0x9Ea19f791a9Bc1ed8b4150cdfc52aF55695cf777", // Not needed for deployAndSet Method
  },
  arbitrum_sepolia: {
    chainId: "421614",
    endpoint: "0x6edce65403992e310a62460808c4b910d972f10f",
    endpointId: "40231", // * https://docs.layerzero.network/contracts/endpoint-addresses
    MintableToken: "0x4dfA414e18bb1B67C04745f126b41212e5cC5B53", // Not needed for deployAndSet Method
    MintableTokenOwner: "0xC6c83070c14aC4cd10456e4C5a91C8739e06324A", // Not needed for deployAndSet Method
    BridgeManagerLZ: "0xa39073c52be800DC4c4b2F95013a591bd469768f", // Not needed for deployAndSet Method
  },
};

// * npx hardhat run ./scripts/index.ts --network <NETWORK NAME>
async function main() {
  //* */ Step 1: Deploy contract
  // await deployAndSet(chainData.mumbai);
  // await deployAndSet(chainData.arbitrum_sepolia);
  //* */ Step 2:
  // await setNewChain(chainData.mumbai, chainData.arbitrum_sepolia);
  await setNewChain(chainData.arbitrum_sepolia, chainData.mumbai);
  //* */ Step 3: Bridge from Chain A to Chain B
  const amount = ethers.parseUnits("1", "ether").toString();
  const { signature, isVerified } = await getSignature(
    chainData.mumbai,
    chainData.arbitrum_sepolia,
    amount
  );
  // if (!isVerified) return;
  const options = await getOptions();
  await bridgeToken(
    chainData.mumbai,
    chainData.arbitrum_sepolia,
    amount,
    options,
    signature
  );
}
main();
