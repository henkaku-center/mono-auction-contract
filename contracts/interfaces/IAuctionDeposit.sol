// SPDX-License-Identifier: MIT
import "./IMonoNFT.sol";

pragma solidity ^0.8.18;

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

    // Move deposit balance from the claimer to the exhibitor(?)
    /// @param from: The address of the winner
    /// @param amount: The amount of Community Token to pay
    /// @param sharesOfCommunityToken: The shares of Community Token to pay
    /// @dev MonoNFTコントラクトからのみ呼び出し可能
    function payForClaim(
        address from,
        uint256 amount,
        IMonoNFT.ShareOfCommunityToken[] calldata sharesOfCommunityToken
    ) external;

    // Withdraw Community Token from the contract
    function withdraw(uint256 amount) external;

    // Get the deposit info of an address
    /// @param _address: The address to get the deposit info
    function getDepositByAddress(
        address _address
    ) external view returns (DepositInfo memory);

    // Get all deposit info
    // すべてのデポジット情報を取得
    function getAllDeposit() external view returns (DepositInfo[] memory);
}
