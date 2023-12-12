import { Wallet } from 'ethers';

const wallet = Wallet.createRandom();

// Get the corresponding Ethereum address
const address = await wallet.getAddress();
const publicKey = wallet.publicKey;
const privateKey = wallet.privateKey;

// const privateKeyBuffer = Buffer.from(wallet.privateKey, 'utf8');
// const publicKeyBuffer = Buffer.from(wallet.publicKey, 'utf8');

// // Convert the buffers to hex strings
// const privateKey = privateKeyBuffer.toString('hex');
// const publicKey = publicKeyBuffer.toString('hex');

console.log(JSON.stringify({ privateKey, publicKey, address }, null, 2));