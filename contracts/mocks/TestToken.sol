// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.9;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

// Example class - a mock class using delivering from ERC20
contract TestToken is ERC20 {
    constructor(uint256 initialBalance, address buyer) ERC20("Test", "TT") {
        _mint(buyer, initialBalance);
    }
}
