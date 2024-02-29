import { ethers } from "ethers";

export function getMessageHash(
  amount: string,
  chainFromChainId: string,
  chainToChainId: string,
  nonce: string
) {
  let abiCoder = new ethers.AbiCoder();
  let packedData = abiCoder.encode(
    ["uint256", "uint64", "uint64", "uint256"],
    [amount, chainFromChainId, chainToChainId, nonce]
  );
  let messageHash = ethers.keccak256(packedData);
  let messageHashArrayify = ethers.getBytes(messageHash);

  return messageHashArrayify;
}
