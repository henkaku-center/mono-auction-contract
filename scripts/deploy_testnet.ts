import { ethers, upgrades } from 'hardhat'
import { AuctionDeposit, MonoNFT } from '../typechain-types'

async function main() {
  const communityTreasuryAddress = '0x807C69F16456F92ab2bFc9De8f14AF31051f9678'
  const auctionAdminAddress = '0x807C69F16456F92ab2bFc9De8f14AF31051f9678'
  const communityTokenAddress = '0xF3D5ED9d90282c6BAB684113073D9B97ea1afcc4'
  const ticketNFTAddress = '0x9Fd60f4AB9b09E46B26B9B5270da57E77450B66b'

  let auctionDepositContract: AuctionDeposit
  let monoNFTContract: MonoNFT

  const MonoNFTFactory = await ethers.getContractFactory('MonoNFT')
  monoNFTContract = (await upgrades.deployProxy(
    MonoNFTFactory,
    ['monoNFT', 'MONO'],
    {
      initializer: 'initialize',
    }
  )) as any
  await monoNFTContract.waitForDeployment()

  const AuctionDepositFactory = await ethers.getContractFactory(
    'AuctionDeposit'
  )
  auctionDepositContract = (await upgrades.deployProxy(
    AuctionDepositFactory,
    [await monoNFTContract.getAddress()],
    {
      initializer: 'initialize',
    }
  )) as any
  await auctionDepositContract.waitForDeployment()

  // MonoNFTの初期設定
  await (await monoNFTContract.setMembershipNFTAddress(ticketNFTAddress)).wait()
  await (
    await monoNFTContract.setAuctionDepositAddress(
      await auctionDepositContract.getAddress()
    )
  ).wait()
  await (
    await monoNFTContract.setAuctionAdminAddress(auctionAdminAddress)
  ).wait()
  await (
    await monoNFTContract.setCommunityTreasuryAddress(communityTreasuryAddress)
  ).wait()

  // AuctionDepositの初期設定
  await (
    await auctionDepositContract.setCommunityTokenAddress(communityTokenAddress)
  ).wait()
  await (
    await auctionDepositContract.setAuctionAdminAddress(auctionAdminAddress)
  ).wait()

  console.log('MonoNFT deployed to:', await monoNFTContract.getAddress())
  console.log('AuctionDeposit deployed to:', await monoNFTContract.getAddress())
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
