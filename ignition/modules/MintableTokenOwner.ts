import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

export default buildModule("LZ", (m) => {
  // todo: This should be added to other module, as BridgeManagerLZ_mumbai didn´t get an address yet. or not?
  const MintableOwner = m.contractAt(
    "MintableTokenOwner",
    chainData.mumbai.mintableOwner
  );
  m.call(MintableOwner, "addMinter", [BridgeManagerLZ_mumbai.address]);
  return { BridgeManagerLZ_mumbai };
});
