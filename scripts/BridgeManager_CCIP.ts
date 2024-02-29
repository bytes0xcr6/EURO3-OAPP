import { ethers, run } from "hardhat";
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

async function setNewChain(chainFrom: any, chainTo: any) {
  console.log(
    `Deploying and setting for chainId: ${chainFrom.chainId} to ${chainTo.chainId}\n`
  );

  const provider = new ethers.JsonRpcProvider(chainFrom.rpc);
  const signer = new ethers.Wallet(process.env.PRIVATE_KEY!, provider);

  const BridgeManager = await ethers.getContractAt(
    "BridgeManager",
    chainFrom.bridgeManager,
    signer
  );

  const tx = await BridgeManager.updateDestChain(
    chainTo.chainId,
    chainTo.bridgeManager,
    chainTo.chainSelector,
    true,
    { gasLimit: 200000 }
  );
  await tx.wait();

  const result = await BridgeManager.destinationChain(chainTo.chainId);
  console.log(result);
}

// Deploy & Setter for new chains
async function deployAndSet(chain: any) {
  console.log(`Deploying and setting for chainId: ${chain.chainId}\n`);
  const provider = new ethers.JsonRpcProvider(chain.rpc);
  const signer = new ethers.Wallet(process.env.PRIVATE_KEY!, provider);
  const EURO3 = await ethers.getContractFactory("MintableToken", signer);
  const euro3 = await EURO3.deploy("EURO3", "EURO3");

  const amount = ethers.parseUnits("100000", "ether");
  await euro3.mint(signer.address, amount, { gasLimit: 200000 });
  const MintableOwner = await ethers.getContractFactory(
    "MintableTokenOwner",
    signer
  );
  const mintableOwner = await MintableOwner.deploy(await euro3.getAddress());

  await euro3.transferOwnership(await mintableOwner.getAddress(), {
    gasLimit: 200000,
  });

  console.log("EURO3: ", await euro3.getAddress());
  console.log("mintableOwner: ", await mintableOwner.getAddress());

  // todo: Allow the bridgeManager to mint on the mintableOwner
  const BridgeManager = await ethers.getContractFactory(
    "BridgeManagerCCIP",
    signer
  );
  const bridgeManager = await BridgeManager.deploy(
    chain.chainId,
    signer.address,
    await euro3.getAddress(),
    await mintableOwner.getAddress(),
    chain.LINK,
    chain.router
  );
  console.log("bridgeManager: ", await bridgeManager.getAddress());

  await mintableOwner.addMinter(await bridgeManager.getAddress(), {
    gasLimit: 200000,
  });

  console.log("EURO3, mintableOwner & bridgeManager deployed and set");
}

async function main(chainFrom: any, chainTo: any) {
  // await deployAndSet(chainFrom); // Set Chain A to allow B
  // await deployAndSet(chainTo); // Set Chain B to allow A

  await setNewChain(chainFrom, chainTo); // Set Chain A to allow B
  await setNewChain(chainTo, chainFrom); // Set Chain B to allow A
}

main(ccipData.mumbai, ccipData.bnbTest);
