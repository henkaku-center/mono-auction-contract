import { HardhatUserConfig } from 'hardhat/config';
import '@nomiclabs/hardhat-ethers'; // ethersプラグインをインポート
import "@nomiclabs/hardhat-waffle";

const config: HardhatUserConfig = {
  solidity: '0.8.18',
  networks: {
    hardhat: {
      chainId: 1337,
    },
  },
  mocha: {
    timeout: 20000,
  },
};

export default config;
