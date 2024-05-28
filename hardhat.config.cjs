require('@nomicfoundation/hardhat-toolbox-viem');

// NOTE: private keys that should only used in development
const SELLER_PRIVATE_KEY = '0x9c7f3fdba28b901a55a024605dbf533d7b7fd2ca5b3e9eb9ddfe7aa6bc86740b';
const REPORTER_PRIVATE_KEY = '0x678cd8bdf84ffd7fc5144d2772b2076434f6448ce9c3d7793977423f1b08e343';
const ARBITER_PRIVATE_KEY = '0x4412241fc4a32478125f83c4d13f57127e63d38e7ee9e5df1689ecf36c79958a';
const DEV_PRIVATE_KEY = '0xf59638512c52ef692d47cd79a7726a5964fb22d43238f441528572c205add3c3';

const balance = '10000000000000000000000';
const privateKeys = [
  SELLER_PRIVATE_KEY,
  REPORTER_PRIVATE_KEY,
  ARBITER_PRIVATE_KEY,
  DEV_PRIVATE_KEY
];

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: {
    version: '0.8.20',
    settings: {
      viaIR: true,
      optimizer: {
        enabled: true,
        details: { yulDetails: { optimizerSteps: 'u' } }
      }
    }
  },
  networks: {
    hardhat: {
      accounts: privateKeys.map((privateKey) => ({ privateKey, balance }))
    },
    local: {
      url: 'http://localhost:8545',
      accounts: privateKeys
    }
  }
};
