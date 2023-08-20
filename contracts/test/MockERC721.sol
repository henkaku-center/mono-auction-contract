// SPDX-License-Identifier: MIT

pragma solidity ^0.8.18;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";

contract MockERC721 is ERC721 {
    constructor(
        string memory name,
        string memory symbol,
        uint256 supply
    ) ERC721(name, symbol) {}

    function mint(address to, uint256 tokenId) external {
        _mint(to, tokenId);
    }
}
