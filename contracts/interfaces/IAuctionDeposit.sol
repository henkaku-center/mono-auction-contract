// SPDX-License-Identifier: MIT

pragma solidity 0.8.18;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "./IAuctionDeposit.sol";

interface IAuctionDeposit {
    // The struct of deposit
    /// @param user: The address of the user
    /// @param amount: The amount of Community Token
    struct DepositInfo {
        address user;
        uint256 amount;
    }

    // Emit when a user deposit Community Token to the contract
    event Deposit(address indexed user, uint256 amount);

    // Emit when a user withdraw Community Token from the contract
    event Withdraw(address indexed user, uint256 amount);

    // Emit when Community Token send to treasury
    event SendToTreasury(address indexed user, uint256 amount);

    // Deposit Community Token to the contract
    function deposit(uint256 amount) external;

    // Withdraw Community Token from the contract
    function withdraw(uint256 amount) external;

    // Send Community Token to treasury
    /// @param amount: The amount of Community Token to send
    /// @dev MonoNFTコントラクトからのみ呼び出し可能、Tresuaryのアドレスはconstructorで設定
    function sendToTreasury(uint256 amount) external;

    // Get the deposit info of an address
    /// @param _address: The address to get the deposit info
    function getDepositByAddress(
        address _address
    ) external view returns (DepositInfo memory);

    // Get all deposit info
    // すべてのデポジット情報を取得
    function getAllDeposit() external view returns (DepositInfo[] memory);
}

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