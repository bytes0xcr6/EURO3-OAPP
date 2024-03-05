import { BridgeManagerLZ } from "./../typechain-types/contracts/cross-chain/layerzero/BridgeManagerLZ";
import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import { ethers } from "hardhat";
import { getMessageHash } from "../scripts/utils/getMessageHash";
import { Options } from "@layerzerolabs/lz-v2-utilities";

const _options = Options.newOptions();

const chainData = {
  mumbai: {
    chainId: "80001",
    endpoint: "0x6edce65403992e310a62460808c4b910d972f10f",
    endpointId: "40109", // *  https://docs.layerzero.network/contracts/endpoint-addresses
  },
  arbitrum_sepolia: {
    chainId: "421614",
    endpoint: "0x6edce65403992e310a62460808c4b910d972f10f",
    endpointId: "40231", // * https://docs.layerzero.network/contracts/endpoint-addresses
  },
};

describe("EURO3Bridge_MockUp", function () {
  async function config() {
    const [deployer] = await ethers.getSigners();
    console.log("Deployer: ", deployer.address);

    const chainDataFrom = chainData.mumbai;
    const chainDataTo = chainData.arbitrum_sepolia;
    const EURO3 = await ethers.getContractFactory("MintableToken", deployer);
    const stable = await EURO3.deploy("EURO3", "EURO3");

    const MintableOwner = await ethers.getContractFactory(
      "MintableTokenOwner",
      deployer
    );
    const mintableOwner = await MintableOwner.deploy(stable.target);
    await mintableOwner.waitForDeployment();

    await stable.transferOwnership(mintableOwner.target);

    const amount = ethers.parseUnits("1", "ether");
    await mintableOwner.addMinter(deployer.address);
    await mintableOwner.mint(deployer.address, amount);

    const BridgeManager = await ethers.getContractFactory(
      "BridgeManagerLZ",
      deployer
    );
    const bridgeManager = await BridgeManager.deploy(
      chainDataFrom.chainId,
      deployer.address,
      stable.target,
      mintableOwner.target,
      chainDataFrom.endpoint
    );

    await stable.approve(bridgeManager.target, amount);

    const testingAddress = "0x6646805214327e5fa3bcA3E9ebd90F2d1198e075";
    const bridgeDestBytes32 = ethers.zeroPadValue(testingAddress, 32);

    await bridgeManager.updateDestChain(
      bridgeDestBytes32,
      chainDataTo.chainId,
      chainDataTo.endpointId,
      true
    );
    await bridgeManager.setPeer(chainDataTo.endpointId, bridgeDestBytes32);

    // Add options
    const executorGas = 2000000; // Gas limit for the executor
    const executorValue = 0; // msg.value for the lzReceive() function on destination in wei
    const _options = Options.newOptions().addExecutorLzReceiveOption(
      executorGas,
      executorValue
    );

    const formatedOptions = _options.toHex();

    return {
      bridgeManager,
      mintableOwner,
      stable,
      deployer,
      chainDataFrom,
      chainDataTo,
      bridgeDestBytes32,
      formatedOptions,
    };
  }

  describe("testing", async () => {
    it("Should burn/mint EURO3 and verify Signature", async function () {
      const {
        bridgeManager,
        deployer,
        chainDataFrom,
        chainDataTo,
        bridgeDestBytes32,
        formatedOptions,
      } = await loadFixture(config);
      const amount = ethers.parseUnits("1", "ether");

      const nonce = await bridgeManager.txNonce(
        deployer.address,
        chainDataTo.chainId
      );

      const hashedMessage = getMessageHash(
        amount.toString(),
        chainDataFrom.chainId,
        chainDataTo.chainId,
        nonce.toString(),
        bridgeDestBytes32
      );

      let signature = await deployer.signMessage(hashedMessage);

      let isVerified = await bridgeManager.verifySignature(
        amount.toString(),
        chainDataFrom.chainId,
        chainDataTo.chainId,
        nonce.toString(),
        signature,
        deployer.address,
        bridgeDestBytes32
      );

      if (!isVerified) {
        console.log("Signature not verified ");
        return;
      }

      const gasCalculation = await bridgeManager.quote(
        amount,
        chainDataTo.chainId,
        signature,
        formatedOptions,
        deployer.address
      );

      const bridge = await bridgeManager.bridge(
        amount,
        chainDataTo.chainId,
        formatedOptions,
        signature,
        { value: gasCalculation[0] }
      );
      await bridge.wait();
    });
  });
});
