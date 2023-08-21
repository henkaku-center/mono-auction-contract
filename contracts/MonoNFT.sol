// SPDX-License-Identifier: MIT

pragma solidity ^0.8.18;

import "./erc4907/ERC4907.sol";
import "./interfaces/IMonoNFT.sol";
import "@openzeppelin/contracts/utils/Counters.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";

contract MonoNFT is ERC4907, IMonoNFT, AccessControl {
    using Counters for Counters.Counter;
    Counters.Counter private _tokenIds;

    address public auctionDepositContractAddress;

    address public membershipNFTAddress;

    mapping(uint256 => monoNFT) public _monoNFTs;
    mapping(uint256 => Winner) public _latestWinners;

    constructor(
        string memory _name,
        string memory _symbol,
        address _auctionDepositContractAddress,
        address _membershipNFTAddress
    ) ERC721(_name, _symbol) {
        auctionDepositContractAddress = _auctionDepositContractAddress;
        membershipNFTAddress = _membershipNFTAddress;
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
    }

    function setMembershipNFTAddress(
        address _membershipNFTAddress
    ) external onlyRole(DEFAULT_ADMIN_ROLE) {
        membershipNFTAddress = _membershipNFTAddress;
    }

    function register(monoNFT calldata _monoNFT) external {
        // TODO: Only admin can call this function
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
        uint256 expires = block.number + _monoNFTs[tokenId].expiresDuration;
        confirmWinner(winner, tokenId, price, expires);
    }

    function submit(uint256 tokenId) external onlyRole(DEFAULT_ADMIN_ROLE) {
        // TODO: Only admin can call this function
        // これは IN_AUCTION のための関数かも?
    }

    function claim(uint256 tokenId) external {
        // TODO: Check whether the sender has the auction member NFT
        require(
            IERC721(membershipNFTAddress).ownerOf(tokenId) == msg.sender,
            "MonoNFT: You don't have the auction member NFT"
        );
        // TODO: Check whether the sender is the winner
        // TODD: Call the sendToTreasury function of the deposit contract（落札者情報を元に）
        // TODO: CLAIMEDに変更
        // TODO: call setUser（落札者情報を元に）
    }

    function updateMonoNFTStatus(
        uint256 tokenId,
        MonoNFTStatus status
    ) external onlyRole(DEFAULT_ADMIN_ROLE) {}

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
