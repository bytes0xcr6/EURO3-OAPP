// import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";
// // import chainData from "../../data/chainData.json";

// export default buildModule("MintableToken", (m) => {
//   const mintableToken = m.contract("MintableToken", ["EURO3", "EURO3"]);
//   console.log(mintableToken);
//   return { mintableToken };
// });

// // export const MintableOwner = buildModule("MintableTokenOwner", (m) => {
// //   // Get the deployed MintableToken address
// //   const mintableToken = MintableToken;

// //   const mintableTokenOwner = m.contract("MintableTokenOwner", [mintableToken]);
// //   m.call(mintableTokenOwner, "addMinter", [BridgeManagerLZ_mumbai.address]);

// //   return { mintableTokenOwner };
// // });

// // export const BridgeManagerLZ = buildModule("LZ", (m) => {
// //   const signer = m.getAccount(0);
// //   const BridgeManagerLZ_mumbai = m.contract("BridgeManagerLZ_mumbai", [
// //     chainData.mumbai.chainId,
// //     signer,
// //     MintableToken.mintableToken.address, // Use MintableToken's address
// //     MintableOwner.mintableTokenOwner.address, // Use MintableOwner's address
// //     chainData.mumbai.endpoint,
// //   ]);

// //   m.call(BridgeManagerLZ_mumbai, "setChainAllowance", ["Binance", true]);

// //   return { BridgeManagerLZ_mumbai };
// // });
