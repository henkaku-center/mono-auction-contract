import { ethers, network, upgrades } from 'hardhat'
import {
  AuctionDeposit,
  MockERC20,
  MockERC1155,
  MonoNFT,
} from '../typechain-types'
import { parseEther } from 'ethers'
import { LocalWalletAddresses } from './helper/address'

async function main() {
  let tokenContract: MockERC20 // This should be a mock ERC20 token for testing
  let auctionDepositContract: AuctionDeposit
  let monoNFTContract: MonoNFT
  let membershipNFT: MockERC1155

  const { admin, communityTreasury } = LocalWalletAddresses()

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
  await (await monoNFTContract.setAuctionAdminAddress(admin.address)).wait()
  await (
    await monoNFTContract.setCommunityTreasuryAddress(communityTreasury.address)
  ).wait()

  // AuctionDepositの初期設定
  await (
    await auctionDepositContract.setCommunityTokenAddress(
      await tokenContract.getAddress()
    )
  ).wait()
  await (
    await auctionDepositContract.setAuctionAdminAddress(admin.address)
  ).wait()

  console.log('MockERC20:', await tokenContract.getAddress())
  console.log('MockERC1155:', await membershipNFT.getAddress())
  console.log('MonoNFT:', await monoNFTContract.getAddress())
  console.log('AuctionDeposit:', await auctionDepositContract.getAddress())
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
