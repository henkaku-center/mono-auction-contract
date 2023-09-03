import { ethers } from 'hardhat'
import { IMonoNFT } from '../../typechain-types'
import { LocalWalletAddresses } from './address'
import { parseEther } from 'ethers'

const main = async () => {
  const monoNFTAddress = '0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0'
  const mockERC20 = '0x5FbDB2315678afecb367f032d93F642f64180aa3'
  const mockERC1155 = '0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512'
  const { admin, user1, user2, donor, communityTresury } =
    LocalWalletAddresses()

  if (!monoNFTAddress || !mockERC20 || !mockERC1155) {
    throw new Error('Please set the address of the deployed contract.')
  }

  // monoNFTのregister

  const monoNFTData1 = {
    donor: donor.address,
    expiresDuration: 1000 * 60 * 60 * 24 * 7,
    uri: 'ipfs://QmR9gMFyfVzvbzzretUmQpicc1HAiduqF157YwFDb4fKH9',
    status: 0,
    sharesOfCommunityToken: [
      {
        shareHolder: donor.address,
        shareRatio: 50,
      },
      {
        shareHolder: communityTresury.address,
        shareRatio: 50,
      },
    ],
  }

  const monoNFTData2 = {
    donor: user2.address,
    expiresDuration: 1000 * 60,
    uri: 'ipfs://QmbaSafFsRfo13KWHYdd8Mhkcih2GFHLKij7fEyNAWU2Bo',
    status: 0,
    sharesOfCommunityToken: [
      {
        shareHolder: user2.address,
        shareRatio: 50,
      },
      {
        shareHolder: communityTresury.address,
        shareRatio: 50,
      },
    ],
  }

  const monoNFTContract = await ethers.getContractAt('MonoNFT', monoNFTAddress)
  await (
    await monoNFTContract
      .connect(admin)
      .register(
        monoNFTData1.donor,
        monoNFTData1.expiresDuration,
        monoNFTData1.uri,
        monoNFTData1.sharesOfCommunityToken,
        admin.address
      )
  ).wait()
  await new Promise((resolve) => setTimeout(resolve, 500))
  await (
    await monoNFTContract
      .connect(admin)
      .register(
        monoNFTData2.donor,
        monoNFTData2.expiresDuration,
        monoNFTData2.uri,
        monoNFTData2.sharesOfCommunityToken,
        user2.address
      )
  ).wait()
  await new Promise((resolve) => setTimeout(resolve, 500))

  // communityTokenの配布
  const mockERC20Contract = await ethers.getContractAt('MockERC20', mockERC20)
  await (
    await mockERC20Contract
      .connect(admin)
      .transfer(user1.address, parseEther('2500'))
  ).wait()
  await new Promise((resolve) => setTimeout(resolve, 500))
  await (
    await mockERC20Contract
      .connect(admin)
      .transfer(user2.address, parseEther('2500'))
  ).wait()
  await new Promise((resolve) => setTimeout(resolve, 500))

  // memberNFTの配布
  const mockERC1155Contract = await ethers.getContractAt(
    'MockERC1155',
    mockERC1155
  )
  await (await mockERC1155Contract.connect(admin).mint(user1.address, 1)).wait()
  await new Promise((resolve) => setTimeout(resolve, 500))
  await (await mockERC1155Contract.connect(admin).mint(user2.address, 1)).wait()
  await new Promise((resolve) => setTimeout(resolve, 500))
  await (await mockERC1155Contract.connect(admin).mint(donor.address, 1)).wait()
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
