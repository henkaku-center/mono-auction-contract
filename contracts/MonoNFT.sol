// SPDX-License-Identifier: MIT

pragma solidity ^0.8.18;

import "./erc4907/ERC4907.sol";
import "./interfaces/IMonoNFT.sol";
import "./interfaces/IAuctionDeposit.sol";
import "@openzeppelin/contracts/utils/Counters.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/token/ERC1155/IERC1155.sol";

contract MonoNFT is ERC4907, IMonoNFT, AccessControl {
    using Counters for Counters.Counter;

    Counters.Counter private _tokenIds; // tokenIdのカウンターを管理

    address public auctionDepositContractAddress;

    address public membershipNFTAddress;

    mapping(uint256 => monoNFT) public _monoNFTs; // tokenIdとMonoNFTを紐付けるmapping
    mapping(uint256 => Winner) public _latestWinners;

    constructor(
        string memory _name,
        string memory _symbol
    ) ERC721(_name, _symbol) {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
    }

    modifier onlyMonoAuctionMember() {
        require(
            IERC1155(membershipNFTAddress).balanceOf(msg.sender, 1) >= 1,
            "MonoNFT: You don't have the auction member NFT"
        );
        _;
    }

    function setMembershipNFTAddress(
        address _membershipNFTAddress
    ) external onlyRole(DEFAULT_ADMIN_ROLE) {
        membershipNFTAddress = _membershipNFTAddress;
    }

    function setAuctionDepositAddress(
        address _auctionDepositContractAddress
    ) external onlyRole(DEFAULT_ADMIN_ROLE) {
        auctionDepositContractAddress = _auctionDepositContractAddress;
    }

    function register(monoNFT calldata _monoNFT) external {
        _tokenIds.increment();
        uint256 newTokenId = _tokenIds.current();
        _mint(msg.sender, newTokenId);
        _monoNFTs[newTokenId] = _monoNFT;
        emit Register(newTokenId, _monoNFT);
    }

    function confirmWinner(
        address winner,
        uint256 tokenId,
        uint256 price,
        uint256 expires
    ) public onlyRole(DEFAULT_ADMIN_ROLE) {
        // TODO: Check whether the winner has the auction member NFT
        _monoNFTs[tokenId].status = MonoNFTStatus.CONFIRMED;
        _latestWinners[tokenId] = Winner(winner, price, expires);
        emit ConfirmWinner(tokenId, winner, price);
    }

    // In principle, expires should be calculated using expiresDuration,
    // but it can also be specified externally for flexibility.
    function confirmWinner(
        address winner,
        uint256 tokenId,
        uint256 price
    ) external onlyRole(DEFAULT_ADMIN_ROLE) {
        // TODO: Check whether the winner has the auction member NFT
        uint256 expires = block.timestamp + _monoNFTs[tokenId].expiresDuration;
        confirmWinner(winner, tokenId, price, expires);
    }

    function submit(uint256 tokenId) external onlyRole(DEFAULT_ADMIN_ROLE) {
        // 指定されたtokenIdのNFTが存在することを確認
        require(
            keccak256(bytes(_monoNFTs[tokenId].uri)) != keccak256(bytes("")),
            "MonoNFT: NFT does not exist"
        );

        // NFTがオークションに出品されていない、またはオークションが終了していることを確認
        require(
            _monoNFTs[tokenId].status != MonoNFTStatus.IN_AUCTION,
            "MonoNFT: NFT is already in auction"
        );

        // 3. NFTのステータスをIN_AUCTIONに変更します。
        _monoNFTs[tokenId].status = MonoNFTStatus.IN_AUCTION;
    }

    function claim(uint256 tokenId) external onlyMonoAuctionMember {
        Winner memory winnerInfo = _latestWinners[tokenId];
        require(
            winnerInfo.winner == msg.sender,
            "MonoNFT: You are not the winner"
        );

        _monoNFTs[tokenId].status = MonoNFTStatus.CLAIMED;

        IAuctionDeposit(auctionDepositContractAddress).payForClaim(
            msg.sender,
            winnerInfo.price
        );

        setUser(tokenId, msg.sender, uint64(winnerInfo.expires));

        emit Claim(tokenId, msg.sender, winnerInfo.price);
    }

    function updateMonoNFTStatus(
        uint256 tokenId,
        MonoNFTStatus status
    ) external onlyRole(DEFAULT_ADMIN_ROLE) {
        _monoNFTs[tokenId].status = status;
    }

    function isExpired(uint256 tokenId) external view returns (bool) {
        return userExpires(tokenId) < block.timestamp;
    }

    function getNFTs() external view returns (monoNFT[] memory) {
        monoNFT[] memory nfts = new monoNFT[](_tokenIds.current());
        for (uint256 i = 0; i < _tokenIds.current(); i++) {
            nfts[i] = _monoNFTs[i + 1];
        }
        return nfts;
    }

    function supportsInterface(
        bytes4 interfaceId
    ) public view virtual override(ERC4907, AccessControl) returns (bool) {
        return super.supportsInterface(interfaceId);
    }

    function tokenURI(
        uint256 tokenId
    ) public view override(ERC721) returns (string memory) {
        return _monoNFTs[tokenId].uri;
    }
}
