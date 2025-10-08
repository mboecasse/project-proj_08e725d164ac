// File: tests/integration/teams.test.js
// Generated: 2025-10-08 13:17:44 UTC
// Project ID: proj_08e725d164ac
// Task ID: task_fruhrrj9pz8j


const Project = require('../../src/models/Project');


const Team = require('../../src/models/Team');


const User = require('../../src/models/User');


const app = require('../../src/app');


const jwt = require('jsonwebtoken');


const logger = require('../../src/utils/logger');


const mongoose = require('mongoose');


const request = require('supertest');

describe('Team Integration Tests', () => {
  let adminToken;
  let managerToken;
  let memberToken;
  let adminUser;
  let managerUser;
  let memberUser;
  let testTeam;

  beforeAll(async () => {
    // Connect to test database
    const mongoUri = process.env.MONGODB_URI_TEST || 'mongodb://localhost:27017/taskmanager_test';
    await mongoose.connect(mongoUri, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });

    // Create test users
    adminUser = await User.create({
      name: 'Admin User',
      email: 'admin@test.com',
      password: 'Password123!',
      role: 'admin'
    });

    managerUser = await User.create({
      name: 'Manager User',
      email: 'manager@test.com',
      password: 'Password123!',
      role: 'manager'
    });

    memberUser = await User.create({
      name: 'Member User',
      email: 'member@test.com',
      password: 'Password123!',
      role: 'member'
    });

    // Generate tokens
    adminToken = jwt.sign(
      { userId: adminUser._id, role: adminUser.role },
      process.env.JWT_ACCESS_SECRET || 'test_secret',
      { expiresIn: '1h' }
    );

    managerToken = jwt.sign(
      { userId: managerUser._id, role: managerUser.role },
      process.env.JWT_ACCESS_SECRET || 'test_secret',
      { expiresIn: '1h' }
    );

    memberToken = jwt.sign(
      { userId: memberUser._id, role: memberUser.role },
      process.env.JWT_ACCESS_SECRET || 'test_secret',
      { expiresIn: '1h' }
    );
  });

  afterAll(async () => {
    // Clean up and disconnect
    await User.deleteMany({});
    await Team.deleteMany({});
    await Project.deleteMany({});
    await mongoose.connection.close();
  });

  beforeEach(async () => {
    // Clear teams before each test
    await Team.deleteMany({});
    await Project.deleteMany({});
  });

  describe('POST /api/teams', () => {
    it('should create a new team with valid data', async () => {
      const teamData = {
        name: 'Engineering Team',
        description: 'Software development team'
      };

      const response = await request(app)
        .post('/api/teams')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(teamData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('_id');
      expect(response.body.data.name).toBe(teamData.name);
      expect(response.body.data.description).toBe(teamData.description);
      expect(response.body.data.owner).toBe(adminUser._id.toString());
      expect(response.body.data.members).toHaveLength(1);
      expect(response.body.data.members[0].user).toBe(adminUser._id.toString());
      expect(response.body.data.members[0].role).toBe('owner');
    });

    it('should fail to create team without authentication', async () => {
      const teamData = {
        name: 'Test Team',
        description: 'Test description'
      };

      const response = await request(app)
        .post('/api/teams')
        .send(teamData)
        .expect(401);

      expect(response.body.success).toBe(false);
    });

    it('should fail to create team with missing required fields', async () => {
      const teamData = {
        description: 'Missing name field'
      };

      const response = await request(app)
        .post('/api/teams')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(teamData)
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    it('should fail to create team with duplicate name', async () => {
      const teamData = {
        name: 'Unique Team',
        description: 'First team'
      };

      await Team.create({
        name: teamData.name,
        description: teamData.description,
        owner: adminUser._id,
        members: [{ user: adminUser._id, role: 'owner' }]
      });

      const response = await request(app)
        .post('/api/teams')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(teamData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('already exists');
    });
  });

  describe('GET /api/teams', () => {
    beforeEach(async () => {
      // Create test teams
      await Team.create({
        name: 'Team 1',
        description: 'First team',
        owner: adminUser._id,
        members: [{ user: adminUser._id, role: 'owner' }]
      });

      await Team.create({
        name: 'Team 2',
        description: 'Second team',
        owner: managerUser._id,
        members: [
          { user: managerUser._id, role: 'owner' },
          { user: adminUser._id, role: 'member' }
        ]
      });
    });

    it('should get all teams for authenticated user', async () => {
      const response = await request(app)
        .get('/api/teams')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeInstanceOf(Array);
      expect(response.body.data.length).toBeGreaterThan(0);
      expect(response.body.count).toBeDefined();
    });

    it('should fail to get teams without authentication', async () => {
      const response = await request(app)
        .get('/api/teams')
        .expect(401);

      expect(response.body.success).toBe(false);
    });

    it('should filter teams by search query', async () => {
      const response = await request(app)
        .get('/api/teams?search=Team 1')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeInstanceOf(Array);
      expect(response.body.data.every(team => team.name.includes('Team 1'))).toBe(true);
    });
  });

  describe('GET /api/teams/:id', () => {
    beforeEach(async () => {
      testTeam = await Team.create({
        name: 'Test Team',
        description: 'Test description',
        owner: adminUser._id,
        members: [{ user: adminUser._id, role: 'owner' }]
      });
    });

    it('should get team by ID', async () => {
      const response = await request(app)
        .get(`/api/teams/${testTeam._id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data._id).toBe(testTeam._id.toString());
      expect(response.body.data.name).toBe(testTeam.name);
    });

    it('should fail to get team with invalid ID', async () => {
      const invalidId = new mongoose.Types.ObjectId();

      const response = await request(app)
        .get(`/api/teams/${invalidId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(404);

      expect(response.body.success).toBe(false);
    });

    it('should fail to get team without authentication', async () => {
      const response = await request(app)
        .get(`/api/teams/${testTeam._id}`)
        .expect(401);

      expect(response.body.success).toBe(false);
    });

    it('should fail to get team user is not member of', async () => {
      const response = await request(app)
        .get(`/api/teams/${testTeam._id}`)
        .set('Authorization', `Bearer ${memberToken}`)
        .expect(403);

      expect(response.body.success).toBe(false);
    });
  });

  describe('PUT /api/teams/:id', () => {
    beforeEach(async () => {
      testTeam = await Team.create({
        name: 'Test Team',
        description: 'Test description',
        owner: adminUser._id,
        members: [{ user: adminUser._id, role: 'owner' }]
      });
    });

    it('should update team as owner', async () => {
      const updates = {
        name: 'Updated Team Name',
        description: 'Updated description'
      };

      const response = await request(app)
        .put(`/api/teams/${testTeam._id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send(updates)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.name).toBe(updates.name);
      expect(response.body.data.description).toBe(updates.description);
    });

    it('should fail to update team as non-owner', async () => {
      await Team.findByIdAndUpdate(testTeam._id, {
        $push: { members: { user: memberUser._id, role: 'member' } }
      });

      const updates = {
        name: 'Unauthorized Update'
      };

      const response = await request(app)
        .put(`/api/teams/${testTeam._id}`)
        .set('Authorization', `Bearer ${memberToken}`)
        .send(updates)
        .expect(403);

      expect(response.body.success).toBe(false);
    });

    it('should fail to update team with invalid data', async () => {
      const updates = {
        name: ''
      };

      const response = await request(app)
        .put(`/api/teams/${testTeam._id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send(updates)
        .expect(400);

      expect(response.body.success).toBe(false);
    });
  });

  describe('DELETE /api/teams/:id', () => {
    beforeEach(async () => {
      testTeam = await Team.create({
        name: 'Test Team',
        description: 'Test description',
        owner: adminUser._id,
        members: [{ user: adminUser._id, role: 'owner' }]
      });
    });

    it('should delete team as owner', async () => {
      const response = await request(app)
        .delete(`/api/teams/${testTeam._id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('deleted');

      const deletedTeam = await Team.findById(testTeam._id);
      expect(deletedTeam).toBeNull();
    });

    it('should fail to delete team as non-owner', async () => {
      await Team.findByIdAndUpdate(testTeam._id, {
        $push: { members: { user: memberUser._id, role: 'member' } }
      });

      const response = await request(app)
        .delete(`/api/teams/${testTeam._id}`)
        .set('Authorization', `Bearer ${memberToken}`)
        .expect(403);

      expect(response.body.success).toBe(false);
    });

    it('should delete associated projects when team is deleted', async () => {
      const project = await Project.create({
        name: 'Test Project',
        description: 'Test description',
        team: testTeam._id,
        createdBy: adminUser._id
      });

      await request(app)
        .delete(`/api/teams/${testTeam._id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      const deletedProject = await Project.findById(project._id);
      expect(deletedProject).toBeNull();
    });
  });

  describe('POST /api/teams/:id/members', () => {
    beforeEach(async () => {
      testTeam = await Team.create({
        name: 'Test Team',
        description: 'Test description',
        owner: adminUser._id,
        members: [{ user: adminUser._id, role: 'owner' }]
      });
    });

    it('should add member to team as owner', async () => {
      const memberData = {
        userId: memberUser._id.toString(),
        role: 'member'
      };

      const response = await request(app)
        .post(`/api/teams/${testTeam._id}/members`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send(memberData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.members).toHaveLength(2);
      expect(response.body.data.members.some(m => m.user.toString() === memberUser._id.toString())).toBe(true);
    });

    it('should fail to add member as non-owner', async () => {
      await Team.findByIdAndUpdate(testTeam._id, {
        $push: { members: { user: managerUser._id, role: 'member' } }
      });

      const memberData = {
        userId: memberUser._id.toString(),
        role: 'member'
      };

      const response = await request(app)
        .post(`/api/teams/${testTeam._id}/members`)
        .set('Authorization', `Bearer ${managerToken}`)
        .send(memberData)
        .expect(403);

      expect(response.body.success).toBe(false);
    });

    it('should fail to add existing member', async () => {
      await Team.findByIdAndUpdate(testTeam._id, {
        $push: { members: { user: memberUser._id, role: 'member' } }
      });

      const memberData = {
        userId: memberUser._id.toString(),
        role: 'member'
      };

      const response = await request(app)
        .post(`/api/teams/${testTeam._id}/members`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send(memberData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('already a member');
    });

    it('should fail to add member with invalid user ID', async () => {
      const memberData = {
        userId: new mongoose.Types.ObjectId().toString(),
        role: 'member'
      };

      const response = await request(app)
        .post(`/api/teams/${testTeam._id}/members`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send(memberData)
        .expect(404);

      expect(response.body.success).toBe(false);
    });
  });

  describe('PUT /api/teams/:id/members/:userId', () => {
    beforeEach(async () => {
      testTeam = await Team.create({
        name: 'Test Team',
        description: 'Test description',
        owner
