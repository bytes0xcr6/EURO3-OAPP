import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

export default buildModule("LZ", (m) => {
  const chainData = {
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

  const signer = m.getAccount(0);

  const BridgeManagerLZ_mumbai = m.contract("BridgeManagerLZ_mumbai", [
    chainData.mumbai.chainId,
    signer,
    await euro3.getAddress(),
    await mintableOwner.getAddress(),
    chainData.endpoint,
  ]);

  m.call(BridgeManagerLZ_mumbai, "setChainAllowance", [chainName, true]);

  // todo: This should be added to other module, as BridgeManagerLZ_mumbai didn´t get an address yet. or not?
  const MintableOwner = m.contractAt(
    "MintableTokenOwner",
    chainData.mumbai.mintableOwner
  );
  m.call(MintableOwner, "addMinter", [BridgeManagerLZ_mumbai.address]);
  return { BridgeManagerLZ_mumbai };
});
