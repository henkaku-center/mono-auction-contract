import { ethers, upgrades } from 'hardhat'

async function main() {
  const auctionDepositContractAddress =
    '0xEE5218a2DB884D7fF6579c1cf1AcDEC98e5ECc7a'
  const monoNFTContractAddress = '0x4a6A377be74DA47dfa2Cc854dA4A8E294ea342F9'

  // const AuctionDepositFactory = await ethers.getContractFactory(
  //   'AuctionDeposit'
  // )
  // const auctionDepositContract = await upgrades.upgradeProxy(
  //   auctionDepositContractAddress,
  //   AuctionDepositFactory
  // )
  // await auctionDepositContract.waitForDeployment()

  const MonoNFTFactory = await ethers.getContractFactory('MonoNFT')
  const monoNFTContract = await upgrades.upgradeProxy(
    monoNFTContractAddress,
    MonoNFTFactory
  )
  await monoNFTContract.waitForDeployment()
}

main().catch((error) => {
  console.error(error)
})
