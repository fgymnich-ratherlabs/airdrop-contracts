// This setup uses Hardhat Ignition to manage smart contract deployments.
// Learn more about it at https://hardhat.org/ignition

const { buildModule } = require("@nomicfoundation/hardhat-ignition/modules");

const initialSupply = 1000;

const tokenName = "MyToken"

// Define el Merkle Root que vas a utilizar para el Airdrop
const merkleRoot = "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266";  // Reemplázalo con tu merkleRoot real

module.exports = buildModule("AirdropModule", (m) => {
  // Despliega el contrato de MyToken si aún no está desplegado
  const token = m.contract(tokenName, [initialSupply]);  // Ajusta el supply inicial si es necesario

  // Despliega el contrato de Airdrop pasando el merkleRoot y la dirección del token desplegado
  const airdrop = m.contract("Airdrop", [merkleRoot, token.address]);

  return { airdrop };
});
