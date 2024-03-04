// import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";
// import chainData from "../../data/chainData.json";

// export default buildModule("LZ", (m) => {
//   const signer = m.getAccount(0);

//   const BridgeManagerLZ_mumbai = m.contract("BridgeManagerLZ_mumbai", [
//     chainData.mumbai.chainId,
//     signer,
//     await euro3.getAddress(),
//     await mintableOwner.getAddress(),
//     chainData.endpoint,
//   ]);

//   m.call(BridgeManagerLZ_mumbai, "setChainAllowance", [chainName, true]);

//   // todo: This should be added to other module, as BridgeManagerLZ_mumbai didn´t get an address yet. or not?
//   const MintableOwner = m.contractAt(
//     "MintableTokenOwner",
//     chainData.mumbai.mintableOwner
//   );
//   m.call(MintableOwner, "addMinter", [BridgeManagerLZ_mumbai.address]);
//   return { BridgeManagerLZ_mumbai };
// });
