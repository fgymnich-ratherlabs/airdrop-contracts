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

  let path = [];
  let witnesses = [];

  let level = items.map(leafHash);

  while (level.length > 1) {
    let nextIndex = Math.floor(index / 2);

    if (nextIndex * 2 === index) { // left side
      if (index < level.length - 1) { // only if we're not the last in a level with odd number of nodes
        path.push(0);
        witnesses.push(level[index + 1]);
      }
    } else { // right side
      path.push(1);
      witnesses.push(level[index - 1]);
    }

    index = nextIndex;
    level = hashLevel(level);
  }

  return {
    path: path.reduceRight((a, b) => (a << 1) | b, 0),
    witnesses,
  };
};


exports.merkleVerification = (root, item, path, witnesses) => {
  let node = leafHash(item);
  
  for (let i = 0; i < witnesses.length; i++) {
    if ((path & 1) === 1) { // Compare with number 1
      node = nodeHash(witnesses[i], node);
    } else {
      node = nodeHash(node, witnesses[i]);
    }
    path = Math.floor(path / 2); // Proper integer division
  }

  return node === root;
};

// Internal utility functions

function hashLevel(level) {
  let nextLevel = [];

  for (let i = 0; i < level.length; i += 2) {
    if (i === level.length - 1) nextLevel.push(level[i]); // Odd number of nodes at this level
    else nextLevel.push(nodeHash(level[i], level[i + 1]));
  }

  return nextLevel;
}

function leafHash(leaf) {
  const prefix = ethers.hexlify(ethers.toUtf8Bytes("\x00"));
  
  // Empaquetar dirección y cantidad
  const addressBytes = ethers.hexlify(leaf.address); // Dirección en formato bytes
  const amountBytes = ethers.solidityPacked(['uint256'], [leaf.amount]); // Cantidad en formato uint256
  
  // Concatenar dirección y cantidad, y luego aplicar el keccak256
  return ethers.keccak256(ethers.concat([prefix, addressBytes, amountBytes]));
}

function nodeHash(left, right) {
  const prefix = ethers.hexlify(ethers.toUtf8Bytes("\x01"));
  return ethers.keccak256(ethers.concat([prefix, left, right]));
}


