const { expect } = require("chai");
const { merkleRoot, merkleProof } = require('../scripts/merkleTree.js');

describe("Airdrop Contract", function () {
  let Token, Airdrop, token, airdrop, owner, addr1, addr2, addr3;
  let addresses = [];
  let merkleRootHash;

  beforeEach(async function () {
    [owner, addr1, addr2, addr3, addr4, addr5, addr6, addr7, ...addrs] = await ethers.getSigners();

    // Deploy MyToken
    Token = await ethers.getContractFactory("MyToken");
    token = await Token.deploy(10000); // Mint initial supply to owner
    await token.waitForDeployment();
    const tokenAddress = await token.getAddress();

    // Create list of eligible addresses for the Merkle Tree with total amounts
    addresses = [
      { address: addr1.address, amount: ethers.parseEther("1000") },
      { address: addr2.address, amount: ethers.parseEther("500") },
      { address: addr3.address, amount: ethers.parseEther("1500") },
      { address: addr4.address, amount: ethers.parseEther("1500") },
      { address: addr5.address, amount: ethers.parseEther("1500") },
      { address: addr6.address, amount: ethers.parseEther("1500") },
      { address: addr7.address, amount: ethers.parseEther("1500") },
    ];
    
    // Generate the Merkle Root from the list of addresses and amounts
    merkleRootHash = merkleRoot(addresses);

    // Deploy Airdrop contract
    Airdrop = await ethers.getContractFactory("Airdrop");
    airdrop = await Airdrop.deploy(merkleRootHash, tokenAddress);
    await airdrop.waitForDeployment();
    const airdropAddress = await airdrop.getAddress();

    // Transfer tokens to the Airdrop contract
    await token.transfer(airdropAddress, ethers.parseEther("5000")); // Transfer 5000 MTK tokens to the airdrop contract
  });

  it("should set the correct merkle root", async function () {
    expect(await airdrop.merkleRoot()).to.equal(merkleRootHash);
  });

  it("should allow valid address to redeem partial tokens", async function () {
    const redeemAmount = ethers.parseEther("100");
    const totalAmount = ethers.parseEther("1000");

    // Generate Merkle Proof for addr1
    const { witnesses, path } = merkleProof(addresses, { address: addr1.address, amount: totalAmount });

    // addr1 calls the airdrop function with a partial redemption
    await expect(airdrop.connect(addr1).airdrop(witnesses, totalAmount, redeemAmount, path))
      .to.emit(airdrop, "TokensAirdropped")
      .withArgs(addr1.address, redeemAmount);

    // Check the token balance of addr1 after the partial airdrop
    const balance = await token.balanceOf(addr1.address);
    expect(balance).to.equal(redeemAmount);

    // Check that addr1's redeemed amount is updated
    const redeemedAmount = await airdrop.redeemedTokens(addr1.address);
    expect(redeemedAmount).to.equal(redeemAmount);
  });

  it("should allow multiple partial redemptions", async function () {
    const firstRedeem = ethers.parseEther("500");
    const secondRedeem = ethers.parseEther("300");
    const totalAmount = ethers.parseEther("1000");

    // Generate Merkle Proof for addr1
    const { witnesses, path } = merkleProof(addresses, { address: addr1.address, amount: totalAmount });


    // First partial redemption
    await expect(airdrop.connect(addr1).airdrop(witnesses, totalAmount, firstRedeem, path))
      .to.emit(airdrop, "TokensAirdropped")
      .withArgs(addr1.address, firstRedeem);

    // Second partial redemption
    await expect(airdrop.connect(addr1).airdrop(witnesses, totalAmount, secondRedeem, path))
      .to.emit(airdrop, "TokensAirdropped")
      .withArgs(addr1.address, secondRedeem);

    // Check that the total redeemed amount equals 800 MTK
    const redeemedAmount = await airdrop.redeemedTokens(addr1.address);
    expect(redeemedAmount).to.equal(ethers.parseEther("800"));
  });

  it("should not allow redeeming more than the assigned total amount", async function () {
    const redeemAmount = ethers.parseEther("1100"); // Exceeding total assigned amount of 1000 MTK
    const totalAmount = ethers.parseEther("1000");

    // Generate Merkle Proof for addr1
    const { witnesses, path } = merkleProof(addresses, { address: addr1.address, amount: totalAmount });


    // addr1 tries to redeem more than assigned
    await expect(airdrop.connect(addr1).airdrop(witnesses, totalAmount, redeemAmount, path))
      .to.be.revertedWith("AirDrop: Amount exceeds the total assigned.");
  });

  it("should fail for invalid proof", async function () {
    const redeemAmount = ethers.parseEther("100");
    const totalAmount = ethers.parseEther("1000");

    // Generate Merkle Proof for addr1, but attempt to redeem with addr2
    const { witnesses, path } = merkleProof(addresses, { address: addr1.address, amount: totalAmount });


    // addr2 tries to redeem using addr1's proof (should fail)
    await expect(airdrop.connect(addr2).airdrop(witnesses, totalAmount, redeemAmount, path))
      .to.be.revertedWith("AirDrop: address and amount not in the whitelist or wrong proof provided.");
  });

  it("should not allow redeeming when the contract has insufficient tokens", async function () {
    const redeemAmount = ethers.parseEther("6000"); // More than what's in the contract
    const totalAmount = ethers.parseEther("1000");

    // Generate Merkle Proof for addr1
    const { witnesses, path } = merkleProof(addresses, { address: addr1.address, amount: totalAmount });


    // addr1 tries to redeem more tokens than are available in the contract
    await expect(airdrop.connect(addr1).airdrop(witnesses, totalAmount, redeemAmount, path))
      .to.be.revertedWith("AirDrop: MyToken contract does not have enough tokens.");
  });

  it("should allow the owner to pause the contract", async function () {
    await airdrop.pause();
    await expect(airdrop.airdrop([], 0, 0, 0)).to.be.reverted;
  });

  it("Should unpause the contract and allow a valid airdrop claim", async function () {
    await airdrop.pause();
    await expect(airdrop.unpause()).to.not.be.reverted;

    const totalAmount = ethers.parseEther("1000");

    // Generate Merkle Proof for addr1
    const { witnesses, path } = merkleProof(addresses, { address: addr1.address, amount: totalAmount });

    await expect(airdrop.connect(addr1).airdrop(witnesses, totalAmount, ethers.parseEther("50"), path))
      .to.emit(airdrop, "TokensAirdropped")
      .withArgs(addr1.address, ethers.parseEther("50"));
  });
});
