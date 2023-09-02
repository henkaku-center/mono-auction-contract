// SPDX-License-Identifier: MIT

pragma solidity ^0.8.18;

import "@openzeppelin/contracts/token/ERC1155/ERC1155.sol";

contract MockERC1155 is ERC1155("") {
    uint256 public tokenIds;

    function mint(address to, uint256 id) external {
        _mint(to, id, 1, "");
    }
}
