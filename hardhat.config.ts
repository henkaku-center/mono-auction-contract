import * as dotenv from 'dotenv'
import { HardhatUserConfig } from 'hardhat/config'
import '@nomicfoundation/hardhat-toolbox'
import 'hardhat-contract-sizer'
import '@openzeppelin/hardhat-upgrades'

dotenv.config()

const config: HardhatUserConfig = {
  solidity: '0.8.18',
}

export default config

module.exports = {
  solidity: {
    version: '0.8.18',
    settings: {
      optimizer: {
        enabled: true,
        runs: 1000,
      },
    },
  },
  networks: {
    local: {
      url: 'http://localhost:8545',
      accouts: [process.env.LOCAL_PRIVATE_KEY!],
    },
    mumbai: {
      url: process.env.MUMBAI_ALCHEMY_KEY!,
      accounts: [process.env.TEST_PRIVATE_KEY!],
    },
    polygon: {
      url: process.env.POLYGON_ALCHEMY_KEY!,
      accounts: [process.env.MAIN_PRIVATE_KEY!],
      gasPrice: 180000000000,
    },
  },
  etherscan: {
    apiKey: {
      polygonMumbai: process.env.POLYGONSCAN_API_KEY!,
      polygon: process.env.POLYGONSCAN_API_KEY!,
    },
  },
  mocha: {
    timeout: 20000,
  },
}
