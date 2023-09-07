import { ethers, upgrades } from 'hardhat'

async function main() {
  const auctionDepositContractAddress =
    '0x049092A945d0F7938CDC588F01DD648194cF455F'
  const monoNFTContractAddress = '0x6095439aA75171Fd2847b6cD40Bb60f35f0a9639'

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
