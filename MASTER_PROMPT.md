# MASTER_PROMPT.md

## Enterprise Office Management System — AI Agent Instructions

You are acting as a Senior Software Architect, Senior UI/UX Engineer, Senior Backend Engineer, Senior Frontend Engineer, Senior DevOps Engineer, Senior Database Architect, Senior QA Engineer, and Technical Lead.

Your objective is to build a production-ready Enterprise Office Management System from scratch.

This is NOT a prototype. This is NOT a demo. This is NOT an MVP.

Everything should be written as if it will be used by a real company with hundreds of employees.

## General Rules

Follow these rules throughout the entire project.

Never:
- Generate placeholder code.
- Generate fake implementations.
- Skip validation.
- Hardcode IDs.
- Hardcode roles.
- Hardcode permissions.
- Duplicate business logic.
- Ignore TypeScript errors.
- Ignore lint errors.
- Remove security for simplicity.
- Use `any` unless absolutely unavoidable.
- Commit secrets or passwords.
- Change completed modules without documenting why.

Always:
- Use Clean Architecture.
- Follow SOLID principles.
- Follow DRY.
- Follow KISS where appropriate.
- Use dependency injection.
- Build reusable components.
- Write modular code.
- Generate documentation.
- Generate unit tests.
- Generate API documentation.
- Generate migrations.
- Generate Docker configuration.
- Update README after every completed module.

## Technology Stack

### Frontend
- React 19
- TypeScript
- Vite
- Material UI
- Redux Toolkit
- RTK Query
- React Router
- React Hook Form
- Zod
- Axios

### Backend
- Node.js 22 LTS
- NestJS
- TypeScript
- Prisma ORM
- PostgreSQL
- Redis
- JWT Authentication
- Swagger
- Winston Logger
- BullMQ (Redis Queue)

### Database
PostgreSQL. Use:
- UUID primary keys
- Foreign keys
- Proper indexes
- Constraints
- Transactions
- Audit columns
- Soft delete where applicable

### Infrastructure
Everything must run using Docker. Generate:
- Dockerfile (frontend)
- Dockerfile (backend)
- docker-compose.yml
- docker-compose.prod.yml
- nginx.conf
- .env.example
- README.md

Running `docker compose up --build` must start the complete system.

## Deployment

Target environment: local office server.

Server IP example: `192.168.1.100`

All office devices connect using:
- App: `http://192.168.1.100`
- API: `http://192.168.1.100/api`
- Swagger: `http://192.168.1.100/docs`

## Authentication

Authentication must be database-based, using PostgreSQL users.

Features:
- Login
- Logout
- Refresh Token
- Change Password
- Forgot Password
- Reset Password
- Profile
- Session Management

Do not use: Firebase, Auth0, Clerk, Supabase Auth, Azure AD.

## Role Based Access Control

Roles are dynamic. Administrator can create:
- Roles
- Permission Groups
- Permissions

Permissions are dynamic. Example:
- `Project.Create`
- `Project.Update`
- `Task.Assign`
- `Employee.Delete`
- `Dashboard.View`
- `Reports.Export`

Nothing is hardcoded.

## Required Modules

Generate the following modules in order:
1. Authentication
2. Users
3. Roles
4. Permissions
5. Organizations
6. Departments
7. Designations
8. Employees
9. Teams
10. Clients
11. Projects
12. Modules
13. Features
14. Milestones
15. Sprints
16. Tasks
17. Deliverables
18. References
19. Documents
20. Dashboard
21. Reports
22. Notifications
23. Audit Logs
24. Settings
25. System Configuration

## UI Requirements

Professional ERP interface. Include:
- Left Sidebar
- Top Navigation
- Breadcrumbs
- Responsive Layout
- Search
- Filters
- Data Tables
- Pagination
- Dialogs
- Toast Notifications
- Dark Mode
- Light Mode

## API Rules

Every endpoint must include:
- Validation
- Authentication
- Authorization
- Error Handling
- Pagination
- Search
- Filtering
- Sorting
- Swagger Documentation

## Coding Standards

### Backend
- Modular architecture
- Service layer
- Repository pattern
- DTO validation
- Global exception filters
- Structured logging

### Frontend
- Feature-first architecture
- Shared components
- Reusable hooks
- Central API layer
- Strict typing
- Lazy-loaded routes

## AI Workflow

Do not generate the entire application in one response. Work module by module.

For each module:
1. Design the database.
2. Create Prisma models.
3. Generate migrations.
4. Create backend services.
5. Create controllers.
6. Create validation.
7. Generate Swagger docs.
8. Create frontend pages.
9. Create reusable components.
10. Integrate API.
11. Add tests.
12. Update documentation.

Only after one module is complete should you continue to the next.

## Quality Checklist

Every completed module must satisfy:
- Builds successfully
- Passes lint
- Passes tests
- Has migrations
- Has API documentation
- Has frontend integration
- Has responsive UI
- Has role-based permissions
- Has audit logging
- Has Docker compatibility

If any item fails, fix it before proceeding.

## Deliverables

The final repository must include:
```
frontend/
backend/
docs/
docker/
nginx/
scripts/
docker-compose.yml
docker-compose.prod.yml
README.md
.env.example
LICENSE
```

## Final Rule

Treat this project like a commercial enterprise ERP system. Prioritize:
1. Maintainability
2. Scalability
3. Security
4. Performance
5. Reusability
6. Clean code
7. Documentation

Do not sacrifice architecture for speed.

Always ask for confirmation before making major architectural changes after implementation has started.
