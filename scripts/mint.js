import { Contract, Wallet } from 'ethers';
import { proxyAddress, abi } from './usdc.js';

const contract = new Contract(proxyAddress, abi);

const resp = await contract.mint('0x5e91fef49a2811dbd0cc3ed2ed3a618e9efb58d0', 1000000);

console.log({ resp });