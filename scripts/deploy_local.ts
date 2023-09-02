import { SignerWithAddress } from '@nomicfoundation/hardhat-ethers/signers'
import { ethers } from 'hardhat'
import {
  AuctionDeposit,
  MockERC20,
  MockERC721,
  MonoNFT,
} from '../typechain-types'
import { parseEther } from 'ethers'

async function main() {
  const treasuryAddr = '0x70997970C51812dc3A010C7d01b50e0d17dc79C8'
  let treasury: SignerWithAddress
  let tokenContract: MockERC20 // This should be a mock ERC20 token for testing
  let auctionDepositContract: AuctionDeposit
  let monoNFTContract: MonoNFT
  let membershipNFT: MockERC721

  tokenContract = await ethers.deployContract('MockERC20', [
    'My Token',
    'MTK',
    parseEther('1000000'),
  ])
  await tokenContract.waitForDeployment()

  membershipNFT = await ethers.deployContract('MockERC721', [
    'membershipNFT',
    'MSNFT',
  ])
  await membershipNFT.waitForDeployment()

  monoNFTContract = await ethers.deployContract('MonoNFT', ['monoNFT', 'mono'])

  auctionDepositContract = await ethers.deployContract('AuctionDeposit', [
    await monoNFTContract.getAddress(),
  ])
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

  // AuctionDepositの初期設定
  await (
    await auctionDepositContract.setCommunityTokenAddress(
      await tokenContract.getAddress()
    )
  ).wait()
  await (await auctionDepositContract.setTreasuryAddress(treasuryAddr)).wait()

  console.log('MockERC20:', await tokenContract.getAddress())
  console.log('MockERC721:', await membershipNFT.getAddress())
  console.log('MonoNFT:', await monoNFTContract.getAddress())
  console.log('AuctionDeposit:', await auctionDepositContract.getAddress())
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
