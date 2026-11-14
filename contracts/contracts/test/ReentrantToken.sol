// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";

interface IBullaEscrowLike {
    function releaseFunds(uint256 id) external;
    function claimRefund(uint256 id) external;
    function mutualCancel(uint256 id) external;
}

/// @notice Test-only token whose transfer() calls back into the escrow.
contract ReentrantToken is ERC20 {
    enum Attack { None, Release, Refund, Cancel }

    IBullaEscrowLike public escrow;
    Attack public attack;
    uint256 public targetId;

    constructor() ERC20("Reentrant", "REE") {}

    function mint(address to, uint256 amount) external {
        _mint(to, amount);
    }

    function arm(address escrow_, Attack attack_, uint256 id) external {
        escrow = IBullaEscrowLike(escrow_);
        attack = attack_;
        targetId = id;
    }

    function _update(address from, address to, uint256 value) internal override {
        super._update(from, to, value);
        // Only attack on outbound transfers from the escrow.
        if (from == address(escrow) && attack != Attack.None) {
            Attack a = attack;
            attack = Attack.None; // one shot
            if (a == Attack.Release) escrow.releaseFunds(targetId);
            else if (a == Attack.Refund) escrow.claimRefund(targetId);
            else if (a == Attack.Cancel) escrow.mutualCancel(targetId);
        }
    }
}

/// @notice Test-only token that delivers 1% less than requested.
contract FeeOnTransferToken is ERC20 {
    constructor() ERC20("FeeOnTransfer", "FOT") {}

    function mint(address to, uint256 amount) external {
        _mint(to, amount);
    }

    function _update(address from, address to, uint256 value) internal override {
        if (from != address(0) && to != address(0)) {
            uint256 burnAmt = value / 100;
            super._update(from, address(0), burnAmt);
            super._update(from, to, value - burnAmt);
        } else {
            super._update(from, to, value);
        }
    }
}
