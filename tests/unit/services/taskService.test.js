// File: tests/unit/services/taskService.test.js
// Generated: 2025-10-08 13:18:54 UTC
// Project ID: proj_08e725d164ac
// Task ID: task_kf9a66ym906t


const Project = require('../../../src/models/Project');


const Task = require('../../../src/models/Task');


const User = require('../../../src/models/User');


const logger = require('../../../src/utils/logger');


const taskService = require('../../../src/services/taskService');

// Mock dependencies
jest.mock('../../../src/models/Task');
jest.mock('../../../src/models/Project');
jest.mock('../../../src/models/User');
jest.mock('../../../src/utils/logger');

describe('TaskService', () => {
  let mockUserId;
  let mockProjectId;
  let mockTaskId;
  let mockTask;
  let mockProject;
  let mockUser;

  beforeEach(() => {
    jest.clearAllMocks();

    mockUserId = '507f1f77bcf86cd799439011';
    mockProjectId = '507f1f77bcf86cd799439012';
    mockTaskId = '507f1f77bcf86cd799439013';

    mockUser = {
      _id: mockUserId,
      name: 'Test User',
      email: 'test@example.com',
      role: 'member'
    };

    mockProject = {
      _id: mockProjectId,
      name: 'Test Project',
      team: '507f1f77bcf86cd799439014',
      members: [
        { user: mockUserId, role: 'member' }
      ],
      save: jest.fn().mockResolvedValue(true)
    };

    mockTask = {
      _id: mockTaskId,
      title: 'Test Task',
      description: 'Test Description',
      project: mockProjectId,
      assignedTo: mockUserId,
      status: 'todo',
      priority: 'medium',
      dueDate: new Date('2024-12-31'),
      createdBy: mockUserId,
      save: jest.fn().mockResolvedValue(true),
      toObject: jest.fn().mockReturnThis()
    };
  });

  describe('createTask', () => {
    it('should create a task successfully', async () => {
      const taskData = {
        title: 'New Task',
        description: 'Task Description',
        project: mockProjectId,
        assignedTo: mockUserId,
        priority: 'high',
        dueDate: new Date('2024-12-31')
      };

      Project.findById = jest.fn().mockResolvedValue(mockProject);
      User.findById = jest.fn().mockResolvedValue(mockUser);
      Task.prototype.save = jest.fn().mockResolvedValue(mockTask);
      Task.findById = jest.fn().mockReturnValue({
        populate: jest.fn().mockReturnValue({
          populate: jest.fn().mockReturnValue({
            populate: jest.fn().mockResolvedValue(mockTask)
          })
        })
      });

      const result = await taskService.createTask(taskData, mockUserId);

      expect(Project.findById).toHaveBeenCalledWith(mockProjectId);
      expect(User.findById).toHaveBeenCalledWith(mockUserId);
      expect(result).toBeDefined();
      expect(logger.info).toHaveBeenCalledWith('Task created successfully', expect.any(Object));
    });

    it('should throw error if project not found', async () => {
      const taskData = {
        title: 'New Task',
        project: mockProjectId
      };

      Project.findById = jest.fn().mockResolvedValue(null);

      await expect(taskService.createTask(taskData, mockUserId))
        .rejects
        .toThrow('Project not found');

      expect(logger.error).toHaveBeenCalled();
    });

    it('should throw error if user not authorized for project', async () => {
      const taskData = {
        title: 'New Task',
        project: mockProjectId
      };

      const unauthorizedProject = {
        ...mockProject,
        members: []
      };

      Project.findById = jest.fn().mockResolvedValue(unauthorizedProject);

      await expect(taskService.createTask(taskData, mockUserId))
        .rejects
        .toThrow('Not authorized to create tasks in this project');

      expect(logger.error).toHaveBeenCalled();
    });

    it('should throw error if assigned user not found', async () => {
      const taskData = {
        title: 'New Task',
        project: mockProjectId,
        assignedTo: 'invalidUserId'
      };

      Project.findById = jest.fn().mockResolvedValue(mockProject);
      User.findById = jest.fn().mockResolvedValue(null);

      await expect(taskService.createTask(taskData, mockUserId))
        .rejects
        .toThrow('Assigned user not found');

      expect(logger.error).toHaveBeenCalled();
    });
  });

  describe('getTaskById', () => {
    it('should get task by id successfully', async () => {
      Task.findById = jest.fn().mockReturnValue({
        populate: jest.fn().mockReturnValue({
          populate: jest.fn().mockReturnValue({
            populate: jest.fn().mockResolvedValue(mockTask)
          })
        })
      });

      Project.findById = jest.fn().mockResolvedValue(mockProject);

      const result = await taskService.getTaskById(mockTaskId, mockUserId);

      expect(Task.findById).toHaveBeenCalledWith(mockTaskId);
      expect(result).toEqual(mockTask);
      expect(logger.info).toHaveBeenCalledWith('Task retrieved successfully', expect.any(Object));
    });

    it('should throw error if task not found', async () => {
      Task.findById = jest.fn().mockReturnValue({
        populate: jest.fn().mockReturnValue({
          populate: jest.fn().mockReturnValue({
            populate: jest.fn().mockResolvedValue(null)
          })
        })
      });

      await expect(taskService.getTaskById(mockTaskId, mockUserId))
        .rejects
        .toThrow('Task not found');

      expect(logger.error).toHaveBeenCalled();
    });

    it('should throw error if user not authorized to view task', async () => {
      Task.findById = jest.fn().mockReturnValue({
        populate: jest.fn().mockReturnValue({
          populate: jest.fn().mockReturnValue({
            populate: jest.fn().mockResolvedValue(mockTask)
          })
        })
      });

      const unauthorizedProject = {
        ...mockProject,
        members: []
      };

      Project.findById = jest.fn().mockResolvedValue(unauthorizedProject);

      await expect(taskService.getTaskById(mockTaskId, mockUserId))
        .rejects
        .toThrow('Not authorized to view this task');

      expect(logger.error).toHaveBeenCalled();
    });
  });

  describe('updateTask', () => {
    it('should update task successfully', async () => {
      const updates = {
        title: 'Updated Task',
        status: 'in_progress'
      };

      Task.findById = jest.fn().mockResolvedValue(mockTask);
      Project.findById = jest.fn().mockResolvedValue(mockProject);
      Task.findById = jest.fn().mockReturnValue({
        populate: jest.fn().mockReturnValue({
          populate: jest.fn().mockReturnValue({
            populate: jest.fn().mockResolvedValue({ ...mockTask, ...updates })
          })
        })
      });

      const result = await taskService.updateTask(mockTaskId, updates, mockUserId);

      expect(mockTask.save).toHaveBeenCalled();
      expect(logger.info).toHaveBeenCalledWith('Task updated successfully', expect.any(Object));
    });

    it('should throw error if task not found', async () => {
      const updates = { title: 'Updated Task' };

      Task.findById = jest.fn().mockResolvedValue(null);

      await expect(taskService.updateTask(mockTaskId, updates, mockUserId))
        .rejects
        .toThrow('Task not found');

      expect(logger.error).toHaveBeenCalled();
    });

    it('should throw error if user not authorized to update task', async () => {
      const updates = { title: 'Updated Task' };

      Task.findById = jest.fn().mockResolvedValue(mockTask);

      const unauthorizedProject = {
        ...mockProject,
        members: []
      };

      Project.findById = jest.fn().mockResolvedValue(unauthorizedProject);

      await expect(taskService.updateTask(mockTaskId, updates, mockUserId))
        .rejects
        .toThrow('Not authorized to update this task');

      expect(logger.error).toHaveBeenCalled();
    });

    it('should validate assigned user if assignedTo is updated', async () => {
      const updates = {
        assignedTo: 'newUserId'
      };

      Task.findById = jest.fn().mockResolvedValue(mockTask);
      Project.findById = jest.fn().mockResolvedValue(mockProject);
      User.findById = jest.fn().mockResolvedValue(null);

      await expect(taskService.updateTask(mockTaskId, updates, mockUserId))
        .rejects
        .toThrow('Assigned user not found');

      expect(logger.error).toHaveBeenCalled();
    });
  });

  describe('deleteTask', () => {
    it('should delete task successfully', async () => {
      Task.findById = jest.fn().mockResolvedValue(mockTask);
      Project.findById = jest.fn().mockResolvedValue(mockProject);
      Task.findByIdAndDelete = jest.fn().mockResolvedValue(mockTask);

      await taskService.deleteTask(mockTaskId, mockUserId);

      expect(Task.findByIdAndDelete).toHaveBeenCalledWith(mockTaskId);
      expect(logger.info).toHaveBeenCalledWith('Task deleted successfully', expect.any(Object));
    });

    it('should throw error if task not found', async () => {
      Task.findById = jest.fn().mockResolvedValue(null);

      await expect(taskService.deleteTask(mockTaskId, mockUserId))
        .rejects
        .toThrow('Task not found');

      expect(logger.error).toHaveBeenCalled();
    });

    it('should throw error if user not authorized to delete task', async () => {
      Task.findById = jest.fn().mockResolvedValue(mockTask);

      const unauthorizedProject = {
        ...mockProject,
        members: [{ user: 'differentUserId', role: 'member' }]
      };

      Project.findById = jest.fn().mockResolvedValue(unauthorizedProject);

      await expect(taskService.deleteTask(mockTaskId, mockUserId))
        .rejects
        .toThrow('Not authorized to delete this task');

      expect(logger.error).toHaveBeenCalled();
    });
  });

  describe('getProjectTasks', () => {
    it('should get all tasks for a project', async () => {
      const mockTasks = [mockTask, { ...mockTask, _id: 'anotherTaskId' }];

      Project.findById = jest.fn().mockResolvedValue(mockProject);
      Task.find = jest.fn().mockReturnValue({
        populate: jest.fn().mockReturnValue({
          populate: jest.fn().mockReturnValue({
            sort: jest.fn().mockResolvedValue(mockTasks)
          })
        })
      });

      const result = await taskService.getProjectTasks(mockProjectId, mockUserId);

      expect(Project.findById).toHaveBeenCalledWith(mockProjectId);
      expect(Task.find).toHaveBeenCalledWith({ project: mockProjectId });
      expect(result).toEqual(mockTasks);
      expect(logger.info).toHaveBeenCalledWith('Project tasks retrieved successfully', expect.any(Object));
    });

    it('should throw error if project not found', async () => {
      Project.findById = jest.fn().mockResolvedValue(null);

      await expect(taskService.getProjectTasks(mockProjectId, mockUserId))
        .rejects
        .toThrow('Project not found');

      expect(logger.error).toHaveBeenCalled();
    });

    it('should throw error if user not authorized to view project tasks', async () => {
      const unauthorizedProject = {
        ...mockProject,
        members: []
      };

      Project.findById = jest.fn().mockResolvedValue(unauthorizedProject);

      await expect(taskService.getProjectTasks(mockProjectId, mockUserId))
        .rejects
        .toThrow('Not authorized to view tasks in this project');

      expect(logger.error).toHaveBeenCalled();
    });

    it('should filter tasks by status if provided', async () => {
      const mockTasks = [mockTask];

      Project.findById = jest.fn().mockResolvedValue(mockProject);
      Task.find = jest.fn().mockReturnValue({
        populate: jest.fn().mockReturnValue({
          populate: jest.fn().mockReturnValue({
            sort: jest.fn().mockResolvedValue(mockTasks)
          })
        })
      });

      const filters = { status: 'in_progress' };
      await taskService.getProjectTasks(mockProjectId, mockUserId, filters);

      expect(Task.find).toHaveBeenCalledWith({
        project: mockProjectId,
        status: 'in_progress'
      });
    });

    it('should filter tasks by assignedTo if provided', async () => {
      const mockTasks = [mockTask];

      Project.findById = jest.fn().mockResolvedValue(mockProject);
      Task.find = jest.fn().mockReturnValue({
        populate: jest.fn().mockReturnValue({
          populate: jest.fn().mockReturnValue({
            sort: jest.fn().mockResolvedValue(mockTasks)
          })
        })
      });

      const filters = { assignedTo: mockUserId };
      await taskService.getProjectTasks(mockProjectId, mockUserId, filters);

      expect(Task.find).toHaveBeenCalledWith({
        project: mockProjectId,
        assignedTo: mockUserId
      });
    });

    it('should filter tasks by priority if provided', async () => {
      const mockTasks = [mockTask];

      Project.findById = jest.fn().mockResolvedValue(mockProject);
      Task.find = jest.fn().mockReturnValue({
        populate: jest.fn().mockReturnValue({
          populate: jest.fn().mockReturnValue({
            sort: jest.fn().mockResolvedValue(mockTasks)
          })
        })
      });

      const filters = { priority: 'high' };
      await taskService.getProjectTasks(mockProjectId, mockUserId, filters);

      expect(Task.find).toHaveBeenCalledWith({
        project: mockProjectId,
        priority: 'high'
      });
    });
  });

  describe('assignTask', () => {
    it('should assign task to user successfully', async () => {
      Task.findById = jest.fn().mockResolvedValue(mockTask);
      Project.findById = jest.fn().mockResolvedValue(mockProject);
      User.findById = jest.fn().mockResolvedValue(mockUser);
      Task.findById = jest.fn().mockReturnValue({
        populate: jest.fn().mockReturnValue({
          populate: jest.fn().mockReturnValue({
            populate: jest.fn().mockResolvedValue(mockTask)
          })
        })
      });

      const newAssigneeId = '507f1f77bcf86cd799439015';
      const result = await taskService.assignTask(mockTaskId, newAssigneeId, mockUserId);

      expect(mockTask.save).toHaveBe
