require('@nomicfoundation/hardhat-toolbox');

const LOCAL_SELLER_PRIVATE_KEY = '0x9c7f3fdba28b901a55a024605dbf533d7b7fd2ca5b3e9eb9ddfe7aa6bc86740b';
const LOCAL_BUYER_PRIVATE_KEY = '0x4412241fc4a32478125f83c4d13f57127e63d38e7ee9e5df1689ecf36c79958a';
const LOCAL_PACTS_PRIVATE_KEY = '0x678cd8bdf84ffd7fc5144d2772b2076434f6448ce9c3d7793977423f1b08e343';

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: '0.8.20',
  networks: {
    local: {
      url: 'http://localhost:8545',
      accounts: [LOCAL_SELLER_PRIVATE_KEY, LOCAL_BUYER_PRIVATE_KEY, LOCAL_PACTS_PRIVATE_KEY]
    }
  }
};
