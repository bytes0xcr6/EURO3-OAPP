import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

export default buildModule("MintableToken", (m) => {
  const mintableToken = m.contract("MintableToken", ["EURO3", "EURO3"]);
  return { mintableToken };
});
