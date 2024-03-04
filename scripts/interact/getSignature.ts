import { ethers, network } from "hardhat";
import { getMessageHash } from "../utils/getMessageHash";
import dotenv from "dotenv";
dotenv.config();

export async function getSignature(
  chainFrom: any,
  chainTo: any,
  amount: string
) {
  const [signer] = await ethers.getSigners();

  console.log("Signer Address:", signer.address);

  const BridgeManager = await ethers.getContractAt(
    "BridgeManagerLZ",
    chainFrom.BridgeManagerLZ,
    signer
  );

  const nonce = await BridgeManager.txNonce(signer.address, chainTo.chainId);

  const hashedMessage = getMessageHash(
    amount.toString(),
    chainFrom.chainId,
    chainTo.chainId,
    nonce.toString(),
    chainTo.BridgeManagerLZ
  );

  const signature = await signer.signMessage(hashedMessage);
  console.log("Signature:", signature);

  const result = await BridgeManager.verifySignature(
    amount,
    chainFrom.chainId,
    chainTo.chainId,
    nonce,
    signature,
    signer.address,
    chainTo.BridgeManagerLZ
  );
  console.log("Signature Verification Result:", result);

  return { signature, isVerified: result };
}
