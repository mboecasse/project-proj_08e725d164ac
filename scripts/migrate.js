// File: scripts/migrate.js
// Generated: 2025-10-08 13:15:23 UTC
// Project ID: proj_08e725d164ac
// Task ID: task_prse61q5q2ci


const mongoose = require('mongoose');


const path = require('path');

require('dotenv').config({ path: path.join(__dirname, '../.env') });

/**
 * Database Migration Script
 * Handles schema updates and data migrations for MongoDB
 */


const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/taskmanagement';

// Migration tracking collection


const MigrationSchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true },
  appliedAt: { type: Date, default: Date.now },
  status: { type: String, enum: ['pending', 'completed', 'failed'], default: 'pending' },
  error: String
});


let Migration;

/**
 * Initialize migration tracking
 */
async function initMigrationTracking() {
  try {
    Migration = mongoose.model('Migration', MigrationSchema);
    console.log('✓ Migration tracking initialized');
  } catch (error) {
    console.error('✗ Failed to initialize migration tracking:', error.message);
    throw error;
  }
}

/**
 * Check if migration has been applied
 */
async function isMigrationApplied(name) {
  const migration = await Migration.findOne({ name, status: 'completed' });
  return !!migration;
}

/**
 * Record migration
 */
async function recordMigration(name, status, error = null) {
  await Migration.findOneAndUpdate(
    { name },
    { status, error, appliedAt: new Date() },
    { upsert: true, new: true }
  );
}

/**
 * Migration 1: Add indexes for performance
 */
async function migration001_addIndexes() {
  const name = '001_add_indexes';

  if (await isMigrationApplied(name)) {
    console.log(`⊘ Migration ${name} already applied`);
    return;
  }

  console.log(`→ Applying migration: ${name}`);

  try {
    const db = mongoose.connection.db;

    // Users collection indexes
    await db.collection('users').createIndex({ email: 1 }, { unique: true });
    await db.collection('users').createIndex({ role: 1 });
    await db.collection('users').createIndex({ createdAt: -1 });

    // Teams collection indexes
    await db.collection('teams').createIndex({ name: 1 });
    await db.collection('teams').createIndex({ 'members.user': 1 });
    await db.collection('teams').createIndex({ owner: 1 });

    // Projects collection indexes
    await db.collection('projects').createIndex({ team: 1 });
    await db.collection('projects').createIndex({ status: 1 });
    await db.collection('projects').createIndex({ 'members.user': 1 });
    await db.collection('projects').createIndex({ startDate: 1, endDate: 1 });

    // Tasks collection indexes
    await db.collection('tasks').createIndex({ project: 1 });
    await db.collection('tasks').createIndex({ assignedTo: 1 });
    await db.collection('tasks').createIndex({ status: 1 });
    await db.collection('tasks').createIndex({ priority: 1 });
    await db.collection('tasks').createIndex({ dueDate: 1 });
    await db.collection('tasks').createIndex({ createdBy: 1 });

    // Subtasks collection indexes
    await db.collection('subtasks').createIndex({ task: 1 });
    await db.collection('subtasks').createIndex({ assignedTo: 1 });
    await db.collection('subtasks').createIndex({ status: 1 });

    // Comments collection indexes
    await db.collection('comments').createIndex({ task: 1, createdAt: -1 });
    await db.collection('comments').createIndex({ user: 1 });

    // Attachments collection indexes
    await db.collection('attachments').createIndex({ task: 1 });
    await db.collection('attachments').createIndex({ uploadedBy: 1 });

    // Notifications collection indexes
    await db.collection('notifications').createIndex({ user: 1, read: 1 });
    await db.collection('notifications').createIndex({ createdAt: -1 });

    // Activities collection indexes
    await db.collection('activities').createIndex({ user: 1, createdAt: -1 });
    await db.collection('activities').createIndex({ entityType: 1, entityId: 1 });
    await db.collection('activities').createIndex({ team: 1, createdAt: -1 });

    await recordMigration(name, 'completed');
    console.log(`✓ Migration ${name} completed successfully`);
  } catch (error) {
    await recordMigration(name, 'failed', error.message);
    console.error(`✗ Migration ${name} failed:`, error.message);
    throw error;
  }
}

/**
 * Migration 2: Add default values to existing documents
 */
async function migration002_addDefaultValues() {
  const name = '002_add_default_values';

  if (await isMigrationApplied(name)) {
    console.log(`⊘ Migration ${name} already applied`);
    return;
  }

  console.log(`→ Applying migration: ${name}`);

  try {
    const db = mongoose.connection.db;

    // Update users without isActive field
    await db.collection('users').updateMany(
      { isActive: { $exists: false } },
      { $set: { isActive: true } }
    );

    // Update users without lastLogin field
    await db.collection('users').updateMany(
      { lastLogin: { $exists: false } },
      { $set: { lastLogin: null } }
    );

    // Update teams without isActive field
    await db.collection('teams').updateMany(
      { isActive: { $exists: false } },
      { $set: { isActive: true } }
    );

    // Update projects without progress field
    await db.collection('projects').updateMany(
      { progress: { $exists: false } },
      { $set: { progress: 0 } }
    );

    // Update tasks without estimatedHours field
    await db.collection('tasks').updateMany(
      { estimatedHours: { $exists: false } },
      { $set: { estimatedHours: 0 } }
    );

    // Update tasks without actualHours field
    await db.collection('tasks').updateMany(
      { actualHours: { $exists: false } },
      { $set: { actualHours: 0 } }
    );

    // Update notifications without read field
    await db.collection('notifications').updateMany(
      { read: { $exists: false } },
      { $set: { read: false } }
    );

    await recordMigration(name, 'completed');
    console.log(`✓ Migration ${name} completed successfully`);
  } catch (error) {
    await recordMigration(name, 'failed', error.message);
    console.error(`✗ Migration ${name} failed:`, error.message);
    throw error;
  }
}

/**
 * Migration 3: Clean up orphaned documents
 */
async function migration003_cleanupOrphans() {
  const name = '003_cleanup_orphans';

  if (await isMigrationApplied(name)) {
    console.log(`⊘ Migration ${name} already applied`);
    return;
  }

  console.log(`→ Applying migration: ${name}`);

  try {
    const db = mongoose.connection.db;

    // Get all valid user IDs
    const users = await db.collection('users').find({}, { projection: { _id: 1 } }).toArray();
    const userIds = users.map(u => u._id);

    // Get all valid team IDs
    const teams = await db.collection('teams').find({}, { projection: { _id: 1 } }).toArray();
    const teamIds = teams.map(t => t._id);

    // Get all valid project IDs
    const projects = await db.collection('projects').find({}, { projection: { _id: 1 } }).toArray();
    const projectIds = projects.map(p => p._id);

    // Get all valid task IDs
    const tasks = await db.collection('tasks').find({}, { projection: { _id: 1 } }).toArray();
    const taskIds = tasks.map(t => t._id);

    // Remove projects with invalid team references
    const projectsResult = await db.collection('projects').deleteMany({
      team: { $nin: teamIds }
    });
    console.log(`  Removed ${projectsResult.deletedCount} orphaned projects`);

    // Remove tasks with invalid project references
    const tasksResult = await db.collection('tasks').deleteMany({
      project: { $nin: projectIds }
    });
    console.log(`  Removed ${tasksResult.deletedCount} orphaned tasks`);

    // Remove subtasks with invalid task references
    const subtasksResult = await db.collection('subtasks').deleteMany({
      task: { $nin: taskIds }
    });
    console.log(`  Removed ${subtasksResult.deletedCount} orphaned subtasks`);

    // Remove comments with invalid task references
    const commentsResult = await db.collection('comments').deleteMany({
      task: { $nin: taskIds }
    });
    console.log(`  Removed ${commentsResult.deletedCount} orphaned comments`);

    // Remove attachments with invalid task references
    const attachmentsResult = await db.collection('attachments').deleteMany({
      task: { $nin: taskIds }
    });
    console.log(`  Removed ${attachmentsResult.deletedCount} orphaned attachments`);

    // Remove notifications with invalid user references
    const notificationsResult = await db.collection('notifications').deleteMany({
      user: { $nin: userIds }
    });
    console.log(`  Removed ${notificationsResult.deletedCount} orphaned notifications`);

    await recordMigration(name, 'completed');
    console.log(`✓ Migration ${name} completed successfully`);
  } catch (error) {
    await recordMigration(name, 'failed', error.message);
    console.error(`✗ Migration ${name} failed:`, error.message);
    throw error;
  }
}

/**
 * Run all pending migrations
 */
async function runMigrations() {
  console.log('\n========================================');
  console.log('Starting Database Migrations');
  console.log('========================================\n');

  try {
    // Connect to database
    console.log('→ Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    console.log('✓ Connected to MongoDB\n');

    // Initialize migration tracking
    await initMigrationTracking();

    // Run migrations in order
    await migration001_addIndexes();
    await migration002_addDefaultValues();
    await migration003_cleanupOrphans();

    console.log('\n========================================');
    console.log('All Migrations Completed Successfully');
    console.log('========================================\n');

    process.exit(0);
  } catch (error) {
    console.error('\n========================================');
    console.error('Migration Failed');
    console.error('========================================');
    console.error('Error:', error.message);
    console.error('\n');
    process.exit(1);
  }
}

/**
 * Rollback last migration (manual implementation)
 */
async function rollbackMigration(migrationName) {
  console.log(`\n→ Rolling back migration: ${migrationName}`);

  try {
    await mongoose.connect(MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });

    await initMigrationTracking();

    // Mark migration as pending
    await Migration.findOneAndUpdate(
      { name: migrationName },
      { status: 'pending', error: null },
      { upsert: true }
    );

    console.log(`✓ Migration ${migrationName} marked for re-application`);
    console.log('Note: Manual cleanup may be required for dropped indexes or deleted data\n');

    process.exit(0);
  } catch (error) {
    console.error(`✗ Rollback failed:`, error.message);
    process.exit(1);
  }
}

/**
 * List all migrations and their status
 */
async function listMigrations() {
  console.log('\n========================================');
  console.log('Migration Status');
  console.log('========================================\n');

  try {
    await mongoose.connect(MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });

    await initMigrationTracking();

    const migrations = await Migration.find().sort({ appliedAt: 1 });

    if (migrations.length === 0) {
      console.log('No migrations have been applied yet.\n');
    } else {
      migrations.forEach(migration => {
        const status = migration.status === 'completed' ? '✓' :
                      migration.status === 'failed' ? '✗' : '○';
        console.log(`${status} ${migration.name}`);
        console.log(`  Status: ${migration.status}`);
        console.log(`  Applied: ${migration.appliedAt.toISOString()}`);
        if (migration.error) {
          console.log(`  Error: ${migration.error}`);
        }
        console.log('');
      });
    }

    console.log('========================================\n');
    process.exit(0);
  } catch (error) {
    console.error('✗ Failed to list migrations:', error.message);
    process.exit(1);
  }
}

// Parse command line arguments


const args = process.argv.slice(2);


const command = args[0];

if (command === 'rollback' && args[1]) {
  rollbackMigration(args[1]);
} else if (command === 'list') {
  listMigrations();
} else if (command === 'run' || !command) {
  runMigrations();
} else {
  console.log('\nUsage:');
  console.log('  node scripts/migrate.js              - Run all pending migrations');
  console.log('  node scripts/migrate.js run          - Run all pending migrations');
  console.log('  node scripts/migrate.js list         - List all migrations and status');
  console.log('  node scripts/migrate.js rollback <name> - Mark migration for re-application\n');
  process.exit(1);
}
