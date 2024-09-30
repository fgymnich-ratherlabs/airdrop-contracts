// SPDX-License-Identifier: MIT
pragma solidity ^0.8.27;

import "@openzeppelin/contracts/access/Ownable.sol";
import "./MyToken.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";

contract Airdrop is Ownable, Pausable {

    bytes32 public merkleRoot;
    MyToken private token;
    mapping(address => uint256) private redeemed; // Permitir múltiples redenciones

    constructor(bytes32 _merkleRoot, address _tokenAddress) Ownable(msg.sender) {
        merkleRoot = _merkleRoot;
        token = MyToken(_tokenAddress);
    }

    event TokensAirdropped(address indexed account, uint256 amount);

    // Actualiza el Merkle root
    function updateMerkleRoot(bytes32 _airDropWhiteListMerkleRoot) external onlyOwner {
        merkleRoot = _airDropWhiteListMerkleRoot;
    }

    // Permite redimir tokens en múltiples transacciones
    function airdrop(bytes32[] memory _witnesses, uint256 _amount, uint256 _path) public whenNotPaused {
        // Validar que el contrato tiene suficientes tokens
        require(token.balanceOf(address(this)) >= _amount, "AirDrop: MyToken contract does not have enough tokens.");

        // Resolver el nodo del Merkle Tree para validar la dirección
        bytes32 node = keccak256(abi.encodePacked(uint8(0x00), msg.sender));
        for (uint16 i = 0; i < _witnesses.length; i++) {
            if ((_path & 0x01) == 1) {
                node = keccak256(abi.encodePacked(uint8(0x01), _witnesses[i], node));
            } else {
                node = keccak256(abi.encodePacked(uint8(0x01), node, _witnesses[i]));
            }
            _path /= 2;
        }
        require(node == merkleRoot, "AirDrop: address not in the whitelist or wrong proof provided.");

        // Registrar la cantidad redimida
        redeemed[msg.sender] += _amount;

        // Transferir tokens al usuario
        token.transfer(msg.sender, _amount);
        emit TokensAirdropped(msg.sender, _amount);
    }

    // Pausar y reanudar el contrato
    function pause() public onlyOwner {
        _pause();
    }

    function unpause() public onlyOwner {
        _unpause();
    }

    // Ver la cantidad redimida por cada dirección
    function redeemedTokens(address account) public view returns (uint256) {
        return redeemed[account];
    }

    function getAirdropTokenBalance() public view returns (uint256) {
        return token.balanceOf(address(this));
    }
}
