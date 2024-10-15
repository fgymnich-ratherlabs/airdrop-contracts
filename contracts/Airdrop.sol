// SPDX-License-Identifier: MIT
pragma solidity ^0.8.27;

import "@openzeppelin/contracts/access/Ownable.sol";
import "./MyToken.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";

contract Airdrop is Ownable, Pausable {

    bytes32 public merkleRoot;
    MyToken public token;
    mapping(address => uint256) public redeemed; // Cantidad ya redimida por cada usuario
    mapping(address => uint256) public totalAssigned; // Cantidad total asignada a cada usuario

    constructor(bytes32 _merkleRoot, address _tokenAddress) Ownable(msg.sender) {
        merkleRoot = _merkleRoot;
        token = MyToken(_tokenAddress);
    }

    event TokensAirdropped(address indexed account, uint256 amount); //Redeemed

    // Actualiza el Merkle root
    function updateMerkleRoot(bytes32 _airDropWhiteListMerkleRoot) external onlyOwner { //airdrop external o public??
        merkleRoot = _airDropWhiteListMerkleRoot;
    }

    // Permite redimir tokens en múltiples transacciones
    function airdrop(bytes32[] calldata _merkleProof, bytes32[] memory _witnesses, uint256 _totalAmount, uint256 _amount, uint256 _path) public whenNotPaused {
        // Validar que el contrato tiene suficientes tokens para la transacción
        require(token.balanceOf(address(this)) >= _amount, "AirDrop: MyToken contract does not have enough tokens.");



       /*  // Resolver el nodo del Merkle Tree para validar la dirección y la cantidad total asignada
        bytes32 node = keccak256(abi.encodePacked(uint8(0x00), msg.sender, _totalAmount));
        for (uint16 i = 0; i < _witnesses.length; i++) {
            if ((_path & 0x01) == 1) {
                node = keccak256(abi.encodePacked(uint8(0x01), _witnesses[i], node));
            } else {
                node = keccak256(abi.encodePacked(uint8(0x01), node, _witnesses[i]));
            }
            _path /= 2;
        }
        require(node == merkleRoot, "AirDrop: address and amount not in the whitelist or wrong proof provided."); */



        bytes32 leaf = keccak256(bytes.concat(keccak256(abi.encode(msg.sender, _totalAmount))));
        require(verifyProof(_merkleProof, merkleRoot, leaf) , "AirDrop: address and amount not in the whitelist or wrong proof provided.");
        
        // Si no se ha registrado la cantidad total asignada, la asignamos la primera vez
        if (totalAssigned[msg.sender] == 0) {
            totalAssigned[msg.sender] = _totalAmount;
        }

        // Validar que la cantidad redimida no excede la cantidad total asignada
        require(redeemed[msg.sender] + _amount <= totalAssigned[msg.sender], "AirDrop: Amount exceeds the total assigned.");

        // Registrar la cantidad redimida hasta el momento
        redeemed[msg.sender] += _amount;

        // Transferir los tokens al usuario
        token.transfer(msg.sender, _amount);
        emit TokensAirdropped(msg.sender, _amount);
    }

    function verifyProof(bytes32[] memory proof, bytes32 root, bytes32 leaf) private pure returns (bool) {
        return processProof(proof, leaf) == root;
    }

    function processProof(bytes32[] memory proof, bytes32 leaf) private pure returns (bytes32) {
        bytes32 computedHash = leaf;
        for (uint256 i = 0; i < proof.length; i++) {
            computedHash = _hashPair(computedHash, proof[i]);
        }
        return computedHash;
    }

    function _hashPair(bytes32 a, bytes32 b) private pure returns (bytes32) {
        return a < b ? keccak256(abi.encode(a, b)) : keccak256(abi.encode(b, a));
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

    // Ver la cantidad total asignada a cada dirección (puede ser útil en la UI para que el usuario sepa cuánto le queda)
    function totalAssignedTokens(address account) public view returns (uint256) {
        return totalAssigned[account];
    }

    function getAirdropTokenBalance() public view returns (uint256) {
        return token.balanceOf(address(this));
    }
}
