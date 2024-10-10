require("@nomicfoundation/hardhat-toolbox");
require("@nomicfoundation/hardhat-ethers");
require('dotenv').config()

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: "0.8.27",
  networks: {
    hardhat: {
      accounts: {
        mnemonic: process.env.SEED_PHRASE,
      },
      chainId: 31337,
    },
    bsc_testnet: {
      url: process.env.INFURA_BSC_TESTNET_APIKEY,
      accounts: { 
        mnemonic: process.env.SEED_PHRASE, 
      },
    },
    amoy: {
      url: process.env.INFURA_AMOY_APIKEY,
      accounts: { 
        mnemonic: process.env.SEED_PHRASE, 
      },
    },
    holesky: {
      url: process.env.INFURA_HOLESKY_APIKEY,
      accounts: { 
        mnemonic: process.env.SEED_PHRASE, 
      },
    },
  },
};
