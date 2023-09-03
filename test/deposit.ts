import { ethers } from 'hardhat'
import { expect } from 'chai'
import { SignerWithAddress } from '@nomicfoundation/hardhat-ethers/signers'
import {
  AuctionDeposit,
  MockERC20,
  MonoNFT,
  MockERC1155
} from '../typechain-types'
import { formatEther, parseEther } from 'ethers'

describe('AuctionDeposit', function () {
  let admin: SignerWithAddress
  let user1: SignerWithAddress
  let treasury: SignerWithAddress
  let tokenContract: MockERC20 // This should be a mock ERC20 token for testing
  let auctionDepositContract: AuctionDeposit
  let monoNFTContract: MonoNFT
  let membershipNFT: MockERC1155

  beforeEach(async function () {
    ;[admin, user1, treasury] = await ethers.getSigners()

    // コミュニティトークンのデプロイと初期配布
    const initialSupply = parseEther('1000000')
    tokenContract = await ethers.deployContract('MockERC20', [
      'My Token',
      'MTK',
      initialSupply
    ])
    await tokenContract.waitForDeployment()
    await tokenContract
      .connect(admin)
      .transfer(user1.address, parseEther('1000000'))

    // membershipNFTのデプロイ
    membershipNFT = await ethers.deployContract('MockERC1155', [])
    await membershipNFT.waitForDeployment()

    // monoNFTのデプロイ
    monoNFTContract = await ethers.deployContract('MonoNFT', [
      'monoNFT',
      'mono',
      1,
      2,
      3
    ])
    await monoNFTContract.waitForDeployment()

    auctionDepositContract = await ethers.deployContract('AuctionDeposit', [
      await monoNFTContract.getAddress()
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
    await (await monoNFTContract.setAuctionAdminAddress(admin.address)).wait()

    // AuctionDepositの初期設定
    await (
      await auctionDepositContract.setCommunityTokenAddress(
        await tokenContract.getAddress()
      )
    ).wait()
    await (
      await auctionDepositContract.setAuctionAdminAddress(admin.address)
    ).wait()
  })

  it('should allow users to deposit tokens', async function () {
    const initialBalance = await tokenContract.balanceOf(user1.address)

    // user1が持っているトークンをAuctionDepositに払い込むためにtokenコントラクトのapprove関数で承認する
    await tokenContract
      .connect(user1)
      .approve(await auctionDepositContract.getAddress(), parseEther('2500'))
    // auctionDepositコントラクトのdeposit関数を呼び出す
    const runDeposit = await auctionDepositContract
      .connect(user1)
      .deposit(parseEther('2500'))
    await runDeposit.wait()

    const finalBalance = await tokenContract.balanceOf(user1.address)
    expect(
      Number(formatEther(initialBalance)) - Number(formatEther(finalBalance))
    ).to.equal(2500)

    // auctionDepositコントラクトに2500ちゃんと移行しているか確認
    const auctionDepositBalance = await tokenContract.balanceOf(
      await auctionDepositContract.getAddress()
    )
    expect(Number(formatEther(auctionDepositBalance))).to.equal(2500)

    // depositContractに保存されているuser1のdeposit額の確認
    const user1DepositBalance =
      await auctionDepositContract.getDepositByAddress(user1.address)
    expect(user1DepositBalance.user).to.equal(user1.address)
    expect(Number(formatEther(user1DepositBalance.amount))).to.equal(2500)
  })

  it('should not allow users to deposit more than the maximum', async function () {
    await expect(
      auctionDepositContract.connect(user1).deposit(parseEther('3000'))
    ).to.be.revertedWith('AuctionDeposit: Deposit limit exceeded')
  })
})
