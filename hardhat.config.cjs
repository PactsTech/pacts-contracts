require('@nomicfoundation/hardhat-toolbox');

const LOCAL_SELLER_PRIVATE_KEY = 'ac4e81857c78cc6cafca3776913f2c9a81a8b8f41c9e614ec652aed0ed5bc77f';
const LOCAL_BUYER_PRIVATE_KEY = '4a19e027398dea6c53a237e4b5c4fdfe914628a26df3ab65335227f0560f8289';
const LOCAL_PACTS_PRIVATE_KEY = '1d7608900595dca1a1e06cc4bdc2247a2c80dfdd42b0dcdc3f83140d24145026';

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
