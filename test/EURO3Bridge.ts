import { MintableToken } from "./../typechain-types/contracts/MintableToken";
import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import { ethers } from "hardhat";
import { getMessageHash } from "../scripts/utils/getMessageHash";

const ccipData = {
  mumbai: {
    chainId: "80001",
    bridgeManager: "0x6646805214327e5fa3bcA3E9ebd90F2d1198e075",
    EURO3: "0x476E079929215561B5c90E0Fae6a92F3384da59A",
    router: "0x1035CabC275068e0F4b745A29CEDf38E13aF41b1",
    mintableOwner: "0xA8FAA3DA0B6d8393e8F8A405A9a9FD363560aE61",
    chainSelector: "12532609583862916517",
    LINK: "0x326c977e6efc84e512bb9c30f76e30c160ed06fb",
    // rpc: 'https://rpc-mumbai.maticvigil.com',
  },
  bnbTest: {
    chainId: "97",
    bridgeManager: "0x6646805214327e5fa3bcA3E9ebd90F2d1198e075",
    EURO3: "0x476E079929215561B5c90E0Fae6a92F3384da59A",
    router: "0xE1053aE1857476f36A3C62580FF9b016E8EE8F6f",
    mintableOwner: "0xA8FAA3DA0B6d8393e8F8A405A9a9FD363560aE61",
    chainSelector: "13264668187771770619",
    LINK: "0x84b9B910527Ad5C03A9Ca831909E21e236EA7b06",
    // rpc: 'https://data-seed-prebsc-1-s1.binance.org:8545/',
  },
};

describe("EURO3Bridge_MockUp", function () {
  async function config() {
    const [deployer] = await ethers.getSigners();

    const MintableToken = await ethers.getContractFactory(
      "MintableToken",
      deployer
    );

    const stable = await MintableToken.deploy("EURO3", "EUR3");

    const MintableTokenOwner = await ethers.getContractFactory(
      "MintableTokenOwner",
      deployer
    );
    const mintableTokenOwner = await MintableTokenOwner.deploy(
      await stable.getAddress()
    );

    const BridgeManager = await ethers.getContractFactory(
      "BridgeManagerCCIP_MockUp",
      deployer
    );
    const bridgeManager = await BridgeManager.deploy(
      ccipData.mumbai.chainId,
      deployer.address,
      await stable.getAddress(),
      await mintableTokenOwner.getAddress(),
      ccipData.mumbai.LINK,
      ccipData.mumbai.router
    );
    console.log("bridgeManager: ", await bridgeManager.getAddress());

    const testingAddress = ["0x6646805214327e5fa3bcA3E9ebd90F2d1198e075"];
    await bridgeManager.updateDestChain(
      ccipData.bnbTest.chainId,
      testingAddress[0],
      0,
      true
    );

    return { bridgeManager, mintableTokenOwner, stable, deployer };
  }

  describe("testing", async () => {
    it("Should burn/mint EURO3 and verify Signature", async function () {
      const { bridgeManager, mintableTokenOwner, stable, deployer } =
        await loadFixture(config);
      const amount = ethers.parseUnits("1", "ether");
      const chainFrom = ccipData.mumbai.chainId;
      const chainTo = ccipData.bnbTest.chainId;
      const nonce = await bridgeManager.txNonce(
        await deployer.getAddress(),
        chainTo
      );
      const gasLimit = "200000";
      const hashedMessage = getMessageHash(
        amount.toString(),
        chainFrom,
        chainTo,
        nonce.toString()
      );

      let signature = await deployer.signMessage(hashedMessage);

      let isVerified = await bridgeManager.verifySignature(
        amount.toString(),
        chainFrom,
        chainTo,
        nonce.toString(),
        signature,
        deployer.address
      );

      console.log({ isVerified });
      if (!isVerified) {
        console.log("Signature not verified ");
        return;
      }

      // todo: send EURO3/stable to the deployer address,
      await mintableTokenOwner
        .connect(deployer)
        .mint(await deployer.getAddress(), amount);
      await stable.approve(await bridgeManager.getAddress(), amount);
      await bridgeManager.burn(
        amount,
        chainTo,
        signature,
        ccipData.mumbai.LINK,
        gasLimit
      );
      // * Then _ccipReceive should be called by Chainlink and it ill mint the EURO3 with the signed data
    });
  });
});
