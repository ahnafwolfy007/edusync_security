// Deterministic salt derived from email
function generateSaltFromEmail(email) {
  if (!email || typeof email !== 'string') return '0';
  const normalized = email.trim().toLowerCase();
  let saltValue = 0;
  for (let i = 0; i < normalized.length; i++) {
    saltValue = (saltValue * 33 + normalized.charCodeAt(i)) % 1000000007; // large prime modulus
  }
  return saltValue.toString(16); // hex string
}

// Mixing function (adds + rotates bits)
function mixBytes(a, b, c, d) {
  a = (a + b) & 0xff;
  a ^= ((d >>> 3) | (d << 5)) & 0xff;

  b = (b + c) & 0xff;
  b ^= ((a >>> 5) | (a << 3)) & 0xff;

  c = (c + d) & 0xff;
  c ^= ((b << 7) | (b >>> 1)) & 0xff;

  d = (d + a) & 0xff;
  d ^= ((c >>> 2) | (c << 6)) & 0xff;

  return [a, b, c, d];
}

// Core hash function
function aaa_7(input, salt = null, workFactor = 500, outputBits = 128) {
  if (![64, 128, 256].includes(outputBits)) {
    throw new Error('Output bits must be 64, 128, or 256');
  }

  if (salt === null) {
    throw new Error('Salt is required - use generateSaltFromEmail(email) to generate it');
  }

  // Convert input string + salt into ASCII array
  const combined = String(salt) + String(input);
  const asciiArr = [];
  for (let i = 0; i < combined.length; i++) {
    asciiArr.push(combined.charCodeAt(i) & 0xff);
  }

  // Initial state
  let state = [0x6a, 0x89, 0xfe, 0x32];

  // Apply work factor loops
  for (let iter = 0; iter < workFactor; iter++) {
    for (let i = 0; i < asciiArr.length; i += 4) {
      const chunk = [
        asciiArr[i] ?? 0,
        asciiArr[i + 1] ?? 0,
        asciiArr[i + 2] ?? 0,
        asciiArr[i + 3] ?? 0,
      ];

      // Mix current state with chunk
      let mixed = mixBytes(
        state[0] ^ chunk[0],
        state[1] ^ chunk[1],
        state[2] ^ chunk[2],
        state[3] ^ chunk[3]
      );

      // Add a position-dependent shift from the combined string
      const asciiShift = combined.charCodeAt(i % combined.length) & 0xff;
      mixed = mixed.map((val) => (val + asciiShift) & 0xff);

      // Update state
      state = [
        (state[0] + mixed[0]) & 0xff,
        (state[1] + mixed[1]) & 0xff,
        (state[2] + mixed[2]) & 0xff,
        (state[3] + mixed[3]) & 0xff,
      ];
    }

    // Final mixing per iteration
    state = mixBytes(state[0], state[1], state[2], state[3]);
  }

  // Decide output length in bytes and emit hex
  const outputBytes = outputBits / 8;
  let result = '';
  for (let i = 0; i < outputBytes; i++) {
    const val = state[i % 4] & 0xff;
    result += val.toString(16).padStart(2, '0');
    if (i % 4 === 3) {
      state = mixBytes(state[0], state[1], state[2], state[3]);
    }
  }

  return {
    hash: result,
    salt,
    workFactor,
    outputBits,
  };
}

// Verifier: check if input + salt matches given hash
function verify_aaa_7(input, expectedHash, salt, workFactor = 500, outputBits = 128) {
  const result = aaa_7(input, salt, workFactor, outputBits);
  return result.hash === expectedHash;
}

// Hash password with email-based salt
function hashPasswordWithEmail(password, email, workFactor = 1000, outputBits = 128) {
  const salt = generateSaltFromEmail(String(email || '').toLowerCase());
  const result = aaa_7(password, salt, workFactor, outputBits);
  return `aaa_7$${workFactor}$${outputBits}$${salt}$${result.hash}`;
}

// Verify password against full hash format
function verifyPasswordHash(password, hashedPassword, email) {
  try {
    if (typeof hashedPassword !== 'string') return false;
    const parts = hashedPassword.split('$');
    if (parts.length !== 5 || parts[0] !== 'aaa_7') {
      return false;
    }

    const workFactor = parseInt(parts[1], 10);
    const outputBits = parseInt(parts[2], 10);
    const storedSalt = parts[3];
    const storedHash = parts[4];

    // Try deterministic email-based salt first (new scheme)
    if (email) {
      const emailSalt = generateSaltFromEmail(String(email).toLowerCase());
      const r1 = aaa_7(password, emailSalt, workFactor, outputBits);
      if (r1.hash === storedHash) return true;
    }

    // Fallback to stored salt (legacy random-salt or non-deterministic entries)
    const r2 = aaa_7(password, storedSalt, workFactor, outputBits);
    return r2.hash === storedHash;
  } catch (err) {
    return false;
  }
}

module.exports = {
  aaa_7,
  verify_aaa_7,
  generateSaltFromEmail,
  hashPasswordWithEmail,
  verifyPasswordHash,
};
