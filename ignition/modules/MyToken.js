// This setup uses Hardhat Ignition to manage smart contract deployments.
// Learn more about it at https://hardhat.org/ignition

const { buildModule } = require("@nomicfoundation/hardhat-ignition/modules");

module.exports = buildModule("MyTokenModule", (m) => {
  const token = m.contract("MyToken", [100] ); 

  return { token };
});
