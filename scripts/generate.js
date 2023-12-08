import pkg from 'ethereumjs-wallet';

const Wallet = pkg.default;

// Generate a new random private key
const buffer = Buffer.from('2e0834786285daccd064ca17f1654f67b4aef298acbb82cef9ec422fb4975622', 'hex');
const wallet = Wallet.fromPrivateKey(buffer);
const privateKeyBuffer = wallet.getPrivateKey();
const publicKeyBuffer = wallet.getPublicKey();

// Get the corresponding Ethereum address
const addressBuffer = wallet.getAddress();

// Convert the buffers to hex strings
const privateKeyHex = privateKeyBuffer.toString('hex');
const publicKeyHex = publicKeyBuffer.toString('hex');
const addressHex = addressBuffer.toString('hex');

// Add '0x' prefix to the address
const addressWithPrefix = '0x' + addressHex;

console.log('Private Key: ', privateKeyHex);
console.log('Public Key: ', publicKeyHex);
console.log('Address: ', addressWithPrefix);