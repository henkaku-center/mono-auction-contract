import { ethers, upgrades } from 'hardhat'
import { expect, use } from 'chai'
import { SignerWithAddress } from '@nomicfoundation/hardhat-ethers/signers'
import {
  AuctionDeposit,
  MockERC20,
  MaliciousAttacker,
  MonoNFT,
  MockERC1155,
} from '../typechain-types'
import { formatEther, parseEther } from 'ethers'

describe('AuctionWithdraw', function () {
  let admin: SignerWithAddress
  let user1: SignerWithAddress
  let tokenContract: MockERC20
  let auctionDepositContract: AuctionDeposit
  let attackerContract: MaliciousAttacker
  let treasury: SignerWithAddress
  let monoNFTContract: MonoNFT
  let membershipNFT: MockERC1155

  beforeEach(async function () {
    ;[admin, user1, treasury] = await ethers.getSigners()

    // コミュニティトークンのデプロイと初期配布
    const initialSupply = parseEther('1000000')
    tokenContract = await ethers.deployContract('MockERC20', [
      'My Token',
      'MTK',
      initialSupply,
    ])
    await tokenContract.waitForDeployment()

    await (
      await tokenContract
        .connect(admin)
        .transfer(user1.address, parseEther('1000000'))
    ).wait()

    // メンバーシップNFTのデプロイと初期配布
    membershipNFT = await ethers.deployContract('MockERC1155', [])
    await membershipNFT.waitForDeployment()
    await (await membershipNFT.mint(user1.address, 1)).wait()

    // monoNFTのデプロイ
    const MonoNFTFactory = await ethers.getContractFactory('MonoNFT')
    monoNFTContract = (await upgrades.deployProxy(
      MonoNFTFactory,
      ['monoNFT', 'mono'],
      {
        initializer: 'initialize',
      }
    )) as any
    await monoNFTContract.waitForDeployment()

    // auctionDepositのデプロイ
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
    await (await monoNFTContract.setBasicMembershipTokenId(1)).wait()
    await (await monoNFTContract.setSilverMembershipTokenId(2)).wait()
    await (await monoNFTContract.setGoldMembershipTokenId(3)).wait()

    // AuctionDepositの初期設定
    await (
      await auctionDepositContract.setCommunityTokenAddress(
        await tokenContract.getAddress()
      )
    ).wait()
    await (
      await auctionDepositContract.setAuctionAdminAddress(admin.address)
    ).wait()

    const MaliciousAttackerFactory = await ethers.getContractFactory(
      'MaliciousAttacker'
    )
    attackerContract = await MaliciousAttackerFactory.deploy(
      auctionDepositContract.getAddress()
    ) // ← AuctionDepositコントラクトのアドレスを渡します。
    await attackerContract.waitForDeployment() // 確実にデプロイが完了していることを待ちます

    // Setup: Allow and deposit 2500 tokens for user1
    await tokenContract
      .connect(user1)
      .approve(auctionDepositContract.getAddress(), parseEther('2500'))
    const runDeposit = await auctionDepositContract
      .connect(user1)
      .deposit(parseEther('2500'))
    await runDeposit.wait()

    // Setup: Allow the attacker to use user1's tokens
    await tokenContract
      .connect(user1)
      .approve(attackerContract.getAddress(), parseEther('2500'))
  })

  it('should be protected against reentrancy attacks', async function () {
    await tokenContract
      .connect(user1)
      .transfer(attackerContract.getAddress(), parseEther('1000'))
    await expect(attackerContract.attack(parseEther('500'))).to.be.reverted

    // Assert that the attacker wasn't able to steal funds
    const stolenFunds = await attackerContract.stolenFunds()
    expect(Number(formatEther(stolenFunds))).to.equal(0)
  })

  it('should revert withdraw when locked', async function () {
    await expect(await auctionDepositContract.connect(admin).lock()).not.to.be
      .reverted
    expect(await auctionDepositContract.locked()).to.be.true
    await expect(
      auctionDepositContract.connect(user1).withdraw(parseEther('1000'))
    ).to.be.revertedWith('AuctionDeposit: Locked')
  })

  it('should withdraw', async function () {
    const initialBalanceOfUser1 = await tokenContract.balanceOf(user1.address)
    const initialBalanceOfAuctionDeposit = await tokenContract.balanceOf(
      auctionDepositContract.getAddress()
    )

    await auctionDepositContract.connect(user1).withdraw(parseEther('1000'))

    const finalBalanceOfUser1 = await tokenContract.balanceOf(user1.address)
    const finalBalanceOfAuctionDeposit = await tokenContract.balanceOf(
      auctionDepositContract.getAddress()
    )

    expect(finalBalanceOfUser1 - initialBalanceOfUser1).to.equal(
      parseEther('1000')
    )
    expect(
      initialBalanceOfAuctionDeposit - finalBalanceOfAuctionDeposit
    ).to.equal(parseEther('1000'))
  })
})
