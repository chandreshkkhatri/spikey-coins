/**
 * Password Reset Script
 * Direct command-line utility to reset any user's password
 *
 * Usage:
 *   tsx reset-password.ts <username> <new-password>
 *
 * Example:
 *   tsx reset-password.ts chandresh mynewpassword123
 */

import { hashPassword } from './src/utils/auth';
import { UserModel } from './src/models/User';
import DatabaseConnection from './src/services/DatabaseConnection';

async function resetPassword() {
  try {
    // Get command line arguments
    const args = process.argv.slice(2);

    if (args.length !== 2) {
      console.error('\n❌ Error: Invalid arguments');
      console.log('\nUsage:');
      console.log('  tsx reset-password.ts <username> <new-password>');
      console.log('\nExample:');
      console.log('  tsx reset-password.ts chandresh mynewpassword123\n');
      process.exit(1);
    }

    const [username, newPassword] = args;

    // Validate password length
    if (newPassword.length < 6) {
      console.error('\n❌ Error: Password must be at least 6 characters long\n');
      process.exit(1);
    }

    console.log('\n🔄 Connecting to database...');
    await DatabaseConnection.initialize();
    console.log('✅ Connected to database');

    // Find the user
    console.log(`\n🔍 Looking for user: ${username}`);
    const user = await UserModel.findOne({
      username: username.toLowerCase(),
    });

    if (!user) {
      console.error(`\n❌ Error: User '${username}' not found\n`);
      await DatabaseConnection.cleanup();
      process.exit(1);
    }

    console.log(`✅ Found user: ${user.username} (${user.email})`);
    console.log(`   Role: ${user.role}`);
    console.log(`   Active: ${user.isActive}`);

    // Hash the new password
    console.log('\n🔐 Hashing new password...');
    const hashedPassword = await hashPassword(newPassword);
    console.log('✅ Password hashed');

    // Update the password
    console.log('\n💾 Updating password in database...');
    await UserModel.findByIdAndUpdate(user._id, {
      $set: {
        password: hashedPassword,
        updatedAt: new Date(),
      },
    });
    console.log('✅ Password updated successfully');

    console.log('\n✨ SUCCESS! Password reset complete for user:', username);
    console.log('   You can now login with the new password\n');

    // Cleanup
    await DatabaseConnection.cleanup();
    process.exit(0);

  } catch (error) {
    console.error('\n❌ Error resetting password:', error);
    console.error('   Details:', (error as Error).message);
    console.log('\nTroubleshooting:');
    console.log('  • Make sure MongoDB is running');
    console.log('  • Check your .env file has correct MONGODB_URI');
    console.log('  • Verify the username exists in the database\n');

    await DatabaseConnection.cleanup();
    process.exit(1);
  }
}

// Run the script
resetPassword();
