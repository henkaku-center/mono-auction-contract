import { ethers, upgrades } from 'hardhat'
import { AuctionDeposit, MonoNFT } from '../typechain-types'

async function main() {
  const communityTreasuryAddress = '0x1C9D58eBd2A9F4952C2A4a8f9906FeF133056a33'
  const auctionAdminAddress = '0x026cB61dD0230b12C2E1221a612e45b452B4011B'
  const communityTokenAddress = '0x0cc91a5FFC2E9370eC565Ab42ECE33bbC08C11a2'
  const ticketNFTAddress = '0xbE914D66aF1D6B7C46e1dfB641E4adCb6205cFc2'

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
  console.log(
    'AuctionDeposit deployed to:',
    await auctionDepositContract.getAddress()
  )
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
