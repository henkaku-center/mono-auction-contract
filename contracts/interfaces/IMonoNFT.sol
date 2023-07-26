pragma solidity 0.8.18;

// SPDX-License-Identifier: MIT

import "./IERC4907.sol";

interface IMonoNFT is IERC4907 {
    // The struct of monoNFT
    /// @param donor: monoの寄贈者, Donor of the mono
    /// @param expiresDuration: monoNFTのデフォルトの利用権保有期間, Default expires duration of the monoNFT
    /// @param uri: monoNFTのトークンURI, Token uri of the monoNFT
    struct monoNFT {
        address donor;
        uint64 expiresDuration;
        string uri;
    }

    // Emit when a winner of an auction is confirmed.
    // オークション落札者が確定したときに発行。
    event ConfirmWinner(
        uint256 indexed tokenId,
        address indexed winner,
        uint256 price
    );

    // Emit when a nft successfly claimed by the winner of an auction.
    // オークション落札者がNFTを正常に引き取ったときに発行。
    event Claim(uint256 indexed tokenId, address indexed user, uint256 price);

    // Admin confirm the winner of an auction and set price, expires
    /// @param winner: オークション落札者, The winner of an auction
    /// @param tokenId: NFTのトークンID, The token id of the nft
    /// @param price: オークションの落札価格, The price of an auction
    /// @param expires: 利用権の有効期限、寄贈者が設定した期間をつかって算出, The expires of the user, calculated using the expiresDuration of the monoNFT
    /// @dev 管理者のみがこの関数実行可能, Only admin can call this function
    function confirmWinner(
        address winner,
        uint256 tokenId,
        uint256 price,
        uint64 expires
    ) external;

    // Submit a monoNFT for auction
    /// @param tokenId: NFTのトークンID, The token id of the nft
    /// @dev 管理者のみがこの関数実行可能, Only admin can call this function
    function submit(uint256 tokenId) external;

    // User of an NFT is changed and community token payment is executed
    /// @param tokenId: NFTのトークンID, The token id of the nft
    function claim(uint256 tokenId) external;

    // Get the monoNFTs
    function getNFTs() external view returns (monoNFT[] memory);

    // Get the expired monoNFT tokenIds
    function getExpiredNFTs() external view returns (uint256[] memory);

    // Get the token metadata of an monoNFT
    /// @param tokenId: NFTのトークンID, The token id of the nft
    function tokenURI(uint256 tokenId) external view returns (string memory);
}
