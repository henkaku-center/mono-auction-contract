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
    address public auctionAdminAddress;
    address public communityTreasuryAddress;

    mapping(uint256 => monoNFT) public _monoNFTs; // tokenIdとMonoNFTを紐付けるmapping
    mapping(uint256 => Winner) public _latestWinner;
    mapping(uint256 => Winner[]) public _historyOfWinners;

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

    modifier sharesOfCommunityTokenRatio(
        ShareOfCommunityToken[] memory sharesOfCommunityToken
    ) {
        uint8 totalRatio = 0;
        for (uint256 i = 0; i < sharesOfCommunityToken.length; i++) {
            totalRatio += sharesOfCommunityToken[i].shareRatio;
        }
        require(
            totalRatio == 100,
            "MonoNFT: The total ratio of shares of community token should be 100"
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

    function setAuctionAdminAddress(
        address _auctionAdminAddress
    ) external onlyRole(DEFAULT_ADMIN_ROLE) {
        auctionAdminAddress = _auctionAdminAddress;
    }

    function setCommunityTreasuryAddress(
        address _communityTreasuryAddress
    ) external onlyRole(DEFAULT_ADMIN_ROLE) {
        communityTreasuryAddress = _communityTreasuryAddress;
    }

    function register(
        monoNFT calldata _monoNFT,
        address owner
    )
        external
        onlyRole(DEFAULT_ADMIN_ROLE)
        sharesOfCommunityTokenRatio(_monoNFT.sharesOfCommunityToken)
    {
        _tokenIds.increment();
        uint256 newTokenId = _tokenIds.current();
        _mint(owner, newTokenId);
        _monoNFTs[newTokenId] = _monoNFT;
        emit Register(newTokenId, _monoNFT);
    }

    function changeSharesOfCommunityToken(
        uint256 tokenId,
        ShareOfCommunityToken[] calldata sharesOfCommunityToken
    )
        external
        onlyRole(DEFAULT_ADMIN_ROLE)
        sharesOfCommunityTokenRatio(sharesOfCommunityToken)
    {
        monoNFT storage monoNFT = _monoNFTs[tokenId];
        delete monoNFT.sharesOfCommunityToken;
        for (uint256 i = 0; i < sharesOfCommunityToken.length; i++) {
            monoNFT.sharesOfCommunityToken.push(sharesOfCommunityToken[i]);
        }
    }

    function confirmWinner(
        address winner,
        uint256 tokenId,
        uint256 price
    ) external onlyRole(DEFAULT_ADMIN_ROLE) {
        // TODO: Check whether the winner has the auction member NFT
        _monoNFTs[tokenId].status = MonoNFTStatus.CONFIRMED;
        uint64 expires = uint64(block.timestamp) +
            _monoNFTs[tokenId].expiresDuration;
        _latestWinner[tokenId] = Winner(winner, price, expires);
        emit ConfirmWinner(tokenId, winner, price);
    }

    function submit(uint256 tokenId) external onlyRole(DEFAULT_ADMIN_ROLE) {
        require(
            keccak256(bytes(_monoNFTs[tokenId].uri)) != keccak256(bytes("")),
            "MonoNFT: NFT does not exist"
        );
        require(
            _monoNFTs[tokenId].status != MonoNFTStatus.IN_AUCTION,
            "MonoNFT: NFT is already in auction"
        );

        _monoNFTs[tokenId].status = MonoNFTStatus.IN_AUCTION;
    }

    function claim(uint256 tokenId) external onlyMonoAuctionMember {
        monoNFT storage monoNFT = _monoNFTs[tokenId];
        require(
            monoNFT.status == MonoNFTStatus.CONFIRMED,
            "MonoNFT: Status should be confirmed"
        );

        Winner memory winnerInfo = _latestWinner[tokenId];
        require(
            winnerInfo.winner == msg.sender,
            "MonoNFT: You are not the winner"
        );

        MonoNFTRightType rightType = rightOf(tokenId);
        uint256 historyLength = _historyOfWinners[tokenId].length;

        IAuctionDeposit(auctionDepositContractAddress).payForClaim(
            winnerInfo.winner,
            winnerInfo.price,
            monoNFT.sharesOfCommunityToken
        );

        // @dev If first claim of right of use, set all share to community treasury for next claims
        // @dev only for right of use, setUser
        if (rightType == MonoNFTRightType.RIGHT_OF_USE) {
            setUser(tokenId, winnerInfo.winner, winnerInfo.expires);
            if (historyLength == 0) {
                delete monoNFT.sharesOfCommunityToken;
                monoNFT.sharesOfCommunityToken.push(
                    ShareOfCommunityToken({
                        shareHolder: communityTreasuryAddress,
                        shareRatio: 100
                    })
                );
            }
        }

        monoNFT.status = MonoNFTStatus.CLAIMED;

        _historyOfWinners[tokenId].push(winnerInfo);

        emit Claim(tokenId, winnerInfo.winner, winnerInfo.price);
    }

    function updateMonoNFTStatus(
        uint256 tokenId,
        MonoNFTStatus status
    ) external onlyRole(DEFAULT_ADMIN_ROLE) {
        _monoNFTs[tokenId].status = status;
    }

    function isExpired(uint256 tokenId) public view returns (bool) {
        return userExpires(tokenId) < uint64(block.timestamp);
    }

    function rightOf(uint256 tokenId) public view returns (MonoNFTRightType) {
        address owner = ownerOf(tokenId);
        if (owner == auctionAdminAddress) {
            return MonoNFTRightType.RIGHT_OF_USE;
        } else {
            return MonoNFTRightType.RIGHT_OF_OWN;
        }
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

    // @dev 使用期限内の場合、userOfのアドレスを返す. Return address of user if it is within the expiration date
    function ownerOf(
        uint256 tokenId
    ) public view override(ERC721, IERC721) returns (address) {
        address user = userOf(tokenId);
        if (user != address(0)) {
            return user;
        } else {
            address owner = _ownerOf(tokenId);
            require(owner != address(0), "ERC721: invalid token ID");
            return owner;
        }
    }
}
