import { HardhatUserConfig } from 'hardhat/config'
import '@nomicfoundation/hardhat-toolbox'
import 'hardhat-contract-sizer'

const config: HardhatUserConfig = {
  solidity: '0.8.18',
}

export default config

module.exports = {
  solidity: '0.8.18',
  networks: {
    hardhat: {
      chainId: 1337,
    },
    local: {
      url: 'http://localhost:8545',
      accouts: [process.env.LOCAL_PRIVATE_KEY!],
    },
  },
  mocha: {
    timeout: 20000,
  },
}
