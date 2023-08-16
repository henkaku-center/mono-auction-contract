import { SignerWithAddress } from '@nomicfoundation/hardhat-ethers/signers'
import {
  AuctionDeposit,
  IMonoNFT,
  MockERC20,
  MonoNFT,
} from '../typechain-types'
import { ethers } from 'hardhat'
import { parseEther } from 'ethers'
import { expect } from 'chai'

describe('MonoNFT', () => {
  let admin: SignerWithAddress
  let user1: SignerWithAddress
  let tokenContract: MockERC20
  let auctionDepositContract: AuctionDeposit
  let monoNFTContract: MonoNFT

  beforeEach(async () => {
    ;[admin, user1] = await ethers.getSigners()

    const initialSupply = parseEther('1000000')
    tokenContract = await ethers.deployContract('MockERC20', [
      'My Token',
      'MTK',
      initialSupply,
    ])
    await tokenContract.waitForDeployment()

    auctionDepositContract = await ethers.deployContract('AuctionDeposit', [
      await tokenContract.getAddress(),
    ])
    await auctionDepositContract.waitForDeployment()

    monoNFTContract = await ethers.deployContract('MonoNFT', [
      'monoNFT',
      'mono',
      await auctionDepositContract.getAddress(),
    ])
    await monoNFTContract.waitForDeployment()
  })

  it('should register monoNFT', async () => {
    const monoNFTMetadata: IMonoNFT.MonoNFTStruct = {
      donor: user1.address,
      //半年
      expiresDuration: (1000 * 60 * 60 * 24 * 365) / 2,
      uri: 'https://metadata.uri',
      status: 0,
    }

    expect(
      await monoNFTContract.connect(admin).register(monoNFTMetadata)
    ).to.emit(monoNFTContract, 'RegisterMonoNFT')

    const tokenURI = await monoNFTContract.tokenURI(1)
    expect(tokenURI).to.equal(monoNFTMetadata.uri)

    const monoNFTs = await monoNFTContract.getNFTs()
    expect(monoNFTs.length).to.equal(1)
    expect(monoNFTs[0].donor).to.equal(monoNFTMetadata.donor)
    expect(monoNFTs[0].expiresDuration).to.equal(
      monoNFTMetadata.expiresDuration
    )
    expect(monoNFTs[0].uri).to.equal(monoNFTMetadata.uri)
    expect(monoNFTs[0].status).to.equal(monoNFTMetadata.status)
  })
})
