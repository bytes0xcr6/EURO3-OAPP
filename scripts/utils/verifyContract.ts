import { run } from "hardhat";

export async function verifyContract(address: any, args: any[]) {
  try {
    console.log("Verifying contract...");
    await new Promise((resolve) => setTimeout(resolve, 20000));

    await run("verify:verify", {
      address: address,
      constructorArguments: args,
    });
  } catch (e: any) {
    if (e.message.toLowerCase().includes("already verified\n")) {
      console.log("Already verified!\n");
    } else {
      console.log(e);
    }
  }
}
