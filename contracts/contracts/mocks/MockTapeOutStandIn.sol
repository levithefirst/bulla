// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @title Testnet / local stand-ins for TapeOut (NOT TapeOut)
/// @notice TapeOut has no published X Layer testnet deployment (docs/research.md section 3), so judge mode
/// and local tests use these minimal contracts with the same read interfaces as TapeKit SPEC Appendix B.
/// Never deployed on X Layer mainnet (196): deploy scripts and the web build refuse it.

/// @notice Minimal ERC-721-style circuit NFT (B.3 `ownerOf`). Anyone can mint a stand-in circuit.
contract MockProcessor {
    string public constant name = "Bulla testnet stand-in for TapeOut";
    uint256 public totalMinted;
    mapping(uint256 => address) private _owners;

    event Transfer(address indexed from, address indexed to, uint256 indexed tokenId);

    error NoSuchToken(uint256 tokenId);
    error NotOwner();

    /// @notice Mint the next circuit #ID to the caller.
    function mint() external returns (uint256 id) {
        id = ++totalMinted;
        _owners[id] = msg.sender;
        emit Transfer(address(0), msg.sender, id);
    }

    function ownerOf(uint256 tokenId) external view returns (address o) {
        o = _owners[tokenId];
        if (o == address(0)) revert NoSuchToken(tokenId);
    }

    /// @notice Owner-only transfer (enough to test that receivables follow the circuit).
    function transferFrom(address from, address to, uint256 tokenId) external {
        if (_owners[tokenId] != msg.sender || from != msg.sender) revert NotOwner();
        _owners[tokenId] = to;
        emit Transfer(from, to, tokenId);
    }
}

/// @notice Container opener stand-in (B.2). `accountOf` is a deterministic pseudo-address; no contract is
/// deployed there, so stand-in containers cannot move tokens out (labelled in the UI).
contract MockOpener {
    mapping(address => mapping(uint256 => bool)) public isOpened;

    function accountOf(address circuits, uint256 tokenId) public view returns (address) {
        return address(uint160(uint256(keccak256(abi.encode("bulla-standin-container", block.chainid, circuits, tokenId)))));
    }

    function open(address circuits, uint256 tokenId) external returns (address) {
        isOpened[circuits][tokenId] = true;
        return accountOf(circuits, tokenId);
    }
}

/// @notice Processor factory stand-in (B.1).
contract MockTapeOutFactory {
    address[] private _cpus;
    mapping(address => bool) public isCPU;

    function addCpu(address cpu) external {
        if (!isCPU[cpu]) {
            isCPU[cpu] = true;
            _cpus.push(cpu);
        }
    }

    function cpuCount() external view returns (uint256) {
        return _cpus.length;
    }

    function cpuAt(uint256 i) external view returns (address) {
        return _cpus[i];
    }
}
