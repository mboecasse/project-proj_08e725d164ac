// File: tests/integration/tasks.test.js
// Generated: 2025-10-08 13:17:44 UTC
// Project ID: proj_08e725d164ac
// Task ID: task_95bruv7upo9c


const Project = require('../../src/models/Project');


const Task = require('../../src/models/Task');


const Team = require('../../src/models/Team');


const User = require('../../src/models/User');


const app = require('../../src/server');


const jwt = require('jsonwebtoken');


const mongoose = require('mongoose');


const request = require('supertest');


let authToken;

let testUser;

let testTeam;

let testProject;

let testTask;

/**
 * Generate JWT token for testing
 */


const generateToken = (userId) => {
  return jwt.sign(
    { userId },
    process.env.JWT_ACCESS_SECRET || 'test_secret',
    { expiresIn: '1h' }
  );
};

/**
 * Setup test database and test data
 */
beforeAll(async () => {
  // Connect to test database
  const mongoUri = process.env.MONGODB_TEST_URI || 'mongodb://localhost:27017/task_management_test';
  await mongoose.connect(mongoUri, {
    useNewUrlParser: true,
    useUnifiedTopology: true
  });

  // Create test user
  testUser = await User.create({
    name: 'Test User',
    email: 'testuser@example.com',
    password: 'Password123!',
    role: 'manager'
  });

  authToken = generateToken(testUser._id);

  // Create test team
  testTeam = await Team.create({
    name: 'Test Team',
    description: 'Team for integration testing',
    owner: testUser._id,
    members: [{ user: testUser._id, role: 'manager' }]
  });

  // Create test project
  testProject = await Project.create({
    name: 'Test Project',
    description: 'Project for integration testing',
    team: testTeam._id,
    owner: testUser._id,
    status: 'active'
  });

  // Create test task
  testTask = await Task.create({
    title: 'Test Task',
    description: 'Task for integration testing',
    project: testProject._id,
    assignedTo: testUser._id,
    createdBy: testUser._id,
    status: 'todo',
    priority: 'medium'
  });
});

/**
 * Clean up test data
 */
afterAll(async () => {
  await Task.deleteMany({});
  await Project.deleteMany({});
  await Team.deleteMany({});
  await User.deleteMany({});
  await mongoose.connection.close();
});

/**
 * Clear tasks between tests
 */
beforeEach(async () => {
  await Task.deleteMany({ _id: { $ne: testTask._id } });
});

describe('Task Integration Tests', () => {
  describe('POST /api/tasks', () => {
    it('should create a new task with valid data', async () => {
      const taskData = {
        title: 'New Task',
        description: 'New task description',
        project: testProject._id.toString(),
        assignedTo: testUser._id.toString(),
        status: 'todo',
        priority: 'high',
        dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
      };

      const response = await request(app)
        .post('/api/tasks')
        .set('Authorization', `Bearer ${authToken}`)
        .send(taskData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('_id');
      expect(response.body.data.title).toBe(taskData.title);
      expect(response.body.data.description).toBe(taskData.description);
      expect(response.body.data.status).toBe(taskData.status);
      expect(response.body.data.priority).toBe(taskData.priority);
    });

    it('should return 400 if required fields are missing', async () => {
      const invalidData = {
        description: 'Task without title'
      };

      const response = await request(app)
        .post('/api/tasks')
        .set('Authorization', `Bearer ${authToken}`)
        .send(invalidData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBeDefined();
    });

    it('should return 401 if no authentication token provided', async () => {
      const taskData = {
        title: 'Unauthorized Task',
        project: testProject._id.toString()
      };

      await request(app)
        .post('/api/tasks')
        .send(taskData)
        .expect(401);
    });

    it('should create task with subtasks', async () => {
      const taskData = {
        title: 'Task with Subtasks',
        description: 'Parent task',
        project: testProject._id.toString(),
        subtasks: [
          { title: 'Subtask 1', completed: false },
          { title: 'Subtask 2', completed: false }
        ]
      };

      const response = await request(app)
        .post('/api/tasks')
        .set('Authorization', `Bearer ${authToken}`)
        .send(taskData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.subtasks).toHaveLength(2);
      expect(response.body.data.subtasks[0].title).toBe('Subtask 1');
    });
  });

  describe('GET /api/tasks', () => {
    it('should get all tasks', async () => {
      const response = await request(app)
        .get('/api/tasks')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.data.length).toBeGreaterThan(0);
    });

    it('should filter tasks by status', async () => {
      await Task.create({
        title: 'In Progress Task',
        project: testProject._id,
        createdBy: testUser._id,
        status: 'in_progress'
      });

      const response = await request(app)
        .get('/api/tasks?status=in_progress')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.every(task => task.status === 'in_progress')).toBe(true);
    });

    it('should filter tasks by priority', async () => {
      await Task.create({
        title: 'High Priority Task',
        project: testProject._id,
        createdBy: testUser._id,
        priority: 'high'
      });

      const response = await request(app)
        .get('/api/tasks?priority=high')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.every(task => task.priority === 'high')).toBe(true);
    });

    it('should filter tasks by project', async () => {
      const response = await request(app)
        .get(`/api/tasks?project=${testProject._id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.every(task => task.project.toString() === testProject._id.toString())).toBe(true);
    });

    it('should filter tasks by assignee', async () => {
      const response = await request(app)
        .get(`/api/tasks?assignedTo=${testUser._id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.every(task => task.assignedTo && task.assignedTo.toString() === testUser._id.toString())).toBe(true);
    });

    it('should support pagination', async () => {
      // Create multiple tasks
      for (let i = 0; i < 15; i++) {
        await Task.create({
          title: `Task ${i}`,
          project: testProject._id,
          createdBy: testUser._id
        });
      }

      const response = await request(app)
        .get('/api/tasks?page=1&limit=10')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.length).toBeLessThanOrEqual(10);
      expect(response.body.pagination).toBeDefined();
    });
  });

  describe('GET /api/tasks/:id', () => {
    it('should get task by ID', async () => {
      const response = await request(app)
        .get(`/api/tasks/${testTask._id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data._id).toBe(testTask._id.toString());
      expect(response.body.data.title).toBe(testTask.title);
    });

    it('should return 404 for non-existent task', async () => {
      const fakeId = new mongoose.Types.ObjectId();

      const response = await request(app)
        .get(`/api/tasks/${fakeId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBeDefined();
    });

    it('should return 400 for invalid task ID', async () => {
      await request(app)
        .get('/api/tasks/invalid-id')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(400);
    });
  });

  describe('PUT /api/tasks/:id', () => {
    it('should update task with valid data', async () => {
      const updates = {
        title: 'Updated Task Title',
        description: 'Updated description',
        status: 'in_progress',
        priority: 'high'
      };

      const response = await request(app)
        .put(`/api/tasks/${testTask._id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(updates)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.title).toBe(updates.title);
      expect(response.body.data.description).toBe(updates.description);
      expect(response.body.data.status).toBe(updates.status);
      expect(response.body.data.priority).toBe(updates.priority);
    });

    it('should update task status', async () => {
      const response = await request(app)
        .put(`/api/tasks/${testTask._id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ status: 'completed' })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.status).toBe('completed');
      expect(response.body.data.completedAt).toBeDefined();
    });

    it('should update task assignee', async () => {
      const newUser = await User.create({
        name: 'New Assignee',
        email: 'newassignee@example.com',
        password: 'Password123!'
      });

      const response = await request(app)
        .put(`/api/tasks/${testTask._id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ assignedTo: newUser._id.toString() })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.assignedTo.toString()).toBe(newUser._id.toString());

      await User.findByIdAndDelete(newUser._id);
    });

    it('should return 404 for non-existent task', async () => {
      const fakeId = new mongoose.Types.ObjectId();

      const response = await request(app)
        .put(`/api/tasks/${fakeId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ title: 'Updated' })
        .expect(404);

      expect(response.body.success).toBe(false);
    });

    it('should update subtasks', async () => {
      const taskWithSubtasks = await Task.create({
        title: 'Task with Subtasks',
        project: testProject._id,
        createdBy: testUser._id,
        subtasks: [
          { title: 'Subtask 1', completed: false }
        ]
      });

      const response = await request(app)
        .put(`/api/tasks/${taskWithSubtasks._id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          subtasks: [
            { title: 'Subtask 1', completed: true },
            { title: 'Subtask 2', completed: false }
          ]
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.subtasks).toHaveLength(2);
      expect(response.body.data.subtasks[0].completed).toBe(true);
    });
  });

  describe('DELETE /api/tasks/:id', () => {
    it('should delete task', async () => {
      const taskToDelete = await Task.create({
        title: 'Task to Delete',
        project: testProject._id,
        createdBy: testUser._id
      });

      const response = await request(app)
        .delete(`/api/tasks/${taskToDelete._id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBeDefined();

      const deletedTask = await Task.findById(taskToDelete._id);
      expect(deletedTask).toBeNull();
    });

    it('should return 404 for non-existent task', async () => {
      const fakeId = new mongoose.Types.ObjectId();

      const response = await request(app)
        .delete(`/api/tasks/${fakeId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);

      expect(response.body.success).toBe(false);
    });
  });

  describe('POST /api/tasks/:id/assign', () => {
    it('should assign task to user', async () => {
      const newUser = await User.create({
        name: 'Assignee User',
        email: 'assignee@example.com',
        password: 'Password123!'
      });

      const response = await request(app)
        .post(`/api/tasks/${testTask._id}/assign`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ userId: newUser._id.toString() })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.assignedTo.toString()).toBe(newUser._id.toString());

      await User.findByIdAndDelete(newUser._id);
    });

    it('should unassign task when userId is null', async () => {
      const response = await request(app)
        .post(`/api/tasks/${testTask._id}/assign`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ userId: null })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.assignedTo).toBeNull();
    });

    it('should return 400
