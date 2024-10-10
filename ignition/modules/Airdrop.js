// This setup uses Hardhat Ignition to manage smart contract deployments.
// Learn more about it at https://hardhat.org/ignition
require('dotenv').config()

const { buildModule } = require("@nomicfoundation/hardhat-ignition/modules");
const { merkleRoot } = require('./../../scripts/merkleTree');
const { ethers } = require("hardhat");

const initialSupply = 1000;

const tokenName = "MyToken"

// Lista de direcciones y cantidades que participarán en el airdrop
const items = [
  { address: '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266', amount: ethers.parseEther("100") },
  { address: '0x70997970C51812dc3A010C7d01b50e0d17dc79C8', amount: ethers.parseEther("200") },
  { address: '0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC', amount: ethers.parseEther("150") },
  { address: process.env.ADDRESS_METAMASK_TESTING, amount: ethers.parseEther("100") }, 
  // Agrega más pares de address y amount
];

// Generar el Merkle Root a partir de la lista de direcciones y montos
const root = merkleRoot(items);

console.log('Merkle Root:', root);

const TokenModule = buildModule("MyTokenModule", (m) => {
  // Despliega el contrato de MyToken si aún no está desplegado
  const token = m.contract(tokenName, [initialSupply]);  // Ajusta el supply inicial si es necesario

  return { token };
});

module.exports = buildModule("AirdropModule", (m) => {
  //Despliega el contrato MyToken primero
  const { token } = m.useModule(TokenModule); //usando useModule nos aseguramos que se termine de ejecutar TokenModule primero . Ref: https://hardhat.org/ignition/docs/guides/creating-modules#creating-a-module-hierarchy-using-submodules

  // Despliega el contrato de Airdrop pasando el merkleRoot y la dirección del token desplegado
  const airdrop = m.contract("Airdrop", [root, token]); //usa token como address

  // Transfer tokens to the Airdrop contract
  m.call(token, "transfer", [airdrop, ethers.parseEther("1000")])
  
  return { airdrop };
});
