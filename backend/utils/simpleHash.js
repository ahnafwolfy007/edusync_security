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

// Generate salt from email deterministically
function generateSaltFromEmail(email) {
  if (!email || typeof email !== 'string') {
    throw new Error('Email is required for salt generation');
  }
  
  // Simple deterministic salt generation from email
  let salt = '';
  for (let i = 0; i < email.length && salt.length < 8; i++) {
    const charCode = email.charCodeAt(i);
    salt += (charCode % 256).toString(16).padStart(2, '0');
  }
  
  // Pad to at least 8 characters
  while (salt.length < 8) {
    salt += '00';
  }
  
  return salt.substring(0, 8); // Return exactly 8 characters
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

    // First try with the stored salt (for legacy hashes)
    try {
      const result1 = aaa_7(password, storedSalt, workFactor, outputBits);
      if (result1.hash === storedHash) {
        console.log('Password verified with stored salt');
        return true;
      }
    } catch (err) {
      console.log('Error testing with stored salt:', err.message);
    }

    // Then try with email-based salt (for new format)
    if (email) {
      try {
        const emailSalt = generateSaltFromEmail(email);
        const result2 = aaa_7(password, emailSalt, workFactor, outputBits);
        if (result2.hash === storedHash) {
          console.log('Password verified with email-based salt');
          return true;
        }
      } catch (err) {
        console.log('Error testing with email salt:', err.message);
      }
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
  generateSaltFromEmail,
  hashPasswordWithEmail,
  verifyPasswordHash
};
