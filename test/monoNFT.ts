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
import { assert } from 'chai'
import { BigNumberish } from 'ethers'

describe('MonoNFT', () => {
  let admin: SignerWithAddress
  let admin2: SignerWithAddress
  let user1: SignerWithAddress
  let tokenContract: MockERC20
  let auctionDepositContract: AuctionDeposit
  let monoNFTContract: MonoNFT

  const defaultAdminRole =
    '0x0000000000000000000000000000000000000000000000000000000000000000'

  beforeEach(async () => {
    ;[admin, admin2, user1] = await ethers.getSigners()

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

  describe('AccessControl', () => {
    it('should check initial admin', async () => {
      expect(
        await monoNFTContract.hasRole(defaultAdminRole, admin.address)
      ).to.equal(true)
    })

    it('should revert setting a new admin by not admin', async () => {
      await expect(
        monoNFTContract
          .connect(user1)
          .grantRole(defaultAdminRole, admin2.address)
      ).to.be.reverted
    })

    it('should set a new admin', async () => {
      await expect(
        await monoNFTContract
          .connect(admin)
          .grantRole(defaultAdminRole, admin2.address)
      ).to.emit(monoNFTContract, 'RoleGranted')
      expect(
        await monoNFTContract.hasRole(defaultAdminRole, admin2.address)
      ).to.equal(true)
    })
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

  describe('confirmWinner', () => {
    let latestBlock

    beforeEach(async () => {
      const monoNFTMetadata: IMonoNFT.MonoNFTStruct = {
        donor: user1.address,
        //半年
        expiresDuration: (1000 * 60 * 60 * 24 * 365) / 2,
        uri: 'https://metadata.uri',
        status: 0,
      }
      await monoNFTContract.connect(admin).register(monoNFTMetadata)
      latestBlock = await ethers.provider.getBlock('latest')
    })

    it('should confirmWinner without duration', async () => {
      expect(
        await monoNFTContract
          .connect(admin)
          ['confirmWinner(address,uint256,uint256)'](
            user1.address,
            1,
            parseEther('1000')
          )
      ).to.emit(monoNFTContract, 'ConfirmWinner')

      const _latestWinners = await monoNFTContract._latestWinners(1)
      expect(_latestWinners.winner).to.equal(user1.address)
      expect(_latestWinners.price).to.equal(parseEther('1000'))
      expect(_latestWinners.expires).to.equal(
        latestBlock!.number + 1 + (1000 * 60 * 60 * 24 * 365) / 2
      )
    })

    it('should confirmWinner with duration', async () => {
      expect(
        await monoNFTContract
          .connect(admin)
          ['confirmWinner(address,uint256,uint256,uint256)'](
            user1.address,
            1,
            parseEther('500'),
            latestBlock!.timestamp + 1000 * 60 * 60 * 24 * 365
          )
      ).to.emit(monoNFTContract, 'ConfirmWinner')

      const _latestWinners = await monoNFTContract._latestWinners(1)
      expect(_latestWinners.winner).to.equal(user1.address)
      expect(_latestWinners.price).to.equal(parseEther('500'))
      expect(_latestWinners.expires).to.equal(
        latestBlock!.timestamp + 1000 * 60 * 60 * 24 * 365
      )
    })
  })

  describe('submit', function () {
    let tokenId: BigNumberish

    beforeEach(async () => {
      const monoNFTMetadata: IMonoNFT.MonoNFTStruct = {
        donor: user1.address,
        //半年
        expiresDuration: (1000 * 60 * 60 * 24 * 365) / 2,
        uri: 'https://metadata.uri',
        status: 0,
      }
      // ここで新しいNFTを登録
      await monoNFTContract.register(monoNFTMetadata)
      tokenId = await monoNFTContract.totalSupply() // 最新のtokenIdを取得
    })

    it('should update status to IN_AUCTION when tokenId exists and not in auction', async function () {
      await monoNFTContract.connect(admin).submit(tokenId)
      const nft = await monoNFTContract._monoNFTs(tokenId)
      const IN_AUCTION = 1 // MonoNFTStatus.IN_AUCTION に相当する数値
      assert.equal(Number(nft.status), IN_AUCTION)
    })

    it('should revert when tokenId does not exist', async function () {
      await expect(
        monoNFTContract.connect(admin).submit(999)
      ).to.be.revertedWith('MonoNFT: NFT does not exist')
    })

    it('should revert when token is already in auction', async function () {
      await monoNFTContract.submit(tokenId)
      await expect(monoNFTContract.submit(tokenId)).to.be.revertedWith(
        'MonoNFT: NFT is already in auction'
      )
    })
  })
})
