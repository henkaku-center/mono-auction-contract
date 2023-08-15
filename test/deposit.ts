import { ethers } from 'hardhat'
import { expect, use } from 'chai'
import { SignerWithAddress } from '@nomicfoundation/hardhat-ethers/signers'
import { AuctionDeposit, MockERC20 } from '../typechain-types'
import { formatEther, parseEther } from 'ethers'

describe('AuctionDeposit', function () {
  let user1: SignerWithAddress
  let tokenContract: MockERC20 // This should be a mock ERC20 token for testing
  let auctionDepositContract: AuctionDeposit

  beforeEach(async function () {
    ;[user1] = await ethers.getSigners()

    const initialSupply = parseEther('1000000')
    tokenContract = await ethers.deployContract('MockERC20', [
      'My Token',
      'MTK',
      initialSupply,
    ])
    await tokenContract.waitForDeployment()

    const tokenAddress: string = await tokenContract.getAddress()

    auctionDepositContract = await ethers.deployContract('AuctionDeposit', [
      tokenAddress,
    ])
    await auctionDepositContract.waitForDeployment()
  })

  it('should allow users to deposit tokens', async function () {
    const initialBalance = await tokenContract.balanceOf(user1.address)

    // user1が持っているトークンをAuctionDepositに払い込むためにtokenコントラクトのapprove関数で承認する
    await tokenContract.approve(
      await auctionDepositContract.getAddress(),
      parseEther('2500')
    )
    // auctionDepositコントラクトのdeposit関数を呼び出す
    const runDeposit = await auctionDepositContract.deposit(parseEther('2500'))
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
      auctionDepositContract.deposit(parseEther('3000'))
    ).to.be.revertedWith('AuctionDeposit: Deposit limit exceeded')
  })
})
