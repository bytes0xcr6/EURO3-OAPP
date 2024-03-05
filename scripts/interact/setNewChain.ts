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

  const bridgeDestBytes32 = ethers.zeroPadValue(chainTo.BridgeManagerLZ, 32);
  const updateChain = await BridgeManager.updateDestChain(
    bridgeDestBytes32,
    chainTo.chainId,
    chainTo.endpointId,
    true
  );
  await updateChain.wait();

  const setPeer = await BridgeManager.setPeer(
    chainTo.endpointId,
    bridgeDestBytes32
  );
  await setPeer.wait();

  console.log("Setting compleated ");
}
