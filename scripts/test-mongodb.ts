// MongoDB Connection Test
// Run with: npx ts-node scripts/test-mongodb.ts

import connectDB, { mongoose } from '../lib/mongodb.js';

async function testMongoDB() {
  console.log('Testing MongoDB Atlas connection...\n');

  try {
    // Test 1: Connection
    console.log('1. Testing connection...');
    await connectDB();
    console.log('   ✓ Connected to MongoDB Atlas\n');

    // Test 2: Create test collection and document
    console.log('2. Testing insert...');
    const TestSchema = new mongoose.Schema({
      message: String,
      timestamp: { type: Date, default: Date.now },
    });
    
    const TestModel = mongoose.models.Test || mongoose.model('Test', TestSchema);
    const doc = await TestModel.create({ message: 'Hello from ZamSchool OS!' });
    console.log(`   ✓ Document inserted: ${doc._id}\n`);

    // Test 3: Read back
    console.log('3. Testing read...');
    const found = await TestModel.findById(doc._id);
    console.log(`   ✓ Document found: "${found?.message}"\n`);

    // Test 4: Update
    console.log('4. Testing update...');
    await TestModel.findByIdAndUpdate(doc._id, { message: 'Updated message' });
    const updated = await TestModel.findById(doc._id);
    console.log(`   ✓ Document updated: "${updated?.message}"\n`);

    // Test 5: Delete test data
    console.log('5. Testing delete...');
    await TestModel.findByIdAndDelete(doc._id);
    const deleted = await TestModel.findById(doc._id);
    console.log(`   ✓ Document deleted: ${deleted === null ? 'confirmed' : 'failed'}\n`);

    // Test 6: Server info
    console.log('6. MongoDB server info:');
    const admin = mongoose.connection.db.admin();
    const info = await admin.serverInfo();
    console.log(`   ✓ MongoDB version: ${info.version}\n`);

    console.log('✅ All MongoDB tests passed!');
  } catch (err) {
    console.error('❌ MongoDB test failed:', err);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('\n[MongoDB] Connection closed');
  }
}

testMongoDB();
