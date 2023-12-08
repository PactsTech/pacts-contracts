import pkg from 'ethereumjs-wallet';

const Wallet = pkg.default;

// Generate a new random private key
const wallet = Wallet.generate();
const privateKeyBuffer = wallet.getPrivateKey();
const publicKeyBuffer = wallet.getPublicKey();

// Get the corresponding Ethereum address
const addressBuffer = wallet.getAddress();

// Convert the buffers to hex strings
const privateKey = privateKeyBuffer.toString('hex');
const publicKey = publicKeyBuffer.toString('hex');
const address = `0x${addressBuffer.toString('hex')}`;

console.log(JSON.stringify({ privateKey, publicKey, address }, null, 2));