import { ethers } from "hardhat";
import { getSignature } from "./../interact/getSignature";
import { getOptions } from "../utils/getOptions";

export async function bridgeToken(
  chainFrom: any,
  chainTo: any,
  amount: string // It can be passed as normal number
) {
  const formatedAmount = ethers.parseEther(amount).toString();
  console.log(
    `\nBridging ${Number(amount)} EURO3 for chainIds: from ${
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

  const allowance = await EURO3.allowance(signer.address, BridgeManager.target);
  if (Number(allowance) < Number(formatedAmount)) {
    const approval = await EURO3.approve(BridgeManager.target, formatedAmount);
    await approval.wait();
  }

  const { signature, isVerified } = await getSignature(
    chainFrom,
    chainTo,
    formatedAmount
  );

  const options = await getOptions();
  console.log({ options });
  console.log(
    formatedAmount,
    chainTo.chainId,
    signature,
    options,
    signer.address
  );
  const gasCalculation = await BridgeManager.quote(
    formatedAmount,
    chainTo.chainId,
    signature,
    options,
    signer.address
  );
  console.log(gasCalculation);
  const bridge = await BridgeManager.bridge(
    formatedAmount,
    chainTo.chainId,
    options,
    signature,
    { value: gasCalculation[0] }
  );
  console.log("HERE");

  const receipt = await bridge.wait();

  console.log({ bridge });
  console.log({ receipt });
}
