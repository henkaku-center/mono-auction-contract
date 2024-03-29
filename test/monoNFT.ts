import { SignerWithAddress } from '@nomicfoundation/hardhat-ethers/signers'
import {
  AuctionDeposit,
  IMonoNFT,
  MockERC20,
  MonoNFT,
  MockERC1155,
} from '../typechain-types'
import { ethers, upgrades } from 'hardhat'
import { parseEther } from 'ethers'
import { expect } from 'chai'
import { assert } from 'chai'
import { BigNumberish } from 'ethers'

describe('MonoNFT', () => {
  let admin: SignerWithAddress
  let admin2: SignerWithAddress
  let user1: SignerWithAddress
  let user2: SignerWithAddress
  let notUser: SignerWithAddress
  let treasury: SignerWithAddress
  let tokenContract: MockERC20
  let auctionDepositContract: AuctionDeposit
  let monoNFTContract: MonoNFT
  let membershipNFT: MockERC1155

  const defaultAdminRole = ethers.ZeroHash

  beforeEach(async () => {
    ;[admin, admin2, user1, user2, notUser, treasury] =
      await ethers.getSigners()

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
        .transfer(user1.address, parseEther('10000'))
    ).wait()

    await (
      await tokenContract
        .connect(admin)
        .transfer(user2.address, parseEther('10000'))
    ).wait()

    // メンバーシップNFTのデプロイと初期配布
    membershipNFT = await ethers.deployContract('MockERC1155', [])
    await membershipNFT.waitForDeployment()
    await (await membershipNFT.mint(user1.address, 1)).wait()
    await (await membershipNFT.mint(user2.address, 1)).wait()

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
    await (
      await monoNFTContract.setCommunityTreasuryAddress(treasury.address)
    ).wait()
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
    const monoNFTMetadata = {
      donor: user1.address,
      //半年
      expiresDuration: (1000 * 60 * 60 * 24 * 365) / 2,
      uri: 'https://metadata.uri',
      status: 0,
      sharesOfCommunityToken: [
        {
          shareHolder: user1.address,
          shareRatio: 100,
        },
      ],
    }

    expect(
      await monoNFTContract
        .connect(admin)
        .register(
          monoNFTMetadata.donor,
          monoNFTMetadata.expiresDuration,
          monoNFTMetadata.uri,
          monoNFTMetadata.sharesOfCommunityToken,
          admin.address
        )
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

  it('should revert if shares ratio is not equal to 100%', async () => {
    const sharesOfCommunityToken = [
      {
        shareHolder: user1.address,
        shareRatio: 50,
      },
      {
        shareHolder: user2.address,
        shareRatio: 10,
      },
    ]
    const monoNFTMetadata = {
      donor: user1.address,
      //半年
      expiresDuration: (1000 * 60 * 60 * 24 * 365) / 2,
      uri: 'https://metadata.uri',
      status: 0,
      sharesOfCommunityToken,
    }

    await expect(
      monoNFTContract
        .connect(admin)
        .register(
          monoNFTMetadata.donor,
          monoNFTMetadata.expiresDuration,
          monoNFTMetadata.uri,
          monoNFTMetadata.sharesOfCommunityToken,
          admin.address
        )
    ).to.be.revertedWith(
      'MonoNFT: The total ratio of shares of community token should be 100'
    )

    await expect(
      monoNFTContract
        .connect(admin)
        .changeSharesOfCommunityToken(1, sharesOfCommunityToken)
    ).to.be.revertedWith(
      'MonoNFT: The total ratio of shares of community token should be 100'
    )
  })

  describe('Update MonoNFT status', async () => {
    let registerMonoNFT: any
    it('should register MonoNFT for tests', async () => {
      registerMonoNFT = async () => {
        const monoNFTMetadata = {
          donor: user1.address,
          //半年
          expiresDuration: (1000 * 60 * 60 * 24 * 365) / 2,
          uri: 'https://metadata.uri',
          status: 0,
          sharesOfCommunityToken: [
            {
              shareHolder: user1.address,
              shareRatio: 100,
            },
          ],
        }
        await monoNFTContract
          .connect(admin)
          .register(
            monoNFTMetadata.donor,
            monoNFTMetadata.expiresDuration,
            monoNFTMetadata.uri,
            monoNFTMetadata.sharesOfCommunityToken,
            admin.address
          )
      }

      await registerMonoNFT()

      const monoNFTs = await monoNFTContract.getNFTs()

      expect(monoNFTs.length).to.equal(1)
      expect(monoNFTs[0].status).to.equal(0)
      expect(monoNFTs[0].donor).to.equal(user1.address)
      expect(monoNFTs[0].expiresDuration).to.equal(
        (1000 * 60 * 60 * 24 * 365) / 2
      )
      expect(monoNFTs[0].uri).to.equal('https://metadata.uri')
      expect(monoNFTs[0].status).to.equal(0)
    })

    it('should revert updateMonoNFTStatus by not admin', async () => {
      await registerMonoNFT()

      await expect(monoNFTContract.connect(user1).updateMonoNFTStatus(1, 1)).to
        .be.reverted
    })

    it('should updateMonoNFTStatus', async () => {
      await registerMonoNFT()

      let monoNFTs = await monoNFTContract.getNFTs()

      expect(monoNFTs[0].status).to.equal(0)
      await (
        await monoNFTContract.connect(admin).updateMonoNFTStatus(1, 1)
      ).wait()

      monoNFTs = await monoNFTContract.getNFTs()

      expect(monoNFTs[0].status).to.equal(1)
    })
  })

  describe('confirmWinner', () => {
    let confirmWinnerTimestamp
    let updateStatusToInAuction: (tokenId: number) => Promise<void>

    beforeEach(async () => {
      const monoNFTMetadata = {
        donor: user1.address,
        //半年
        expiresDuration: (1000 * 60 * 60 * 24 * 365) / 2,
        uri: 'https://metadata.uri',
        status: 0,
        sharesOfCommunityToken: [
          {
            shareHolder: user1.address,
            shareRatio: 100,
          },
        ],
      }

      const registerMonoNFT = async () => {
        await monoNFTContract
          .connect(admin)
          .register(
            monoNFTMetadata.donor,
            monoNFTMetadata.expiresDuration,
            monoNFTMetadata.uri,
            monoNFTMetadata.sharesOfCommunityToken,
            admin.address
          )
      }

      ;[...Array(6)].forEach(async () => await registerMonoNFT())

      updateStatusToInAuction = async (tokenId: number) => {
        await monoNFTContract.connect(admin).updateMonoNFTStatus(tokenId, 1)
      }
    })

    it('should revert confirmWinner by not in auction', async () => {
      await expect(
        monoNFTContract
          .connect(admin)
          .confirmWinner(user1.address, 1, parseEther('1000'))
      ).to.be.revertedWith('MonoNFT: NFT is not in auction')
    })

    it('should confirmWinner without duration', async () => {
      await updateStatusToInAuction(1)

      await expect(
        await monoNFTContract
          .connect(admin)
          .confirmWinner(user1.address, 1, parseEther('1000'))
      ).to.emit(monoNFTContract, 'ConfirmWinner')

      confirmWinnerTimestamp = await ethers.provider.getBlock('latest')

      const _latestWinners = await monoNFTContract._latestWinner(1)
      expect(_latestWinners.winner).to.equal(user1.address)
      expect(_latestWinners.price).to.equal(parseEther('1000'))
      expect(_latestWinners.expires).to.equal(
        confirmWinnerTimestamp!.timestamp + (1000 * 60 * 60 * 24 * 365) / 2
      )
    })

    it('should revert confirmWinner by Insufficient membership', async () => {
      await updateStatusToInAuction(1)

      expect(await monoNFTContract.confirmedMonosOf(user1.address)).to.equal(0)
      expect(await monoNFTContract.maxConfirmedMonosOf(user1.address)).to.equal(
        1
      )

      await expect(
        await monoNFTContract
          .connect(admin)
          .confirmWinner(user1.address, 1, parseEther('1000'))
      ).to.emit(monoNFTContract, 'ConfirmWinner')

      expect(await monoNFTContract.confirmedMonosOf(user1.address)).to.equal(1)
      expect(await monoNFTContract.maxConfirmedMonosOf(user1.address)).to.equal(
        1
      )

      await expect(
        monoNFTContract
          .connect(admin)
          .confirmWinner(user1.address, 2, parseEther('1000'))
      ).to.be.revertedWith('MonoNFT: Insufficient membership')
    })

    it('should confirm second monoNFT', async () => {
      await updateStatusToInAuction(1)
      await updateStatusToInAuction(2)

      expect(await monoNFTContract.confirmedMonosOf(user1.address)).to.equal(0)
      expect(await monoNFTContract.maxConfirmedMonosOf(user1.address)).to.equal(
        1
      )

      await expect(
        await monoNFTContract
          .connect(admin)
          .confirmWinner(user1.address, 1, parseEther('1000'))
      ).to.emit(monoNFTContract, 'ConfirmWinner')

      await expect(await membershipNFT.mint(user1.address, 2)).not.to.be
        .reverted

      expect(await monoNFTContract.confirmedMonosOf(user1.address)).to.equal(1)
      expect(await monoNFTContract.maxConfirmedMonosOf(user1.address)).to.equal(
        5
      )

      await expect(
        await monoNFTContract
          .connect(admin)
          .confirmWinner(user1.address, 2, parseEther('1000'))
      ).to.emit(monoNFTContract, 'ConfirmWinner')
    })

    it('should revert confirming 6th MonoNFT', async () => {
      ;[...Array(6)].forEach(
        async (_, i) => await updateStatusToInAuction(i + 1)
      )

      await expect(await membershipNFT.mint(user1.address, 2)).not.to.be
        .reverted

      expect(await monoNFTContract.confirmedMonosOf(user1.address)).to.equal(0)
      expect(await monoNFTContract.maxConfirmedMonosOf(user1.address)).to.equal(
        5
      )

      await expect(
        await monoNFTContract
          .connect(admin)
          .confirmWinner(user1.address, 1, parseEther('1'))
      ).to.emit(monoNFTContract, 'ConfirmWinner')

      await expect(
        await monoNFTContract
          .connect(admin)
          .confirmWinner(user1.address, 2, parseEther('1'))
      ).to.emit(monoNFTContract, 'ConfirmWinner')

      await expect(
        await monoNFTContract
          .connect(admin)
          .confirmWinner(user1.address, 3, parseEther('1'))
      ).to.emit(monoNFTContract, 'ConfirmWinner')

      await expect(
        await monoNFTContract
          .connect(admin)
          .confirmWinner(user1.address, 4, parseEther('1'))
      ).to.emit(monoNFTContract, 'ConfirmWinner')

      await expect(
        await monoNFTContract
          .connect(admin)
          .confirmWinner(user1.address, 5, parseEther('1'))
      ).to.emit(monoNFTContract, 'ConfirmWinner')

      expect(await monoNFTContract.confirmedMonosOf(user1.address)).to.equal(5)
      expect(await monoNFTContract.maxConfirmedMonosOf(user1.address)).to.equal(
        5
      )

      await expect(
        monoNFTContract
          .connect(admin)
          .confirmWinner(user1.address, 6, parseEther('1'))
      ).to.be.revertedWith('MonoNFT: Insufficient membership')
    })
  })

  describe('Claim', () => {
    const currentTokenId: number = 1
    let confirmWinnerTimestamp
    let getDepositAmountByAddress: (address: string) => Promise<bigint>
    let approveAndDeposit: (
      signer: SignerWithAddress,
      amount: number
    ) => Promise<void>
    beforeEach(async () => {
      const monoNFTMetadata = {
        donor: user1.address,
        //半年
        expiresDuration: (1000 * 60 * 60 * 24 * 365) / 2,
        uri: 'https://metadata.uri',
        status: 0,
        sharesOfCommunityToken: [
          {
            shareHolder: user2.address,
            shareRatio: 40,
          },
          {
            shareHolder: treasury.address,
            shareRatio: 60,
          },
        ],
      }

      const registerMonoNFT = async () => {
        await monoNFTContract
          .connect(admin)
          .register(
            monoNFTMetadata.donor,
            monoNFTMetadata.expiresDuration,
            monoNFTMetadata.uri,
            monoNFTMetadata.sharesOfCommunityToken,
            admin.address
          )
      }

      ;[...Array(6)].forEach(async () => await registerMonoNFT())

      const updateStatusToInAuction = async (tokenId: number) => {
        await monoNFTContract.connect(admin).updateMonoNFTStatus(tokenId, 1)
      }

      ;[...Array(6)].forEach(
        async (_, i) => await updateStatusToInAuction(i + 1)
      )

      await monoNFTContract
        .connect(admin)
        .confirmWinner(user1.address, currentTokenId, parseEther('1000'))

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

    it('should revert claim due to insufficient deposit in AuctionDeposit contract', async () => {
      await expect(
        monoNFTContract.connect(user1).claim(currentTokenId)
      ).to.be.revertedWith('AuctionDeposit: Deposit amount is not enough')
    })

    it('should deposit by user1 to AuctionDeposit contract', async () => {
      getDepositAmountByAddress = async (address: string): Promise<bigint> => {
        return (await auctionDepositContract.getDepositByAddress(address))
          .amount
      }

      const initialDepositAmountOfUser1 = await getDepositAmountByAddress(
        user1.address
      )

      approveAndDeposit = async (signer: SignerWithAddress, amount: number) => {
        await tokenContract
          .connect(signer)
          .approve(auctionDepositContract.getAddress(), parseEther(`${amount}`))
        await expect(
          await auctionDepositContract
            .connect(signer)
            .deposit(parseEther(`${amount}`))
        ).to.emit(auctionDepositContract, 'Deposit')
      }
      await approveAndDeposit(user1, 1000)

      const addedDepositAmountOfUser1 = await getDepositAmountByAddress(
        user1.address
      )

      expect(addedDepositAmountOfUser1).to.equal(
        initialDepositAmountOfUser1 + parseEther('1000')
      )
    })

    it('should claim', async () => {
      await approveAndDeposit(user1, 1000)

      const initialDepositAmountOfUser1 = await getDepositAmountByAddress(
        user1.address
      )

      expect(await monoNFTContract.userOf(currentTokenId)).to.equal(
        ethers.ZeroAddress
      )
      expect(await monoNFTContract.userExpires(currentTokenId)).to.equal(0)

      await expect(
        await monoNFTContract.connect(admin).approve(user1, currentTokenId)
      ).to.emit(monoNFTContract, 'Approval')

      const balanceOfUser2BeforeClaim = await tokenContract.balanceOf(
        user2.address
      )
      const balanceOfTresuryBeforeClaim = await tokenContract.balanceOf(
        treasury.address
      )

      await expect(await monoNFTContract.connect(user1).claim(currentTokenId))
        .to.emit(monoNFTContract, 'UpdateUser')
        .to.emit(monoNFTContract, 'Claim')

      expect(await getDepositAmountByAddress(user1.address)).to.equal(
        initialDepositAmountOfUser1 - parseEther('1000')
      )
      const balanceOfUser2AfterClaim = await tokenContract.balanceOf(
        user2.address
      )
      const balanceOfTresuryAfterClaim = await tokenContract.balanceOf(
        treasury.address
      )

      expect(balanceOfUser2AfterClaim - balanceOfUser2BeforeClaim).to.equal(
        parseEther('360')
      )
      expect(balanceOfTresuryAfterClaim - balanceOfTresuryBeforeClaim).to.equal(
        parseEther('540')
      )

      expect(await monoNFTContract.userOf(currentTokenId)).to.equal(
        user1.address
      )
      expect(await monoNFTContract.userExpires(currentTokenId)).to.equal(
        confirmWinnerTimestamp!.timestamp + (1000 * 60 * 60 * 24 * 365) / 2
      )

      expect(await monoNFTContract.ownerOf(currentTokenId)).to.equal(
        user1.address
      )

      const monoNFT = await monoNFTContract.getNFTs()
      expect(monoNFT[0].sharesOfCommunityToken.length).to.equal(1)
      expect(monoNFT[0].sharesOfCommunityToken[0].shareHolder).to.equal(
        treasury.address
      )
      expect(monoNFT[0].sharesOfCommunityToken[0].shareRatio).to.equal(
        BigInt(100)
      )
    })
  })

  describe('submit', function () {
    let tokenId: BigNumberish

    beforeEach(async () => {
      const monoNFTMetadata = {
        donor: user1.address,
        //半年
        expiresDuration: (1000 * 60 * 60 * 24 * 365) / 2,
        uri: 'https://metadata.uri',
        status: 0,
        sharesOfCommunityToken: [
          {
            shareHolder: user1.address,
            shareRatio: 100,
          },
        ],
      }
      // ここで新しいNFTを登録
      await monoNFTContract.register(
        monoNFTMetadata.donor,
        monoNFTMetadata.expiresDuration,
        monoNFTMetadata.uri,
        monoNFTMetadata.sharesOfCommunityToken,
        admin.address
      )
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
