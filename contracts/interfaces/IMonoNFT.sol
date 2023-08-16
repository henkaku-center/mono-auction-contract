// SPDX-License-Identifier: MIT

pragma solidity 0.8.18;

import "./IERC4907.sol";

interface IMonoNFT is IERC4907 {
    // The status of monoNFT
    /// @param READY: オークション前, Before auction
    /// @param IN_AUCTION: オークション中, In auction
    /// @param CONFIRMED: 落札者確定, Auction ended
    /// @param CLAIMED: 支払完了 使用中, In use
    /// @param DEPRECATED: 廃止, Deprecated
    enum MonoNFTStatus {
        READY,
        IN_AUCTION,
        CONFIRMED,
        CLAIMED,
        DEPRECATED
    }

    // The struct of monoNFT
    /// @param donor: monoの寄贈者, Donor of the mono
    /// @param expiresDuration: monoNFTのデフォルトの利用権保有期間, Default expires duration of the monoNFT
    /// @param uri: monoNFTのトークンURI, Token uri of the monoNFT
    struct monoNFT {
        address donor;
        uint64 expiresDuration;
        string uri;
        MonoNFTStatus status;
    }

    // Emit when a winner of an auction is confirmed.
    // オークション落札者が確定したときに発行。
    event ConfirmWinner(
        uint256 indexed tokenId,
        address indexed winner,
        uint256 price
    );

    // Emit when a monoNFT is registered.
    event Register(uint256 indexed tokenId, monoNFT _monoNFT);

    // Emit when a nft successfly claimed by the winner of an auction.
    // オークション落札者がNFTを正常に引き取ったときに発行。
    event Claim(uint256 indexed tokenId, address indexed user, uint256 price);

    // Admin register a monoNFT
    /// @param _monoNFT: monoNFTの情報, The information of the monoNFT
    /// @dev 管理者のみがこの関数実行可能, Only admin can call this function
    function register(monoNFT calldata _monoNFT) external;

    // Admin confirm the winner of an auction and set price, expires
    /// @param winner: オークション落札者, The winner of an auction
    /// @param tokenId: NFTのトークンID, The token id of the nft
    /// @param price: オークションの落札価格, The price of an auction
    /// @param expires: 利用権の有効期限、寄贈者が設定した期間をつかって算出, The expires of the user, calculated using the expiresDuration of the monoNFT
    /// @dev 管理者のみがこの関数実行可能, Only admin can call this function
    /// @dev winnerがオークションメンバーNFTを持っているかのチェック, Check whether the winner has the auction member NFT
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
    /// @dev msg.senderがオークションメンバーNFTを持っているかのチェック, Check whether the msg.sender has the auction member NFT
    /// @dev depositコントラクトのsendToTreasury関数を呼び出す, Call the sendToTreasury function of the deposit contract
    function claim(uint256 tokenId) external;

    // Update the status of an monoNFT
    /// @param tokenId: NFTのトークンID, The token id of the nft
    /// @param status: NFTのステータス, The status of the monoNFT
    /// @dev 管理者のみがこの関数実行可能, Only admin can call this function
    function updateMonoNFTStatus(
        uint256 tokenId,
        MonoNFTStatus status
    ) external;

    // Get expiration of an monoNFT
    /// @param tokenId: NFTのトークンID, The token id of the nft
    /// @dev ERC4907のuserExpiresとblocktimestampの差分計算で使用期限切れかどうかのboolを返す
    function isExpired(uint256 tokenId) external view returns (bool);

    // Get the monoNFTs
    function getNFTs() external view returns (monoNFT[] memory);
}
