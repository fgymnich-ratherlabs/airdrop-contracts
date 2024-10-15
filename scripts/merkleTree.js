const { ethers } = require('hardhat');

exports.merkleRoot = (items) => {
  if (items.length === 0) throw new Error('Cannot build Merkle tree with empty items');

  let level = items.map(leafHash);

  while (level.length > 1) {
    level = hashLevel(level);
  }

  return level[0];
};

exports.merkleProof = (items, item) => {
  let index = items.findIndex((i) => i.address === item.address && i.amount === item.amount);
  if (index === -1) throw new Error('Item not found in items: ' + item);

  let witnesses = [];

  let level = items.map(leafHash);

  while (level.length > 1) {
    let isLeftNode = (index % 2 === 0); // Check if the node is on the left side
    let pairIndex = isLeftNode ? index + 1 : index - 1;

    if (pairIndex < level.length) {
      witnesses.push(level[pairIndex]); // Add the sibling node to the proof
    }

    // Move to the next level
    index = Math.floor(index / 2);
    level = hashLevel(level);
  }

  return {
    witnesses,
  };
};

exports.merkleVerification = (root, item, witnesses) => {
  let node = leafHash(item);

  for (let i = 0; i < witnesses.length; i++) {
    if (BigInt(node) < (BigInt(witnesses[i]))) {
      node = nodeHash(node, witnesses[i]);
    } else {
      node = nodeHash(witnesses[i], node);
    }
  }

  return node === root;
};

// Internal utility functions

function hashLevel(level) {
  let nextLevel = [];

  for (let i = 0; i < level.length; i += 2) {
    if (i === level.length - 1) nextLevel.push(level[i]); // Odd number of nodes at this level
    else {
      // Order nodes by value to avoid needing a `path`
      if (BigInt(level[i]) < (BigInt(level[i + 1]))) {
        nextLevel.push(nodeHash(level[i], level[i + 1]));
      } else {
        nextLevel.push(nodeHash(level[i + 1], level[i]));
      } 
    }
  }

  return nextLevel; 
}

function leafHash(leaf) {
  const prefix = ethers.hexlify(ethers.toUtf8Bytes("\x00"));
  const addressBytes = ethers.hexlify(leaf.address);
  const amountBytes = ethers.solidityPacked(['uint256'], [leaf.amount]);
  return ethers.keccak256(ethers.concat([prefix, addressBytes, amountBytes]));
}

function nodeHash(left, right) {
  const prefix = ethers.hexlify(ethers.toUtf8Bytes("\x01"));
  return ethers.keccak256(ethers.concat([prefix, left, right]));
}
