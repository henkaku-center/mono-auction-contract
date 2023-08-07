import { ethers } from "hardhat";
import { Contract, Signer } from "ethers";
import { expect } from "chai";

describe("AuctionDeposit", function () {
  let accounts: Signer[];
  let auction: Contract;
  let token: Contract; // This should be a mock ERC20 token for testing

  beforeEach(async function () {
    accounts = await ethers.getSigners();

    const Token = await ethers.getContractFactory("MockERC20");
    token = await Token.deploy();

    const Auction = await ethers.getContractFactory("AuctionDeposit");
    auction = await Auction.deploy();

    await token.deployed();
    await auction.deployed();
  });

  it("should allow users to deposit tokens", async function () {
    const initialBalance = await token.balanceOf(accounts[0].address);

    await token.transfer(auction.address, ethers.utils.parseEther("2500"));
    await auction.deposit(token.address, ethers.utils.parseEther("2500"));

    const finalBalance = await token.balanceOf(accounts[0].address);
    expect(finalBalance).to.equal(initialBalance.sub(ethers.utils.parseEther("2500")));
  });

  it("should not allow users to deposit more than the maximum", async function () {
    await expect(auction.deposit(token.address, ethers.utils.parseEther("3000"))).to.be.revertedWith("Deposit limit exceeded");
  });
});
