// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {ERC1155} from "@openzeppelin/contracts/token/ERC1155/ERC1155.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

/// @title CompletionBadge ── 常世の金魚すくい 完走証
/// @notice エピローグを完走した者に贈る記念NFT。合言葉の一致をrelayer経由でオンチェーン検証してmintする。
/// @dev 参加者は一切ガス代を払わない。relayerだけがclaimForを呼べる。
contract CompletionBadge is ERC1155, Ownable {
    uint256 public constant BADGE_ID = 1;
    uint256 public constant MAX_SUPPLY = 200;

    bytes32 public codeHash;
    address public relayer;
    uint256 public totalClaimed;
    mapping(address => bool) public hasClaimed;

    event Claimed(address indexed to, uint256 indexed tokenId);

    modifier onlyRelayer() {
        require(msg.sender == relayer, "not relayer");
        _;
    }

    constructor(
        address initialOwner,
        address initialRelayer,
        bytes32 initialCodeHash,
        string memory uri_
    ) ERC1155(uri_) Ownable(initialOwner) {
        relayer = initialRelayer;
        codeHash = initialCodeHash;
    }

    /// @notice relayerが代理でclaimを実行する。参加者本人は呼ばない。
    function claimFor(address to, string calldata phrase) external onlyRelayer {
        require(!hasClaimed[to], "already claimed");
        require(totalClaimed < MAX_SUPPLY, "sold out");
        require(keccak256(bytes(phrase)) == codeHash, "wrong phrase");
        hasClaimed[to] = true;
        totalClaimed += 1;
        _mint(to, BADGE_ID, 1, "");
        emit Claimed(to, BADGE_ID);
    }

    function remaining() external view returns (uint256) {
        return MAX_SUPPLY - totalClaimed;
    }

    function setCodeHash(bytes32 newCodeHash) external onlyOwner {
        codeHash = newCodeHash;
    }

    function setRelayer(address newRelayer) external onlyOwner {
        relayer = newRelayer;
    }

    function setURI(string calldata newUri) external onlyOwner {
        _setURI(newUri);
    }
}
