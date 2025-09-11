// aaa_7.js - very raw hash function with verifier (educational only, NOT secure!)

// Simple salt generator (random hex string) - retained for any legacy use
function generateSalt(length = 16) {
  const chars = "abcdef0123456789";
  let salt = "";
  for (let i = 0; i < length * 2; i++) {
    salt += chars[Math.floor(Math.random() * chars.length)];
  }
  return salt;
}

// Deterministic salt derived from email (requested). NOTE: Reduces security (predictable), educational only.
function generateSaltFromEmail(email) {
  if (!email || typeof email !== 'string') return '0';
  email = email.trim().toLowerCase();
  let saltValue = 0;
  for (let i = 0; i < email.length; i++) {
    saltValue = (saltValue * 33 + email.charCodeAt(i)) % 1000000007; // large prime modulus
  }
  return saltValue.toString(16); // hex string
}

// Mixing function (adds + rotates bits)
function mixBytes(a, b, c, d) {
  a = (a + b) & 0xFF;
  a ^= ((d >>> 3) | (d << 5)) & 0xFF;

  b = (b + c) & 0xFF;
  b ^= ((a >>> 5) | (a << 3)) & 0xFF;

  c = (c + d) & 0xFF;
  c ^= ((b << 7) | (b >>> 1)) & 0xFF;

  d = (d + a) & 0xFF;
  d ^= ((c >>> 2) | (c << 6)) & 0xFF;

  return [a, b, c, d];
}

// Very raw hash function
function aaa_7(input, salt = null, workFactor = 500, outputBits = 128) {
  if (![64, 128, 256].includes(outputBits)) {
    throw new Error("Output bits must be 64, 128, or 256");
  }

  // If no salt provided, generate from email (must be passed separately)
  if (salt === null) {
    throw new Error("Salt is required - use generateSaltFromEmail(email) to generate it");
  }

  // Convert input string + salt into ASCII array
  let asciiArr = [];
  let combined = salt + input;
  for (let i = 0; i < combined.length; i++) {
    asciiArr.push(combined.charCodeAt(i) & 0xFF);
  }

  // Initial state
  let state = [0x6A, 0x89, 0xFE, 0x32];

  // Apply work factor loops
  for (let iter = 0; iter < workFactor; iter++) {
    for (let i = 0; i < asciiArr.length; i += 4) {
      let chunk = [
        asciiArr[i] || 0,
        asciiArr[i + 1] || 0,
        asciiArr[i + 2] || 0,
        asciiArr[i + 3] || 0
      ];

      // Mix with state
      let mixed = mixBytes(
        state[0] ^ chunk[0],
        state[1] ^ chunk[1],
        state[2] ^ chunk[2],
        state[3] ^ chunk[3]
      );

      // *** ASCII transformation step ***
      let asciiShift = combined.charCodeAt(i % combined.length);
      mixed = mixed.map(val => (val + asciiShift) & 0xFF);

      // Update state
      state[0] = (state[0] + mixed[0]) & 0xFF;
      state[1] = (state[1] + mixed[1]) & 0xFF;
      state[2] = (state[2] + mixed[2]) & 0xFF;
      state[3] = (state[3] + mixed[3]) & 0xFF;
    }

    // Final extra mixing per iteration
    state = mixBytes(state[0], state[1], state[2], state[3]);
  }

  // Decide output length in bytes
  let outputBytes = outputBits / 8;

  // Expand state into final hash
  let result = "";
  for (let i = 0; i < outputBytes; i++) {
    let val = state[i % 4];
    result += val.toString(16).padStart(2, "0");
    if (i % 4 === 3) {
      state = mixBytes(state[0], state[1], state[2], state[3]);
    }
  }

  return {
    hash: result,
    salt: salt,
    workFactor: workFactor,
    outputBits: outputBits
  };
}

// Verifier: check if input + salt matches given hash
function verify_aaa_7(input, expectedHash, salt, workFactor = 500, outputBits = 128) {
  const result = aaa_7(input, salt, workFactor, outputBits);
  return result.hash === expectedHash;
}

// Hash password with email-based salt and return full format
function hashPasswordWithEmail(password, email, workFactor = 1000, outputBits = 128) {
  const salt = generateSaltFromEmail(email);
  const result = aaa_7(password, salt, workFactor, outputBits);
  return `aaa_7$${workFactor}$${outputBits}$${salt}$${result.hash}`;
}

// Verify password against full hash format
function verifyPasswordHash(password, hashedPassword, email) {
  try {
    const parts = hashedPassword.split('$');
    if (parts.length !== 5 || parts[0] !== 'aaa_7') {
      console.log('Invalid hash format in verifyPasswordHash');
      return false;
    }

    const workFactor = parseInt(parts[1]);
    const outputBits = parseInt(parts[2]);
    const storedSalt = parts[3];
    const storedHash = parts[4];

    // First try with email-based salt (new method)
    if (email) {
      try {
        const emailSalt = generateSaltFromEmail(email);
        console.log('Testing with email-based salt:', emailSalt);
        const result1 = aaa_7(password, emailSalt, workFactor, outputBits);
        if (result1.hash === storedHash) {
          console.log('Password verified with email-based salt (new method)');
          return true;
        }
      } catch (err) {
        console.log('Error testing with email salt:', err.message);
      }
    }

    // Then try with the stored salt (legacy random salt method)
    try {
      console.log('Testing with stored salt (legacy method):', storedSalt);
      const result2 = aaa_7(password, storedSalt, workFactor, outputBits);
      if (result2.hash === storedHash) {
        console.log('Password verified with stored salt (legacy method) - needs upgrade');
        return { verified: true, needsUpgrade: true, password: password, email: email };
      }
    } catch (err) {
      console.log('Error testing with stored salt:', err.message);
    }

    console.log('Password verification failed with both salt methods');
    return false;
  } catch (error) {
    console.log('Error in verifyPasswordHash:', error.message);
    return false;
  }
}

module.exports = {
  aaa_7,
  verify_aaa_7,
  generateSalt,
  generateSaltFromEmail,
  hashPasswordWithEmail,
  verifyPasswordHash
};
