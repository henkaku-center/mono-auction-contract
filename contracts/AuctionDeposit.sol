// SPDX-License-Identifier: MIT

pragma solidity ^0.8.18;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "./interfaces/IAuctionDeposit.sol"

contract AuctionDeposit is IAuctionDeposit {
    using SafeERC20 for IERC20;

    IERC20 public token;
    uint256 constant MAX_DEPOSIT = 2500 * 10**18;

    // This mapping tracks the deposit info of each user
    mapping(address => uint256) private _deposits;

    constructor(IERC20 _token) {
        token = _token;
    }

    function deposit(uint256 amount) external override {
        uint256 balanceBefore = token.balanceOf(address(this));
        uint256 balanceAfter = token.balanceOf(address(this));
        require(balanceAfter - balanceBefore == amount, "Transferred amount does not match requested amount");

        _deposits[msg.sender] += amount;
        require(_deposits[msg.sender] <= MAX_DEPOSIT, "Deposit limit exceeded");

        emit Deposit(msg.sender, amount);
    }
}