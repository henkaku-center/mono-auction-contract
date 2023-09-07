import { ethers, upgrades } from 'hardhat'
import {
  AuctionDeposit,
  MockERC1155,
  MockERC20,
  MonoNFT,
} from '../typechain-types'
import { parseEther } from 'ethers'

async function main() {
  const communityTreasuryAddress = '0x15d34AAf54267DB7D7c367839AAf71A00a2C6A65'
  const auctionAdminAddress = '0x15d34AAf54267DB7D7c367839AAf71A00a2C6A65'

  let tokenContract: MockERC20
  let membershipNFT: MockERC1155
  let auctionDepositContract: AuctionDeposit
  let monoNFTContract: MonoNFT

  tokenContract = await ethers.deployContract('MockERC20', [
    'My Token',
    'MTK',
    parseEther('1000000'),
  ])
  await tokenContract.waitForDeployment()

  membershipNFT = await ethers.deployContract('MockERC1155')
  await membershipNFT.waitForDeployment()

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
  await (
    await monoNFTContract.setMembershipNFTAddress(
      await membershipNFT.getAddress()
    )
  ).wait()
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
    await auctionDepositContract.setCommunityTokenAddress(
      await tokenContract.getAddress()
    )
  ).wait()
  await (
    await auctionDepositContract.setAuctionAdminAddress(auctionAdminAddress)
  ).wait()

  console.log('MockERC20:', await tokenContract.getAddress())
  console.log('MockERC1155:', await membershipNFT.getAddress())
  console.log('MonoNFT:', await monoNFTContract.getAddress())
  console.log('AuctionDeposit:', await auctionDepositContract.getAddress())
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
