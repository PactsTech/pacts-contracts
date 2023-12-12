// We require the Hardhat Runtime Environment explicitly here. This is optional
// but useful for running the script in a standalone fashion through `node <script>`.
//
// You can also run a script with `npx hardhat run <script>`. If you do that, Hardhat
// will compile your contracts, add the Hardhat Runtime Environment's members to the
// global scope, and execute the script.
import hre from 'hardhat';

try {
  const [seller, pacts] = await hre.ethers.getSigners();
  console.log(`Deploying the contracts with account: ${deployer.address}`);
  const processor = await hre.ethers.deployContract('OrderProcessor', []);
  await processor.waitForDeployment();
  console.log(`Token address: ${await processor.getAddress()}`);
} catch (error) {
  console.error(error);
  process.exitCode = 1;
}