const { expect } = require("chai");
const { merkleRoot, merkleProof, merkleVerification } = require('../scripts/merkleTree.js');

describe("Airdrop Contract", function () {
  let Token, Airdrop, token, airdrop, owner, addr1, addr2, addr3;
  let addresses = [];
  let merkleRootHash;

  beforeEach(async function () {
    [owner, addr1, addr2, addr3, ...addrs] = await ethers.getSigners();

    // Deploy MyToken
    Token = await ethers.getContractFactory("MyToken");
    token = await Token.deploy(10000); // Mint initial supply to owner
    await token.waitForDeployment();
    const tokenAddress = await token.getAddress();

    // Create list of eligible addresses for the Merkle Tree
    addresses = [addr1.address, addr2.address, addr3.address];

    // Generate the Merkle Root from the list of addresses
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

  it("should allow valid address to redeem tokens", async function () {
    const redeemAmount = ethers.parseEther("100");

    // Generate Merkle Proof for addr1
    const { witnesses, path } = merkleProof(addresses, addr1.address);

    // addr1 calls the airdrop function
    await expect(airdrop.connect(addr1).airdrop(witnesses, redeemAmount, path))
      .to.emit(airdrop, "TokensAirdropped")
      .withArgs(addr1.address, redeemAmount);

    // Check the token balance of addr1 after the airdrop
    const balance = await token.balanceOf(addr1.address);
    expect(balance).to.equal(redeemAmount);

    // Check that addr1's redeemed amount is updated
    const redeemedAmount = await airdrop.redeemedTokens(addr1.address);
    expect(redeemedAmount).to.equal(redeemAmount);
  });

  it("should fail for invalid proof", async function () {
    const redeemAmount = ethers.parseEther("100");

    // Generate Merkle Proof for addr1, but attempt to redeem with addr2
    const { witnesses, path } = merkleProof(addresses, addr1.address);

    // addr2 tries to redeem using addr1's proof (should fail)
    await expect(airdrop.connect(addr2).airdrop(witnesses, redeemAmount, path))
      .to.be.revertedWith("AirDrop: address not in the whitelist or wrong proof provided.");
  });

  it("should not allow redeeming when the contract has insufficient tokens", async function () {
    const redeemAmount = ethers.parseEther("6000"); // More than what's in the contract

    // Generate Merkle Proof for addr1
    const { witnesses, path } = merkleProof(addresses, addr1.address);

    // addr1 tries to redeem more tokens than are available in the contract
    await expect(airdrop.connect(addr1).airdrop(witnesses, redeemAmount, path))
      .to.be.revertedWith("AirDrop: MyToken contract does not have enough tokens.");
  });

  it("should allow multiple redemptions", async function () {
    const firstRedeem = ethers.parseEther("500");
    const secondRedeem = ethers.parseEther("500");

    // Generate Merkle Proof for addr1
    const { witnesses, path } = merkleProof(addresses, addr1.address);

    // First redemption
    await expect(airdrop.connect(addr1).airdrop(witnesses, firstRedeem, path))
      .to.emit(airdrop, "TokensAirdropped")
      .withArgs(addr1.address, firstRedeem);

    // Second redemption (should succeed, within the max limit)
    await expect(airdrop.connect(addr1).airdrop(witnesses, secondRedeem, path))
      .to.emit(airdrop, "TokensAirdropped")
      .withArgs(addr1.address, secondRedeem);

    // Check that the total redeemed amount equals the max limit
    const redeemedAmount = await airdrop.redeemedTokens(addr1.address);
    expect(redeemedAmount).to.equal(ethers.parseEther("1000"));
  });

  it("should allow the owner to pause the contract", async function () {
      await airdrop.pause();
      await expect(airdrop.airdrop([], 0, 0)).to.be.reverted;
  });

  it("Should unpause the contract and allow a valid airdrop claim", async function () {
    await airdrop.pause();
    await expect(airdrop.unpause()).to.not.be.reverted;

    // Generate Merkle Proof for addr1
    const { witnesses, path } = merkleProof(addresses, addr1.address);

    await expect(airdrop.connect(addr1).airdrop(witnesses, ethers.parseEther("50"), path))
      .to.emit(airdrop, "TokensAirdropped")
      .withArgs(addr1.address, ethers.parseEther("50"));
  });


});
