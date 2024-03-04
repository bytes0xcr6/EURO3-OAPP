import { BridgeManagerLZ } from "./../../typechain-types/contracts/cross-chain/layerzero/BridgeManagerLZ";
import { ethers } from "hardhat";

export async function setNewChain(chainFrom: any, chainTo: any) {
  console.log(
    `Setting for chainIds: ${chainFrom.chainId} to ${chainTo.chainId}\n`
  );
  const [signer] = await ethers.getSigners();

  const BridgeManager = await ethers.getContractAt(
    "BridgeManagerLZ",
    chainFrom.BridgeManagerLZ,
    signer
  );
  console.log(
    chainTo.BridgeManagerLZ,
    chainTo.chainId,
    chainTo.endpointId,
    true
  );
  const updateChain = await BridgeManager.updateDestChain(
    chainTo.BridgeManagerLZ,
    chainTo.chainId,
    chainTo.endpointId,
    true
  );
  await updateChain.wait();

  const bytes32Value = ethers.zeroPadValue(chainTo.BridgeManagerLZ, 32);
  console.log({ bytes32Value });

  await BridgeManager.setPeer(chainTo.chainId, bytes32Value);

  // * Method to set the destination Address as valid
  // const setTrustedRemoteAddress = await BridgeManager.setTrustedRemoteAddress(
  //   chainTo.endpointId,
  //   chainTo.BridgeManagerLZ
  // );
  // await setTrustedRemoteAddress.wait();
  console.log("Setting compleated ");
}
