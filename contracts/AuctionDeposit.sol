// SPDX-License-Identifier: MIT

pragma solidity ^0.8.18;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "./interfaces/IAuctionDeposit.sol";
import "./MockERC20.sol";

contract AuctionDeposit is IAuctionDeposit {
    using SafeERC20 for IERC20;

    IERC20 public token;
    uint256 constant MAX_DEPOSIT = 2500 * 10 ** 18;

    // This mapping tracks the deposit info of each user
    mapping(address => uint256) private _deposits;

    constructor(IERC20 _token) {
        token = _token;
    }

    function deposit(uint256 amount) external override {
    require(amount > 0, "Amount should be greater than 0");
    require(_deposits[msg.sender] + amount <= MAX_DEPOSIT, "Deposit limit exceeded");

    uint256 balanceBefore = token.balanceOf(address(this));

    MockERC20(address(token)).transferFrom(msg.sender, address(this), amount);

    uint256 balanceAfter = token.balanceOf(address(this));
    require(
        balanceAfter - balanceBefore == amount,
        "ERC20 Token transfer failed"
    );

    _deposits[msg.sender] += amount;

    emit Deposit(msg.sender, amount);
}


    //仮で入れてるのであとから実装し直す必要あり
    function withdraw(uint256 amount) external override {
        require(
            _deposits[msg.sender] >= amount,
            "Withdraw amount exceeds deposit"
        );

        _deposits[msg.sender] -= amount;
        token.safeTransfer(msg.sender, amount);

        emit Withdraw(msg.sender, amount);
    }

    //仮で入れてるのであとから実装し直す必要あり
    function getAllDeposit()
        external
        view
        override
        returns (DepositInfo[] memory)
    {
        DepositInfo[] memory depositInfos = new DepositInfo[](0);
        return depositInfos;
    }

    //仮で入れてるのであとから実装し直す必要あり
    function getDepositByAddress(
        address user
    ) external view override returns (DepositInfo memory) {
        DepositInfo memory depositInfo = DepositInfo({
            user: user,
            amount: _deposits[user]
        });
        return depositInfo;
    }

    //仮で入れてるのであとから実装し直す必要あり
    function sendToTreasury(uint256 amount) external override {
        token.safeTransfer(msg.sender, amount);
        emit SendToTreasury(msg.sender, amount);
    }
}
