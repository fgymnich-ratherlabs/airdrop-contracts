// This setup uses Hardhat Ignition to manage smart contract deployments.
// Learn more about it at https://hardhat.org/ignition
// To deploy: npx hardhat ignition deploy ./ignition/modules/Airdrop.js --network localhost

require('dotenv').config()

const { buildModule } = require("@nomicfoundation/hardhat-ignition/modules");
const { merkleRoot } = require('./../../scripts/merkleTree');
const { ethers } = require("hardhat");

const tokenName = "MyToken"

// Lista de direcciones y cantidades que participarán en el airdrop
const addresses = [
    '0xe856fe9c604C03E43860703334D639a7bc6617D9',
    '0xD3B5a2d4bAb5F72e31465c2E459E6cDFe9620EC9',
    '0xfE2862EA01cCf2faE0A6b791546e4f75A4Cd376c',
    '0x5e8a77A09ffA838a4622531b3Dab29dB43fCC210',
    '0x91A12A52904E1F7bCd005E965Bf61F992E482ecA',
    '0x23CC7Aa91050eB100240209fc4C9De8651194EB6',
    '0xDC1e142edfF0C3915d85Ab17846eDaF8D1659211',
    '0xb8ADA9A34320d45B98d17a52e9079f6bf1B2097F',
    '0x2c8e4216c8E6d737385E2C2031fD61c688119B64',
    '0x9580e9af740d29fF38B09A09503DB9EBa18C1143',
    '0x5F944FF3C77B8729628e8aC1154a3bbe839A8EAb',
    '0x1793a7F41C6228584d1754D995720a0B2E870d4d',
    '0xA9f6FD26A06B9Ce386D6672975890e9a74DF69A9',
    '0x5Bf69E88316422a34e6BAe00d1382F46252D63E6',
    '0x4717f5E8b230E486D15B3ad04E88fB16ada1598B',
    '0x0b91911ee086B8FE527d9AA92c0b856B0cDf6916',
    '0xC3e15c1E36cD8fAc340e2d90f528cb044338e9B0',
    '0x3D0f8864Cc483E937A184119Cc9AE8f651eb07fa',
    '0xa41c949453d132aBEE72fBFBE2fb935Ee6D785C2',
    '0x23D8aeB858001324DAB793786B6EEb277F498DC4'
]

const tokensPerUser = 100; 

const items = addresses.map(address => ({
  address,
  amount: ethers.parseEther(tokensPerUser.toString())
}));


const initialSupply = addresses.length * tokensPerUser;

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
  m.call(token, "transfer", [airdrop, ethers.parseEther(initialSupply.toString())])
  
  return { airdrop };
});
