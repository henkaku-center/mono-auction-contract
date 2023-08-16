// SPDX-License-Identifier: MIT

pragma solidity 0.8.18;

import "./erc4907/ERC4907.sol";
import "./interfaces/IMonoNFT.sol";
import "@openzeppelin/contracts/utils/Counters.sol";

contract MonoNFT is ERC4907, IMonoNFT {
    using Counters for Counters.Counter;
    Counters.Counter private _tokenIds;

    address public auctionDepositContractAddress;

    mapping(uint256 => monoNFT) public _monoNFTs;

    constructor(
        string memory _name,
        string memory _symbol,
        address _auctionDepositContractAddress
    ) ERC721(_name, _symbol) {
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
        uint64 expires
    ) external {}

    function submit(uint256 tokenId) external {}

    function claim(uint256 tokenId) external {}

    function updateMonoNFTStatus(
        uint256 tokenId,
        MonoNFTStatus status
    ) external {}

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
    ) public view virtual override(ERC4907) returns (bool) {
        return super.supportsInterface(interfaceId);
    }

    function tokenURI(
        uint256 tokenId
    ) public view override(ERC721) returns (string memory) {
        return _monoNFTs[tokenId].uri;
    }
}
