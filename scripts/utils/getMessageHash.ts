import { ethers } from "hardhat";

export function getMessageHash(
  amount: string,
  chainFromChainId: string,
  chainToChainId: string,
  nonce: string,
  bridgeManagerDest: string
) {
  let abiCoder = new ethers.AbiCoder();
  let packedData = abiCoder.encode(
    ["uint256", "uint64", "uint64", "uint256", "bytes"],
    [amount, chainFromChainId, chainToChainId, nonce, bridgeManagerDest]
  );
  let messageHash = ethers.keccak256(packedData);
  let messageHashArrayify = ethers.getBytes(messageHash);

  return messageHashArrayify;
}
