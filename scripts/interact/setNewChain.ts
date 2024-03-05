import { ethers } from "hardhat";

export async function setNewChain(chainFrom: any, chainTo: any) {
  if (
    chainTo.MintableToken == "" ||
    chainTo.MintableTokenOwner == "" ||
    chainTo.BridgeManagerLZ == ""
  ) {
    console.error(
      "Invalid values for MintableToken, MintableTokenOwner, or BridgeManagerLZ in chainTo"
    );
    return;
  }

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
  console.log("Chain updated");
  const setPeer = await BridgeManager.setPeer(
    chainTo.endpointId,
    bridgeDestBytes32
  );
  await setPeer.wait();
  console.log("Peer updated");
}

export async function setNewChains(chainFrom: any, chainTo: any[]) {
  for (let i = 0; i < chainTo.length; i++) {
    await setNewChain(chainFrom, chainTo[i]);
  }
  console.log("Batch setting completed ");
}
