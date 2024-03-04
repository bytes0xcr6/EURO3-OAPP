import { ethers } from "hardhat";

export async function bridgeToken(
  chainFrom: any,
  chainTo: any,
  amount: string,
  signature: string
) {
  console.log(
    `\nBridging ${Number(amount) / 10 ** 18} EURO3 for chainIds: from ${
      chainFrom.chainId
    } to ${chainTo.chainId}\n`
  );
  const [signer] = await ethers.getSigners();

  const BridgeManager = await ethers.getContractAt(
    "BridgeManagerLZ",
    chainFrom.BridgeManagerLZ,
    signer
  );

  const EURO3 = await ethers.getContractAt(
    "MintableToken",
    chainFrom.MintableToken,
    signer
  );

  console.log({
    amount,
    chainIdTo: chainTo.chainId,
    signature,
    // gasCalculation: Number(gasCalculation),
  });

  const gasCalculation = await BridgeManager.quote(
    amount,
    chainTo.chainId,
    signature,
    "0x",
    signer.address
  );

  const approval = await EURO3.approve(BridgeManager.target, amount);
  await approval.wait();
  console.log("Approved to bridge to manage EURO3");

  const bridge = await BridgeManager.bridge(
    amount,
    chainTo.chainId,
    signature,
    { value: Number(gasCalculation) }
  );

  await bridge.wait();
  console.log({ bridge });
}
