import { ethers, network } from "hardhat";
import dotenv from "dotenv";
dotenv.config();

const ccipData = {
  mumbai: {
    chainId: "80001",
    bridgeManager: "0x6646805214327e5fa3bcA3E9ebd90F2d1198e075",
    EURO3: "0x476E079929215561B5c90E0Fae6a92F3384da59A",
    router: "0x1035CabC275068e0F4b745A29CEDf38E13aF41b1",
    mintableOwner: "0xA8FAA3DA0B6d8393e8F8A405A9a9FD363560aE61",
    chainSelector: "12532609583862916517",
    LINK: "0x326c977e6efc84e512bb9c30f76e30c160ed06fb",
    rpc: "https://rpc-mumbai.maticvigil.com",
  },
  bnbTest: {
    chainId: "97",
    bridgeManager: "0x6646805214327e5fa3bcA3E9ebd90F2d1198e075",
    EURO3: "0x476E079929215561B5c90E0Fae6a92F3384da59A",
    router: "0xE1053aE1857476f36A3C62580FF9b016E8EE8F6f",
    mintableOwner: "0xA8FAA3DA0B6d8393e8F8A405A9a9FD363560aE61",
    chainSelector: "13264668187771770619",
    LINK: "0x84b9B910527Ad5C03A9Ca831909E21e236EA7b06",
    rpc: "https://data-seed-prebsc-1-s1.binance.org:8545/",
  },
};

async function main(chainFrom: any, chainTo: any) {
  const amount = ethers.parseUnits("1", "ether");

  const providerFrom = new ethers.JsonRpcProvider(chainFrom.rpc);
  const signerFrom = new ethers.Wallet(process.env.PRIVATE_KEY!, providerFrom);

  console.log("Signer Address:", signerFrom.address);

  const BridgeManager = await ethers.getContractAt(
    "BridgeManager",
    chainFrom.bridgeManager,
    signerFrom
  );

  const nonce = await BridgeManager.txNonce(
    signerFrom.address,
    chainTo.chainId
  );

  const hashedMessage = getMessageHash(
    amount.toString(),
    chainFrom.chainId,
    chainTo.chainId,
    nonce.toString()
  );

  const signature = await signerFrom.signMessage(hashedMessage);
  console.log("Signature:", signature);

  const result = await BridgeManager.verifySignature(
    amount,
    chainFrom.chainId,
    chainTo.chainId,
    nonce,
    signature,
    signerFrom.address
  );
  console.log("Signature Verification Result:", result);
}

function getMessageHash(
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

main(ccipData.mumbai, ccipData.bnbTest)
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
