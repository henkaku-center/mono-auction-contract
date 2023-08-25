// SPDX-License-Identifier: MIT

pragma solidity ^0.8.18;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "./interfaces/IMonoNFT.sol";
import "./interfaces/IAuctionDeposit.sol";

contract AuctionDeposit is IAuctionDeposit {
    using SafeERC20 for IERC20;

    address public communityTokenAddr;
    address public monoNFTAddr;
    address public treasuryAddr;
    uint256 public maxDeposit = 2500 * 10 ** 18;

    // This mapping tracks the deposit info of each user
    mapping(address => uint256) private _deposits;

    constructor(address _token, address _monoNFTAddr, address _treasuryAddr) {
        communityTokenAddr = _token;
        monoNFTAddr = _monoNFTAddr;
        treasuryAddr = _treasuryAddr;
    }

    function setTreasuryAddress(address _treasuryAddr) external {
        require(
            IMonoNFT(monoNFTAddr).hasRole(bytes32(0), msg.sender),
            "AuctionDeposit: Only admins of MonoNFT can call setTreasuryAddress function"
        );
        treasuryAddr = _treasuryAddr;
    }

    function deposit(uint256 amount) external override {
        require(amount > 0, "AuctionDeposit: Amount should be greater than 0");
        require(
            _deposits[msg.sender] + amount <= maxDeposit,
            "AuctionDeposit: Deposit limit exceeded"
        );

        bool _success = IERC20(communityTokenAddr).transferFrom(
            msg.sender,
            address(this),
            amount
        );
        require(_success, "AuctionDeposit: Community token transfer failed");

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
        IERC20(communityTokenAddr).safeTransfer(msg.sender, amount);

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
        IERC20(communityTokenAddr).safeTransfer(msg.sender, amount);
        emit SendToTreasury(msg.sender, amount);
    }
}
