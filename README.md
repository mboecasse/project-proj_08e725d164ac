genesis-task-management/
├── src/
│   ├── config/                    # Configuration files
│   │   ├── constants.js          # Application constants and enums
│   │   ├── database.js           # MongoDB connection setup
│   │   ├── email.js              # Nodemailer configuration
│   │   ├── jwt.js                # JWT signing and verification
│   │   ├── redis.js              # Redis client configuration
│   │   ├── s3.js                 # AWS S3 client setup
│   │   └── socket.js             # Socket.io configuration
│   │
│   ├── controllers/               # Request handlers
│   │   ├── activityController.js # Activity log endpoints
│   │   ├── attachmentController.js # File upload/download
│   │   ├── authController.js     # Login, register, refresh tokens
│   │   ├── commentController.js  # Comment CRUD operations
│   │   ├── notificationController.js # Notification management
│   │   ├── projectController.js  # Project CRUD and settings
│   │   ├── taskController.js     # Task CRUD, assignments, status
│   │   ├── teamController.js     # Team management and invitations
│   │   └── userController.js     # User profile and preferences
│   │
│   ├── middleware/                # Express middleware
│   │   ├── activityLogger.js     # Activity tracking middleware
│   │   ├── auth.js               # JWT authentication
│   │   ├── errorHandler.js       # Global error handling
│   │   ├── pagination.js         # Query pagination helper
│   │   ├── rateLimit.js          # Rate limiting rules
│   │   ├── rbac.js               # Role-based access control
│   │   ├── security.js           # Security headers (helmet)
│   │   ├── socketAuth.js         # WebSocket authentication
│   │   ├── upload.js             # Multer file upload
│   │   └── validation.js         # Request validation schemas
│   │
│   ├── models/                    # Mongoose schemas
│   │   ├── Activity.js           # Activity log schema
│   │   ├── Attachment.js         # File attachment metadata
│   │   ├── Comment.js            # Comment schema
│   │   ├── Invitation.js         # Team invitation tokens
│   │   ├── Notification.js       # Notification schema
│   │   ├── Project.js            # Project schema
│   │   ├── RefreshToken.js       # Refresh token storage
│   │   ├── Task.js               # Task with subtasks
│   │   ├── Team.js               # Team with members
│   │   └── User.js               # User with authentication
│   │
│   ├── routes/                    # API route definitions
│   │   ├── activityRoutes.js     # /api/activities
│   │   ├── attachmentRoutes.js   # /api/attachments
│   │   ├── authRoutes.js         # /api/auth
│   │   ├── commentRoutes.js      # /api/comments
│   │   ├── notificationRoutes.js # /api/notifications
│   │   ├── projectRoutes.js      # /api/projects
│   │   ├── taskRoutes.js         # /api/tasks
│   │   ├── teamRoutes.js         # /api/teams
│   │   ├── userRoutes.js         # /api/users
│   │   └── index.js              # Route aggregator
│   │
│   ├── services/                  # Business logic layer
│   │   ├── authService.js        # Authentication logic
│   │   ├── emailService.js       # Email sending
│   │   ├── notificationService.js # Notification delivery
│   │   ├── projectService.js     # Project business logic
│   │   ├── taskService.js        # Task business logic
│   │   └── teamService.js        # Team management logic
│   │
│   ├── jobs/                      # Background job processors
│   │   ├── cleanupJob.js         # Expired token cleanup
│   │   ├── digestEmailJob.js     # Daily digest emails
│   │   ├── emailQueue.js         # Email queue processor
│   │   └── notificationQueue.js  # Notification queue processor
│   │
│   ├── utils/                     # Utility functions
│   │   ├── logger.js             # Winston logger setup
│   │   └── validators.js         # Custom validation functions
│   │
│   ├── scripts/                   # Database scripts
│   │   ├── migrate.js            # Database migrations
│   │   └── seed.js               # Seed data generator
│   │
│   ├── app.js                     # Express app configuration
│   └── server.js                  # Server entry point
│
├── tests/                         # Test suites
│   ├── integration/               # API integration tests
│   │   ├── auth.test.js
│   │   ├── tasks.test.js
│   │   └── teams.test.js
│   ├── unit/                      # Unit tests
│   │   └── services/
│   │       ├── authService.test.js
│   │       └── taskService.test.js
│   └── setup.js                   # Test environment setup
│
├── docs/                          # Documentation
│   ├── API.md                     # API endpoint documentation
│   ├── ARCHITECTURE.md            # System architecture
│   └── DEPLOYMENT.md              # Deployment guide
│
├── .env.example                   # Environment template
├── .eslintrc.json                 # ESLint configuration
├── .prettierrc                    # Prettier configuration
├── .gitignore                     # Git ignore rules
├── Dockerfile                     # Container definition
├── docker-compose.yml             # Multi-container setup
├── package.json                   # Dependencies and scripts
└── README.md                      # This file
