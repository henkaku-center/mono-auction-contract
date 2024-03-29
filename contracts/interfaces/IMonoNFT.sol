// SPDX-License-Identifier: MIT

pragma solidity ^0.8.18;

import "./IERC4907.sol";
import "@openzeppelin/contracts-upgradeable/access/IAccessControlUpgradeable.sol";

interface IMonoNFT is IERC4907, IAccessControlUpgradeable {
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

    // The type of monoNFT
    /// @param RIGHT_OF_OWN: 所有権, Right of own
    /// @param RIGHT_OF_USE: 利用権, Right of use
    enum MonoNFTRightType {
        RIGHT_OF_OWN,
        RIGHT_OF_USE
    }

    // The struct of monoNFT
    /// @param donor: monoの寄贈者, Donor of the mono
    /// @param expiresDuration: monoNFTのデフォルトの利用権保有期間, Default expires duration of the monoNFT
    /// @param uri: monoNFTのトークンURI, Token uri of the monoNFT
    struct MonoNFT {
        uint256 tokenId;
        address donor;
        uint64 expiresDuration;
        string uri;
        MonoNFTStatus status;
        ShareOfCommunityToken[] sharesOfCommunityToken;
    }

    // The struct of ShareOfCommunityToken
    /// @param shareHolder: 分配先アドレス, The address of the share holder
    /// @param shareRatio: 分配割合(%), The amount of the share (%)
    struct ShareOfCommunityToken {
        address shareHolder;
        uint8 shareRatio;
    }

    // The struct of Winner
    /// @param winner: オークションの落札者, Winner of an auction
    /// @param price: オークションの落札価格, The price of an auction
    /// @param expires:expires: 利用権の有効期限, The expires of the user
    struct Winner {
        address winner;
        uint256 price;
        uint64 expires;
    }

    // Emit when a winner of an auction is confirmed.
    // オークション落札者が確定したときに発行。
    event ConfirmWinner(
        uint256 indexed tokenId,
        address indexed winner,
        uint256 price
    );

    // Emit when a monoNFT is registered.
    event Register(uint256 indexed tokenId, MonoNFT _monoNFT);

    // Emit when a nft successfly claimed by the winner of an auction.
    // オークション落札者がNFTを正常に引き取ったときに発行。
    event Claim(uint256 indexed tokenId, address indexed user, uint256 price);

    // Set the address of the membershipNFT
    /// @param _membershipNFTAddress: membershipNFTのアドレス, The address of the new membershipNFT
    /// @dev 管理者のみがこの関数実行可能, Only admin can call this function
    function setMembershipNFTAddress(address _membershipNFTAddress) external;

    // Set the address of the auctionDepositContract
    /// @param _auctionDepositContractAddress: auctionDepositContractのアドレス, The address of the new auctionDepositContract
    /// @dev 管理者のみがこの関数実行可能, Only admin can call this function
    function setAuctionDepositAddress(
        address _auctionDepositContractAddress
    ) external;

    // Get the total number of monoNFTs of an user
    /// @param user: ユーザーアドレス, The address of the user
    /// @return ユーザーが落札しているmonoNFTの数, The total number of monoNFTs of an user
    function confirmedMonosOf(address user) external view returns (uint256);

    // Get the max number of monoNFTs of an user
    /// @param user: ユーザーアドレス, The address of the user
    /// @return ユーザーが落札できるmonoNFTの最大数, The max number of monoNFTs of an user
    function maxConfirmedMonosOf(address user) external view returns (uint256);

    // Admin register a monoNFT
    /// @param donor: monoの寄贈者, Donor of the mono
    /// @param expiresDuration: monoNFTのデフォルトの利用権保有期間, Default expires duration of the monoNFT
    /// @param uri: monoNFTのトークンURI, Token uri of the monoNFT
    /// @param sharesOfCommunityToken: コミュニティトークンの分配先と割合, The shares of Community Token
    /// @param owner: monoNFTのオーナー, Owner of the monoNFT
    /// @dev 管理者のみがこの関数実行可能, Only admin can call this function
    function register(
        address donor,
        uint64 expiresDuration,
        string memory uri,
        ShareOfCommunityToken[] memory sharesOfCommunityToken,
        address owner
    ) external;

    // Admin confirm the winner of an auction and set price, expires
    /// @param winner: オークション落札者, The winner of an auction
    /// @param tokenId: NFTのトークンID, The token id of the nft
    /// @param price: オークションの落札価格, The price of an auction
    /// @dev 管理者のみがこの関数実行可能, Only admin can call this function
    /// @dev winnerがオークションメンバーNFTを持っているかのチェック, Check whether the winner has the auction member NFT
    function confirmWinner(
        address winner,
        uint256 tokenId,
        uint256 price
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
    function getNFTs() external view returns (MonoNFT[] memory);

    // Get history of winners array
    function getHistoryOfWinners(
        uint256 tokenId
    ) external view returns (Winner[] memory);
}
