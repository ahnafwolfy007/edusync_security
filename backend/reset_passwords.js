const { hashPasswordWithEmail } = require('./utils/simpleHash');
const dbConfig = require('./config/db');

async function resetUserPassword(email, newPassword) {
  try {
    const db = dbConfig.db;
    
    // Hash the new password with the new email-based method
    const newHashedPassword = hashPasswordWithEmail(newPassword, email.toLowerCase());
    
    // Update the user's password
    const result = await db.query(
      'UPDATE users SET password_hash = $1, updated_at = NOW() WHERE email = $2 RETURNING user_id, email',
      [newHashedPassword, email.toLowerCase()]
    );
    
    if (result.rows.length === 0) {
      console.log('User not found with email:', email);
      return false;
    }
    
    console.log('Password reset successfully for user:', result.rows[0].email);
    console.log('New hash:', newHashedPassword);
    return true;
    
  } catch (error) {
    console.error('Error resetting password:', error.message);
    return false;
  }
}

// Example usage - uncomment and modify as needed
async function main() {
  // Reset password for a test user
  await resetUserPassword('user@bscse.uiu.ac.bd', 'newpassword123');
  
  // You can add more users here
  // await resetUserPassword('admin@bscse.uiu.ac.bd', 'adminpass123');
  
  process.exit(0);
}

if (require.main === module) {
  main();
}

module.exports = { resetUserPassword };
