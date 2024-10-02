// SPDX-License-Identifier: MIT
pragma solidity ^0.8.27;

import "@openzeppelin/contracts/access/Ownable.sol";
import "./MyToken.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import {BitMaps} from "@openzeppelin/contracts/utils/structs/BitMaps.sol";

contract Airdrop is Ownable, Pausable {

    bytes32 public merkleRoot;
    MyToken private token;
    BitMaps.BitMap private _airdropList;
    
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
    function airdrop(bytes32[] memory _witnesses, uint256 _totalAmount, uint256 _path) public whenNotPaused {
        // Validar que el contrato tiene suficientes tokens para la transacción
        require(token.balanceOf(address(this)) >= _totalAmount, "AirDrop: MyToken contract does not have enough tokens.");

        //Validar que no se haya redimido anteriormente
        require(!BitMaps.get(_airdropList, _path), "Tokens Already Claimed!");

        // Resolver el nodo del Merkle Tree para validar la dirección y la cantidad total asignada
        bytes32 node = keccak256(abi.encodePacked(uint8(0x00), msg.sender, _totalAmount));
        for (uint16 i = 0; i < _witnesses.length; i++) {
            if ((_path & 0x01) == 1) {
                node = keccak256(abi.encodePacked(uint8(0x01), _witnesses[i], node));
            } else {
                node = keccak256(abi.encodePacked(uint8(0x01), node, _witnesses[i]));
            }
            _path /= 2;
        }
        require(node == merkleRoot, "AirDrop: address and amount not in the whitelist or wrong proof provided.");

        // Set bitmap to true for claiming user
        BitMaps.setTo(_airdropList, _path, true);

        // Transferir los tokens al usuario
        token.transfer(msg.sender, _totalAmount);
        emit TokensAirdropped(msg.sender, _totalAmount);
    }

    // Pausar y reanudar el contrato
    function pause() public onlyOwner {
        _pause();
    }

    function unpause() public onlyOwner {
        _unpause();
    }

    function getAirdropTokenBalance() public view returns (uint256) {
        return token.balanceOf(address(this));
    }
}
