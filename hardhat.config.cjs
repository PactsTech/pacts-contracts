require('@nomicfoundation/hardhat-toolbox');

const LOCAL_PRIVATE_KEY = '2e0834786285daccd064ca17f1654f67b4aef298acbb82cef9ec422fb4975622';

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: '0.8.20',
  networks: {
    local: {
      url: 'http://localhost:8545',
      accounts: [LOCAL_PRIVATE_KEY]
    }
  }
};
