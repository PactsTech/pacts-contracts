import { Mnemonic, randomBytes } from 'ethers';

const entropy = randomBytes(32);
const mnemonic = Mnemonic.fromEntropy(entropy);

console.log(mnemonic.phrase);