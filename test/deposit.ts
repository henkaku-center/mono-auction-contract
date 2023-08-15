import { ethers } from 'hardhat'
import { loadFixture } from '@nomicfoundation/hardhat-toolbox/network-helpers'
import { Contract, Signer } from 'ethers'
import { expect } from 'chai'

describe('AuctionDeposit', function () {
  let accounts: Signer[]
  let auction: Contract
  let token: Contract // This should be a mock ERC20 token for testing

  async function deployTokenFixture() {
    const [owner, otherAccount] = await ethers.getSigners()
    const initialSupply = ethers.parseEther('1000000')
    const token = await ethers.deployContract('MockERC20', [
      'My Token',
      'MTK',
      initialSupply
    ])
    await token.waitForDeployment()
    console.log('Token Address:', token.target)

    const auction = await ethers.deployContract('AuctionDeposit', [
      token.target
    ])
    await auction.waitForDeployment()

    return { token, auction, owner, otherAccount }
  }

  beforeEach(async function () {})

  xit('should allow users to deposit tokens', async function () {
    const { token, auction, owner, otherAccount } = await loadFixture(
      deployTokenFixture
    )

    const initialBalance = await token.balanceOf(await owner.getAddress())

    await token.transfer(auction.target, ethers.parseEther('2500'))
    await auction.deposit(ethers.parseEther('2500'))

    const finalBalance = await token.balanceOf(await owner.getAddress())
    expect(finalBalance).to.equal(initialBalance.sub(ethers.parseEther('2500')))
  })

  it('should not allow users to deposit more than the maximum', async function () {
    const { token, auction, owner, otherAccount } = await loadFixture(
      deployTokenFixture
    )

    await expect(auction.deposit(ethers.parseEther('3000'))).to.be.revertedWith(
      'Transferred amount does not match requested amount'
    )
  })
})
