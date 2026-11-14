// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @notice Test-only stand-ins for the TapeOut read interfaces in TapeKit SPEC Appendix B.
/// Installed with hardhat_setCode at the documented X Layer addresses to test the UI resolver.
contract MockTapeFactory {
    address[] public cpus;
    mapping(address => bool) public isCPU;

    function addCpu(address cpu, bool real) external {
        cpus.push(cpu);
        isCPU[cpu] = real;
    }

    function cpuCount() external view returns (uint256) {
        return cpus.length;
    }

    function cpuAt(uint256 i) external view returns (address) {
        return cpus[i];
    }
}

contract MockTapeOpener {
    mapping(address => mapping(uint256 => address)) public accounts;

    function setAccount(address circuits, uint256 tokenId, address account) external {
        accounts[circuits][tokenId] = account;
    }

    function accountOf(address circuits, uint256 tokenId) external view returns (address) {
        return accounts[circuits][tokenId];
    }
}

contract MockTapeContainer {
    uint256 private _chainId;
    address private _tokenContract;
    uint256 private _tokenId;

    function setToken(uint256 chainId_, address tokenContract_, uint256 tokenId_) external {
        (_chainId, _tokenContract, _tokenId) = (chainId_, tokenContract_, tokenId_);
    }

    function token() external view returns (uint256, address, uint256) {
        return (_chainId, _tokenContract, _tokenId);
    }
}
