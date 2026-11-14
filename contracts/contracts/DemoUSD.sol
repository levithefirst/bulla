// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";

/// @title DemoUSD
/// @notice Valueless 6-decimal test token for Bulla's judge mode on X Layer TESTNET only.
/// @dev Anyone can mint, capped per call and per address, so a demo burner can fund an invoice
/// without a faucet. Never deploy to mainnet; real-token mode uses USDC.
contract DemoUSD is ERC20 {
    /// @notice Max mint per call: 1,000 DemoUSD.
    uint256 public constant MINT_CAP_PER_CALL = 1_000 * 1e6;
    /// @notice Lifetime mint cap per address: 10,000 DemoUSD.
    uint256 public constant MINT_CAP_PER_ADDRESS = 10_000 * 1e6;

    /// @notice Amount each address has minted so far.
    mapping(address => uint256) public minted;

    /// @notice Mint amount exceeds the per-call cap.
    error MintAboveCallCap(uint256 amount, uint256 cap);
    /// @notice Mint would exceed the per-address lifetime cap.
    error MintAboveAddressCap(uint256 alreadyMinted, uint256 amount, uint256 cap);

    constructor() ERC20("Bulla DemoUSD (testnet, no value)", "DemoUSD") {}

    function decimals() public pure override returns (uint8) {
        return 6;
    }

    /// @notice Mint DemoUSD to the caller.
    /// @param amount Amount in base units (6 decimals), at most `MINT_CAP_PER_CALL`.
    function mint(uint256 amount) external {
        if (amount > MINT_CAP_PER_CALL) revert MintAboveCallCap(amount, MINT_CAP_PER_CALL);
        uint256 already = minted[msg.sender];
        if (already + amount > MINT_CAP_PER_ADDRESS) revert MintAboveAddressCap(already, amount, MINT_CAP_PER_ADDRESS);
        minted[msg.sender] = already + amount;
        _mint(msg.sender, amount);
    }
}
