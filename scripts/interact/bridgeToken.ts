import { ethers } from "hardhat";

export async function bridgeToken(
  chainFrom: any,
  chainTo: any,
  amount: string,
  options: string,
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

  const approval = await EURO3.approve(BridgeManager.target, amount);
  await approval.wait();

  console.log("Approved to bridge to manage EURO3");

  const gasCalculation = await BridgeManager.quote(
    amount,
    chainTo.chainId,
    signature,
    options,
    signer.address
  );
  console.log({ gasCalculation });

  console.log(amount, chainTo.chainId, options, signature, {
    value: gasCalculation[0],
  });
  const bridge = await BridgeManager.bridge(
    amount,
    chainTo.chainId,
    options,
    signature,
    { value: gasCalculation[0] }
  );

  await bridge.wait();
  console.log({ bridge });
}
