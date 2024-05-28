// We require the Hardhat Runtime Environment explicitly here. This is optional
// but useful for running the script in a standalone fashion through `node <script>`.
//
// You can also run a script with `npx hardhat run <script>`. If you do that, Hardhat
// will compile your contracts, add the Hardhat Runtime Environment's members to the
// global scope, and execute the script.
import hre from 'hardhat';

const storeName = process.env.STORE_NAME;
const cancelBlocks = BigInt(process.env.CANCEL_BLOCKS || '1000');
const disputeBlocks = BigInt(process.env.DISPUTE_BLOCKS || '1000');
const reporter = process.env.REPORTER;
const reporterPublicKey = process.env.REPORTER_PUBLIC_KEY;
const arbiter = process.env.ARBITER;
const arbiterPublicKey = process.env.ARBITER_PUBLIC_KEY;
const token = process.env.TOKEN;

try {
  const processor = await hre.viem.deployContract('OrderProcessorErc20', [
    storeName,
    cancelBlocks,
    disputeBlocks,
    reporter,
    reporterPublicKey,
    arbiter,
    arbiterPublicKey,
    token
  ]);
  console.log(`Token address: ${await processor.getAddress()}`);
} catch (error) {
  console.error(error);
  process.exitCode = 1;
}