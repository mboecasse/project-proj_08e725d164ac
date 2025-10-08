// File: scripts/seed.js
// Generated: 2025-10-08 13:15:41 UTC
// Project ID: proj_08e725d164ac
// Task ID: task_id4kgjz93brw


const Project = require('../src/models/Project');


const Task = require('../src/models/Task');


const Team = require('../src/models/Team');


const User = require('../src/models/User');


const bcrypt = require('bcryptjs');


const dotenv = require('dotenv');


const mongoose = require('mongoose');


const path = require('path');

// Load environment variables
dotenv.config({ path: path.join(__dirname, '..', '.env') });

// Import models

/**
 * Connect to MongoDB
 */


const connectDB = async () => {
  try {
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/taskmanager';
    await mongoose.connect(mongoUri, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    console.log('✓ MongoDB connected successfully');
  } catch (error) {
    console.error('✗ MongoDB connection failed:', error.message);
    process.exit(1);
  }
};

/**
 * Clear existing data
 */


const clearData = async () => {
  try {
    await User.deleteMany({});
    await Team.deleteMany({});
    await Project.deleteMany({});
    await Task.deleteMany({});
    console.log('✓ Existing data cleared');
  } catch (error) {
    console.error('✗ Failed to clear data:', error.message);
    throw error;
  }
};

/**
 * Create sample users
 */


const createUsers = async () => {
  try {
    const hashedPassword = await bcrypt.hash('Password123!', 12);

    const users = await User.insertMany([
      {
        name: 'Admin User',
        email: 'admin@taskmanager.com',
        password: hashedPassword,
        role: 'admin',
        isEmailVerified: true,
        avatar: 'https://i.pravatar.cc/150?img=1'
      },
      {
        name: 'John Manager',
        email: 'john.manager@taskmanager.com',
        password: hashedPassword,
        role: 'manager',
        isEmailVerified: true,
        avatar: 'https://i.pravatar.cc/150?img=2'
      },
      {
        name: 'Sarah Developer',
        email: 'sarah.dev@taskmanager.com',
        password: hashedPassword,
        role: 'member',
        isEmailVerified: true,
        avatar: 'https://i.pravatar.cc/150?img=3'
      },
      {
        name: 'Mike Designer',
        email: 'mike.design@taskmanager.com',
        password: hashedPassword,
        role: 'member',
        isEmailVerified: true,
        avatar: 'https://i.pravatar.cc/150?img=4'
      },
      {
        name: 'Emily QA',
        email: 'emily.qa@taskmanager.com',
        password: hashedPassword,
        role: 'member',
        isEmailVerified: true,
        avatar: 'https://i.pravatar.cc/150?img=5'
      },
      {
        name: 'David Product',
        email: 'david.product@taskmanager.com',
        password: hashedPassword,
        role: 'manager',
        isEmailVerified: true,
        avatar: 'https://i.pravatar.cc/150?img=6'
      }
    ]);

    console.log(`✓ Created ${users.length} users`);
    return users;
  } catch (error) {
    console.error('✗ Failed to create users:', error.message);
    throw error;
  }
};

/**
 * Create sample teams
 */


const createTeams = async (users) => {
  try {
    const [admin, johnManager, sarah, mike, emily, david] = users;

    const teams = await Team.insertMany([
      {
        name: 'Engineering Team',
        description: 'Core product development team',
        owner: johnManager._id,
        members: [
          { user: johnManager._id, role: 'admin', joinedAt: new Date() },
          { user: sarah._id, role: 'member', joinedAt: new Date() },
          { user: mike._id, role: 'member', joinedAt: new Date() }
        ],
        settings: {
          isPublic: false,
          allowMemberInvite: true,
          requireApproval: true
        }
      },
      {
        name: 'Product Team',
        description: 'Product management and strategy',
        owner: david._id,
        members: [
          { user: david._id, role: 'admin', joinedAt: new Date() },
          { user: emily._id, role: 'member', joinedAt: new Date() },
          { user: johnManager._id, role: 'member', joinedAt: new Date() }
        ],
        settings: {
          isPublic: false,
          allowMemberInvite: true,
          requireApproval: false
        }
      },
      {
        name: 'Design Team',
        description: 'UI/UX and visual design',
        owner: mike._id,
        members: [
          { user: mike._id, role: 'admin', joinedAt: new Date() },
          { user: sarah._id, role: 'member', joinedAt: new Date() }
        ],
        settings: {
          isPublic: true,
          allowMemberInvite: true,
          requireApproval: false
        }
      }
    ]);

    console.log(`✓ Created ${teams.length} teams`);
    return teams;
  } catch (error) {
    console.error('✗ Failed to create teams:', error.message);
    throw error;
  }
};

/**
 * Create sample projects
 */


const createProjects = async (teams, users) => {
  try {
    const [engineeringTeam, productTeam, designTeam] = teams;
    const [admin, johnManager, sarah, mike, emily, david] = users;

    const projects = await Project.insertMany([
      {
        name: 'Mobile App Redesign',
        description: 'Complete redesign of mobile application with new features',
        team: engineeringTeam._id,
        owner: johnManager._id,
        status: 'active',
        priority: 'high',
        startDate: new Date('2024-01-01'),
        endDate: new Date('2024-06-30'),
        members: [
          { user: johnManager._id, role: 'manager' },
          { user: sarah._id, role: 'member' },
          { user: mike._id, role: 'member' }
        ],
        settings: {
          isPublic: false,
          allowComments: true,
          allowAttachments: true
        }
      },
      {
        name: 'API v2 Development',
        description: 'Build next generation REST API with GraphQL support',
        team: engineeringTeam._id,
        owner: sarah._id,
        status: 'active',
        priority: 'high',
        startDate: new Date('2024-02-01'),
        endDate: new Date('2024-08-31'),
        members: [
          { user: sarah._id, role: 'manager' },
          { user: johnManager._id, role: 'member' }
        ],
        settings: {
          isPublic: false,
          allowComments: true,
          allowAttachments: true
        }
      },
      {
        name: 'Marketing Website',
        description: 'New marketing website with blog and resources',
        team: designTeam._id,
        owner: mike._id,
        status: 'planning',
        priority: 'medium',
        startDate: new Date('2024-03-01'),
        endDate: new Date('2024-05-31'),
        members: [
          { user: mike._id, role: 'manager' },
          { user: sarah._id, role: 'member' }
        ],
        settings: {
          isPublic: true,
          allowComments: true,
          allowAttachments: true
        }
      },
      {
        name: 'Customer Portal',
        description: 'Self-service customer portal for account management',
        team: productTeam._id,
        owner: david._id,
        status: 'active',
        priority: 'high',
        startDate: new Date('2024-01-15'),
        endDate: new Date('2024-07-15'),
        members: [
          { user: david._id, role: 'manager' },
          { user: emily._id, role: 'member' },
          { user: johnManager._id, role: 'member' }
        ],
        settings: {
          isPublic: false,
          allowComments: true,
          allowAttachments: true
        }
      },
      {
        name: 'Performance Optimization',
        description: 'Improve application performance and reduce load times',
        team: engineeringTeam._id,
        owner: sarah._id,
        status: 'completed',
        priority: 'medium',
        startDate: new Date('2023-11-01'),
        endDate: new Date('2023-12-31'),
        members: [
          { user: sarah._id, role: 'manager' },
          { user: johnManager._id, role: 'member' }
        ],
        settings: {
          isPublic: false,
          allowComments: true,
          allowAttachments: true
        }
      }
    ]);

    console.log(`✓ Created ${projects.length} projects`);
    return projects;
  } catch (error) {
    console.error('✗ Failed to create projects:', error.message);
    throw error;
  }
};

/**
 * Create sample tasks
 */


const createTasks = async (projects, users) => {
  try {
    const [mobileProject, apiProject, marketingProject, portalProject, perfProject] = projects;
    const [admin, johnManager, sarah, mike, emily, david] = users;

    const tasks = await Task.insertMany([
      // Mobile App Redesign Tasks
      {
        title: 'Design new home screen',
        description: 'Create mockups for the new home screen layout',
        project: mobileProject._id,
        assignedTo: [mike._id],
        createdBy: johnManager._id,
        status: 'completed',
        priority: 'high',
        dueDate: new Date('2024-02-15'),
        tags: ['design', 'ui', 'mobile'],
        subtasks: [
          { title: 'Create wireframes', completed: true, completedAt: new Date('2024-01-20') },
          { title: 'Design high-fidelity mockups', completed: true, completedAt: new Date('2024-02-10') },
          { title: 'Get stakeholder approval', completed: true, completedAt: new Date('2024-02-14') }
        ]
      },
      {
        title: 'Implement authentication flow',
        description: 'Build new authentication system with OAuth support',
        project: mobileProject._id,
        assignedTo: [sarah._id],
        createdBy: johnManager._id,
        status: 'in_progress',
        priority: 'high',
        dueDate: new Date('2024-03-30'),
        tags: ['backend', 'security', 'auth'],
        subtasks: [
          { title: 'Setup OAuth providers', completed: true, completedAt: new Date('2024-02-20') },
          { title: 'Implement login screens', completed: true, completedAt: new Date('2024-03-05') },
          { title: 'Add biometric authentication', completed: false },
          { title: 'Write unit tests', completed: false }
        ]
      },
      {
        title: 'Optimize image loading',
        description: 'Implement lazy loading and caching for images',
        project: mobileProject._id,
        assignedTo: [sarah._id],
        createdBy: johnManager._id,
        status: 'todo',
        priority: 'medium',
        dueDate: new Date('2024-04-15'),
        tags: ['performance', 'mobile']
      },

      // API v2 Development Tasks
      {
        title: 'Design GraphQL schema',
        description: 'Define GraphQL types and resolvers for all entities',
        project: apiProject._id,
        assignedTo: [sarah._id],
        createdBy: sarah._id,
        status: 'completed',
        priority: 'high',
        dueDate: new Date('2024-03-01'),
        tags: ['backend', 'graphql', 'api'],
        subtasks: [
          { title: 'Define core types', completed: true, completedAt: new Date('2024-02-15') },
          { title: 'Create resolvers', completed: true, completedAt: new Date('2024-02-25') },
          { title: 'Add pagination support', completed: true, completedAt: new Date('2024-02-28') }
        ]
      },
      {
        title: 'Implement rate limiting',
        description: 'Add rate limiting middleware to prevent abuse',
        project: apiProject._id,
        assignedTo: [sarah._id],
        createdBy: johnManager._id,
        status: 'in_progress',
        priority: 'high',
        dueDate: new Date('2024-04-01'),
        tags: ['backend', 'security', 'api'],
        subtasks: [
          { title: 'Research rate limiting strategies', completed: true, completedAt: new Date('2024-03-10') },
          { title: 'Implement Redis-based limiter', completed: false },
          { title: 'Add monitoring and alerts', completed: false }
        ]
      },
      {
        title: 'Write API documentation',
        description: 'Create comprehensive API documentation with examples',
        project: apiProject._id,
        assignedTo: [johnManager._id],
        createdBy: sarah._id,
        status: 'todo',
        priority: 'medium',
        dueDate: new Date('2024-05-15'),
        tags: ['documentation', 'api']
      },

      // Marketing Website Tasks
      {
        title: 'Design landing page',
        description: 'Create hero section and feature highlights',
        project: marketingProject._id,
        assignedTo: [mike._id],
        createdBy: mike._id,
        status: 'in_progress',
        priority: 'high',
        dueDate: new Date('2024-04-01'),
        tags: ['design', 'marketing', 'web'],
        subtasks: [
          { title: 'Create hero section', completed: true, completedAt: new Date('2024-03-15') },
          { title: 'Design feature cards', completed: false },
          { title: 'Add testimonials section', completed: false }
        ]
      },
      {
        title: 'Setup blog infrastructure',
        description: 'Implement CMS and blog templates',
        project: marketingProject._id,
        assignedTo: [sarah._id],
        createdBy: mike._id,
        status: 'todo',
        priority: 'medium',
        dueDate: new Date('2024-04-30'),
        tags: ['backend', 'cms', 'blog']
      },

      // Customer Portal Tasks
      {
        title: 'Build account dashboard',
        description: 'Create main dashboard with account overview',
        project: portalProject._id,
        assignedTo: [emily._id],
        createdBy: david._id,
        status: 'in_progress',
        priority: 'high',
        dueDate: new Date('2024-04-15'),
        tags: ['frontend', 'dashboard', 'portal'],
        subt
