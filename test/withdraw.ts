import { ethers } from 'hardhat'
import { expect, use } from 'chai'
import { SignerWithAddress } from '@nomicfoundation/hardhat-ethers/signers'
import { AuctionDeposit, MockERC20 } from '../typechain-types'
import { MaliciousAttacker } from '../../contracts/test/MaliciousAttacker'
import { formatEther, parseEther } from 'ethers'

describe('AuctionDeposit', function () {
  let user1: SignerWithAddress
  let tokenContract: MockERC20
  let auctionDepositContract: AuctionDeposit
  let attackerContract: MaliciousAttacker

  beforeEach(async function () {
    ;[user1] = await ethers.getSigners()

    const initialSupply = parseEther('1000000')
    
    const MockERC20Factory = await ethers.getContractFactory('MockERC20')
    tokenContract = await MockERC20Factory.deploy(
      'My Token',
      'MTK',
      initialSupply
    )
    await tokenContract.waitForDeployment() // 確実にデプロイが完了していることを待ちます

    const tokenAddress: string = tokenContract.address // ← ここで明示的にアドレスを取得します。

    const AuctionDepositFactory = await ethers.getContractFactory('AuctionDeposit')
    auctionDepositContract = await AuctionDepositFactory.deploy(tokenAddress)
    await auctionDepositContract.waitForDeployment() // 確実にデプロイが完了していることを待ちます

    const MaliciousAttackerFactory = await ethers.getContractFactory('MaliciousAttacker')
    attackerContract = await MaliciousAttackerFactory.deploy(auctionDepositContract.address)  // ← AuctionDepositコントラクトのアドレスを渡します。
    await attackerContract.waitForDeployment() // 確実にデプロイが完了していることを待ちます
    
    // Setup: Allow and deposit 2500 tokens for user1
    await tokenContract.connect(user1).approve(
      auctionDepositContract.address,
      parseEther('2500')
    )
    const runDeposit = await auctionDepositContract.connect(user1).deposit(
      parseEther('2500')
    )
    await runDeposit.wait()

    // Setup: Allow the attacker to use user1's tokens
    await tokenContract.connect(user1).approve(
      attackerContract.address,
      parseEther('2500')
    )
  })

  it('should be protected against reentrancy attacks', async function () {
    await tokenContract.connect(user1).transfer(attackerContract.address, parseEther('1000'))
    await expect(attackerContract.attack(parseEther('500'))).to.be.reverted

    // Assert that the attacker wasn't able to steal funds
    const stolenFunds = await attackerContract.stolenFunds()
    expect(Number(formatEther(stolenFunds))).to.equal(0)
  })
})
