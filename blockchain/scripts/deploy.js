const hre = require("hardhat");

async function main() {
  const Trustchain = await hre.ethers.getContractFactory("Trustchain");
  const trustchain = await Trustchain.deploy();

  await trustchain.waitForDeployment();

  console.log(
    `Trustchain deployed to: ${await trustchain.getAddress()}`
  );
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
