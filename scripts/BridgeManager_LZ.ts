import { ethers, run } from "hardhat";
import dotenv from "dotenv";
dotenv.config();

const ccipData = {
  mumbai: {
    chainId: "80001",
    bridgeManager: "0xf8854EF550C7342EdDa208Eac1B258685CCbbdbb",
    EURO3: "0xE537670FfFDFE4EE041e8f73b268b3f39f398D14",
    mintableOwner: "0x95b5c2A561500b37776D65d799BDA2Ff3B3dC0aB",
    endpoint: "0x6edce65403992e310a62460808c4b910d972f10f",
    endpointId: "40109",
    rpc: "https://rpc-mumbai.maticvigil.com",
  },
  bnbTest: {
    chainId: "97",
    bridgeManager: "0xd5AD6Ee019a3C9951432A177107634AF9649DB57", // EOA
    EURO3: "0x41516b6e224C29b83959897fe50Cb9988Ee3829A",
    mintableOwner: "0x0638E8aF9bdD1F172E19045Aa4803D4dbA413904",
    endpoint: "0x6edce65403992e310a62460808c4b910d972f10f",
    endpointId: "40102",
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
    chainTo.endpointId,
    true
    // { gasLimit: 200000 }
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
  console.log("Signer", await signer.getAddress());
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

  const BridgeManager = await ethers.getContractFactory(
    "BridgeManagerLZ",
    signer
  );
  const bridgeManager = await BridgeManager.deploy(
    chain.chainId,
    await signer.getAddress(),
    await euro3.getAddress(),
    await mintableOwner.getAddress(),
    chain.endpoint
  );
  console.log("bridgeManager: ", await bridgeManager.getAddress());

  await mintableOwner.addMinter(await bridgeManager.getAddress(), {
    gasLimit: 200000,
  });

  console.log("EURO3, mintableOwner & bridgeManager deployed and set");
}

// async function

async function main(chainFrom: any, chainTo: any) {
  // await deployAndSet(chainFrom); // Set Chain A to allow B
  // await deployAndSet(chainTo); // Set Chain B to allow A
  // await setNewChain(chainFrom, chainTo); // Set Chain A to allow B
  await setNewChain(chainTo, chainFrom); // Set Chain B to allow A
}

main(ccipData.mumbai, ccipData.bnbTest);

// *Steps:
// 1. Deploy EURO3 & Bridge Manager
// 2. Set both Chains in each contract
// 3. Send from Chain A to Chain B
