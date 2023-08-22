import { SignerWithAddress } from '@nomicfoundation/hardhat-ethers/signers'
import {
  AuctionDeposit,
  IMonoNFT,
  MockERC20,
  MonoNFT,
  MockERC721,
} from '../typechain-types'
import { ethers } from 'hardhat'
import { parseEther } from 'ethers'
import { expect } from 'chai'

describe('MonoNFT', () => {
  let admin: SignerWithAddress
  let admin2: SignerWithAddress
  let user1: SignerWithAddress
  let user2: SignerWithAddress
  let notUser: SignerWithAddress
  let tokenContract: MockERC20
  let auctionDepositContract: AuctionDeposit
  let monoNFTContract: MonoNFT
  let membershipNFT: MockERC721

  const defaultAdminRole =
    '0x0000000000000000000000000000000000000000000000000000000000000000'

  beforeEach(async () => {
    ;[admin, admin2, user1, user2, notUser] = await ethers.getSigners()

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

    membershipNFT = await ethers.deployContract('MockERC721', [
      'membershipNFT',
      'MSNFT',
    ])
    await membershipNFT.waitForDeployment()

    monoNFTContract = await ethers.deployContract('MonoNFT', [
      'monoNFT',
      'mono',
      await auctionDepositContract.getAddress(),
      await membershipNFT.getAddress(),
    ])
    await monoNFTContract.waitForDeployment()

    await (await membershipNFT.mint(user1.address)).wait()

    await (await membershipNFT.mint(user2.address)).wait()
  })

  describe('Membership NFT address', () => {
    let shouldMembershipNFTAddress: (address: string) => Promise<void>

    it('check membership NFT address', async () => {
      shouldMembershipNFTAddress = async (address: string) => {
        expect(await monoNFTContract.membershipNFTAddress()).to.equal(address)
      }

      shouldMembershipNFTAddress(await membershipNFT.getAddress())
    })

    it('should revert setting membership NFT address by not admin', async () => {
      shouldMembershipNFTAddress(await membershipNFT.getAddress())

      await expect(
        monoNFTContract.connect(user1).setMembershipNFTAddress(user1.address)
      ).to.be.reverted

      shouldMembershipNFTAddress(await membershipNFT.getAddress())
    })

    it('should set membership NFT address', async () => {
      shouldMembershipNFTAddress(await membershipNFT.getAddress())

      await expect(
        await monoNFTContract
          .connect(admin)
          .setMembershipNFTAddress(user1.address)
      ).not.to.be.reverted

      shouldMembershipNFTAddress(user1.address)
    })
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
    let confirmWinnerTimestamp

    beforeEach(async () => {
      const monoNFTMetadata: IMonoNFT.MonoNFTStruct = {
        donor: user1.address,
        //半年
        expiresDuration: (1000 * 60 * 60 * 24 * 365) / 2,
        uri: 'https://metadata.uri',
        status: 0,
      }
      await monoNFTContract.connect(admin).register(monoNFTMetadata)
      await monoNFTContract.connect(admin).register(monoNFTMetadata)
    })

    it('should confirmWinner without duration', async () => {
      await expect(
        await monoNFTContract
          .connect(admin)
          ['confirmWinner(address,uint256,uint256)'](
            user1.address,
            1,
            parseEther('1000')
          )
      ).to.emit(monoNFTContract, 'ConfirmWinner')

      confirmWinnerTimestamp = await ethers.provider.getBlock('latest')

      const _latestWinners = await monoNFTContract._latestWinners(1)
      expect(_latestWinners.winner).to.equal(user1.address)
      expect(_latestWinners.price).to.equal(parseEther('1000'))
      expect(_latestWinners.expires).to.equal(
        confirmWinnerTimestamp!.timestamp + (1000 * 60 * 60 * 24 * 365) / 2
      )
    })

    it('should confirmWinner with duration', async () => {
      confirmWinnerTimestamp = await ethers.provider.getBlock('latest')

      await expect(
        await monoNFTContract
          .connect(admin)
          ['confirmWinner(address,uint256,uint256,uint256)'](
            user2.address,
            2,
            parseEther('500'),
            confirmWinnerTimestamp!.timestamp + 1000 * 60 * 60 * 24 * 365
          )
      ).to.emit(monoNFTContract, 'ConfirmWinner')

      const _latestWinners = await monoNFTContract._latestWinners(2)
      expect(_latestWinners.winner).to.equal(user2.address)
      expect(_latestWinners.price).to.equal(parseEther('500'))
      expect(_latestWinners.expires).to.equal(
        confirmWinnerTimestamp!.timestamp + 1000 * 60 * 60 * 24 * 365
      )
    })
  })

  describe('Claim', () => {
    const currentTokenId: number = 1
    let monoNFTMetadata: IMonoNFT.MonoNFTStruct
    let confirmWinnerTimestamp
    beforeEach(async () => {
      monoNFTMetadata = {
        donor: user1.address,
        //半年
        expiresDuration: (1000 * 60 * 60 * 24 * 365) / 2,
        uri: 'https://metadata.uri',
        status: 0,
      }
      await monoNFTContract.connect(admin).register(monoNFTMetadata)

      await monoNFTContract
        .connect(admin)
        ['confirmWinner(address,uint256,uint256)'](
          user1.address,
          currentTokenId,
          parseEther('1000')
        )

      confirmWinnerTimestamp = await ethers.provider.getBlock('latest')
    })

    it('should revert claim by not membership NFT owner', async () => {
      await expect(
        monoNFTContract.connect(notUser).claim(currentTokenId)
      ).to.be.revertedWith(`MonoNFT: You don't have the auction member NFT`)
    })

    it('should revert claim by not winner', async () => {
      await expect(
        monoNFTContract.connect(user2).claim(currentTokenId)
      ).to.be.revertedWith(`MonoNFT: You are not the winner`)
    })

    it('should revert claim by not approved', async () => {
      await expect(
        monoNFTContract.connect(user1).claim(currentTokenId)
      ).to.be.revertedWith('ERC4907: transfer caller is not owner nor approved')
    })

    it('should claim', async () => {
      const shouldUserAndExpiresOf = async (
        tokenId: number,
        user: string,
        expires: number
      ): Promise<void> => {
        expect(await monoNFTContract.userOf(tokenId)).to.equal(user)
        expect(await monoNFTContract.userExpires(tokenId)).to.equal(expires)
      }

      // tokenId（引数１） の user（引数２） と expires（引数３） を確認
      await shouldUserAndExpiresOf(currentTokenId, ethers.ZeroAddress, 0)

      await expect(
        await monoNFTContract.connect(admin).approve(user1, currentTokenId)
      ).to.emit(monoNFTContract, 'Approval')

      await expect(await monoNFTContract.connect(user1).claim(currentTokenId))
        .to.emit(monoNFTContract, 'UpdateUser')
        .to.emit(monoNFTContract, 'Claim')

      await shouldUserAndExpiresOf(
        currentTokenId,
        user1.address,
        confirmWinnerTimestamp!.timestamp + monoNFTMetadata.expiresDuration
      )
    })
  })
})
