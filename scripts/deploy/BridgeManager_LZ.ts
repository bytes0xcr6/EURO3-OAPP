import { ethers } from "hardhat";
import dotenv from "dotenv";
import { verifyContract } from "../utils/verifyContract";
dotenv.config();

//* Deploy EURO3, MintableOwner & BridgeManagerLZ
export async function deployAndSet(chain: any) {
  console.log(`\nDeploying and setting for chainId: ${chain.chainId}\n`);

  const [signer] = await ethers.getSigners();
  console.log("Signer", signer.address);
  const EURO3 = await ethers.getContractFactory("MintableToken", signer);
  const euro3 = await EURO3.deploy("EURO3", "EURO3", {});
  await verifyContract(euro3.target, ["EURO3", "EURO3"]);

  const MintableOwner = await ethers.getContractFactory(
    "MintableTokenOwner",
    signer
  );
  const mintableOwner = await MintableOwner.deploy(euro3.target);
  await mintableOwner.waitForDeployment();
  await verifyContract(mintableOwner.target, [euro3.target]);

  await euro3.transferOwnership(mintableOwner);

  console.log("EURO3: ", euro3.target);
  console.log("mintableOwner: ", mintableOwner.target);

  const BridgeManager = await ethers.getContractFactory(
    "BridgeManagerLZ",
    signer
  );
  const bridgeManager = await BridgeManager.deploy(
    chain.chainId,
    signer.address,
    euro3.target,
    mintableOwner.target,
    chain.endpoint
  );
  await verifyContract(bridgeManager.target, [
    chain.chainId,
    signer.address,
    euro3.target,
    mintableOwner.target,
    chain.endpoint,
  ]);

  console.log("bridgeManager: ", bridgeManager.target);

  const addMinter1 = await mintableOwner.addMinter(bridgeManager.target);
  await addMinter1.wait();
  const addMinter2 = await mintableOwner.addMinter(signer.address);
  await addMinter2.wait();

  console.log("Testing flow...");
  //   FOR TESTING - Remove after testing
  const amount = ethers.parseUnits("100000", "ether");
  const minting = await mintableOwner.mint(signer.address, amount);
  await minting.wait();

  console.log({ EURO: euro3.target });
  console.log({ mintableOwner: mintableOwner.target });
  console.log({ bridgeManager: bridgeManager.target });

  console.log("EURO3, mintableOwner & bridgeManager deployed and set");
}
