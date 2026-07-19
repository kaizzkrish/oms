import path from 'node:path';
import dotenv from 'dotenv';

// Must run before any other import touches `process.env` — identical
// reasoning to src/main.ts. Static imports below compile to CommonJS
// `require()` calls that execute in source order, so this still runs first
// even though ES import syntax is normally hoisted.
dotenv.config({ path: path.resolve(__dirname, '../../.env'), override: true });

import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import { ClientsService } from '../src/modules/clients/clients.service';
import { DeliverablesService } from '../src/modules/deliverables/deliverables.service';
import { DepartmentsService } from '../src/modules/departments/departments.service';
import { DesignationsService } from '../src/modules/designations/designations.service';
import { EmployeesService } from '../src/modules/employees/employees.service';
import { FeaturesService } from '../src/modules/features/features.service';
import { MilestonesService } from '../src/modules/milestones/milestones.service';
import { OfficesService } from '../src/modules/offices/offices.service';
import { OrganizationsService } from '../src/modules/organizations/organizations.service';
import { PermissionGroupsService } from '../src/modules/permission-groups/permission-groups.service';
import { PermissionsService } from '../src/modules/permissions/permissions.service';
import { ProjectModulesService } from '../src/modules/project-modules/project-modules.service';
import { ProjectsService } from '../src/modules/projects/projects.service';
import { ReferencesService } from '../src/modules/references/references.service';
import { RolesService } from '../src/modules/roles/roles.service';
import { SprintsService } from '../src/modules/sprints/sprints.service';
import { TasksService } from '../src/modules/tasks/tasks.service';
import { TeamsService } from '../src/modules/teams/teams.service';
import { UsersService } from '../src/modules/users/users.service';

const DEFAULT_ROLES = [
  { name: 'Admin', description: 'Full administrative access to the system' },
  {
    name: 'Team Leader',
    description: 'Manages a team and its projects, tasks, and members',
  },
  { name: 'Employee', description: 'Standard employee access' },
] as const;

const DEFAULT_PERMISSION_GROUPS = [
  { name: 'User Management', description: 'Managing user accounts' },
  {
    name: 'Role Management',
    description: 'Managing roles and their user/permission assignments',
  },
  {
    name: 'Permission Management',
    description: 'Managing permissions and permission groups',
  },
  {
    name: 'Organization Management',
    description: 'Managing organizations and their offices',
  },
  {
    name: 'Department Management',
    description: 'Managing departments',
  },
  {
    name: 'Designation Management',
    description: 'Managing designations',
  },
  {
    name: 'Employee Management',
    description: 'Managing employee profiles',
  },
  {
    name: 'Team Management',
    description: 'Managing teams and their members',
  },
  {
    name: 'Client Management',
    description: 'Managing clients',
  },
  {
    name: 'Project Management',
    description: 'Managing projects',
  },
  {
    name: 'Module Management',
    description: 'Managing project modules',
  },
  {
    name: 'Feature Management',
    description: 'Managing features',
  },
  {
    name: 'Milestone Management',
    description: 'Managing project milestones',
  },
  {
    name: 'Sprint Management',
    description: 'Managing sprints',
  },
  {
    name: 'Task Management',
    description: 'Managing tasks',
  },
  {
    name: 'Deliverable Management',
    description: 'Managing project deliverables',
  },
  {
    name: 'Reference Management',
    description: 'Managing project reference links',
  },
] as const;

type PermissionGroupName = (typeof DEFAULT_PERMISSION_GROUPS)[number]['name'];

const DEFAULT_PERMISSIONS: {
  name: string;
  description: string;
  group: PermissionGroupName;
}[] = [
  { name: 'Users.View', description: 'View users', group: 'User Management' },
  {
    name: 'Users.Create',
    description: 'Create users',
    group: 'User Management',
  },
  {
    name: 'Users.Update',
    description: 'Update users',
    group: 'User Management',
  },
  {
    name: 'Users.Delete',
    description: 'Delete or restore users',
    group: 'User Management',
  },
  { name: 'Roles.View', description: 'View roles', group: 'Role Management' },
  {
    name: 'Roles.Create',
    description: 'Create roles',
    group: 'Role Management',
  },
  {
    name: 'Roles.Update',
    description: 'Update roles',
    group: 'Role Management',
  },
  {
    name: 'Roles.Delete',
    description: 'Delete or restore roles',
    group: 'Role Management',
  },
  {
    name: 'Roles.ManageUsers',
    description: 'Assign or unassign users on a role',
    group: 'Role Management',
  },
  {
    name: 'Roles.ManagePermissions',
    description: 'Assign or unassign permissions on a role',
    group: 'Role Management',
  },
  {
    name: 'Permissions.View',
    description: 'View permissions',
    group: 'Permission Management',
  },
  {
    name: 'Permissions.Create',
    description: 'Create permissions',
    group: 'Permission Management',
  },
  {
    name: 'Permissions.Update',
    description: 'Update permissions',
    group: 'Permission Management',
  },
  {
    name: 'Permissions.Delete',
    description: 'Delete or restore permissions',
    group: 'Permission Management',
  },
  {
    name: 'PermissionGroups.View',
    description: 'View permission groups',
    group: 'Permission Management',
  },
  {
    name: 'PermissionGroups.Create',
    description: 'Create permission groups',
    group: 'Permission Management',
  },
  {
    name: 'PermissionGroups.Update',
    description: 'Update permission groups',
    group: 'Permission Management',
  },
  {
    name: 'PermissionGroups.Delete',
    description: 'Delete or restore permission groups',
    group: 'Permission Management',
  },
  {
    name: 'Organizations.View',
    description: 'View organizations',
    group: 'Organization Management',
  },
  {
    name: 'Organizations.Create',
    description: 'Create organizations',
    group: 'Organization Management',
  },
  {
    name: 'Organizations.Update',
    description: 'Update organizations',
    group: 'Organization Management',
  },
  {
    name: 'Organizations.Delete',
    description: 'Delete or restore organizations',
    group: 'Organization Management',
  },
  {
    name: 'Offices.View',
    description: 'View offices',
    group: 'Organization Management',
  },
  {
    name: 'Offices.Create',
    description: 'Create offices',
    group: 'Organization Management',
  },
  {
    name: 'Offices.Update',
    description: 'Update offices',
    group: 'Organization Management',
  },
  {
    name: 'Offices.Delete',
    description: 'Delete or restore offices',
    group: 'Organization Management',
  },
  {
    name: 'Departments.View',
    description: 'View departments',
    group: 'Department Management',
  },
  {
    name: 'Departments.Create',
    description: 'Create departments',
    group: 'Department Management',
  },
  {
    name: 'Departments.Update',
    description: 'Update departments',
    group: 'Department Management',
  },
  {
    name: 'Departments.Delete',
    description: 'Delete or restore departments',
    group: 'Department Management',
  },
  {
    name: 'Designations.View',
    description: 'View designations',
    group: 'Designation Management',
  },
  {
    name: 'Designations.Create',
    description: 'Create designations',
    group: 'Designation Management',
  },
  {
    name: 'Designations.Update',
    description: 'Update designations',
    group: 'Designation Management',
  },
  {
    name: 'Designations.Delete',
    description: 'Delete or restore designations',
    group: 'Designation Management',
  },
  {
    name: 'Employees.View',
    description: 'View employees',
    group: 'Employee Management',
  },
  {
    name: 'Employees.Create',
    description: 'Create employees',
    group: 'Employee Management',
  },
  {
    name: 'Employees.Update',
    description: 'Update employees',
    group: 'Employee Management',
  },
  {
    name: 'Employees.Delete',
    description: 'Delete or restore employees',
    group: 'Employee Management',
  },
  {
    name: 'Teams.View',
    description: 'View teams',
    group: 'Team Management',
  },
  {
    name: 'Teams.Create',
    description: 'Create teams',
    group: 'Team Management',
  },
  {
    name: 'Teams.Update',
    description: 'Update teams',
    group: 'Team Management',
  },
  {
    name: 'Teams.Delete',
    description: 'Delete or restore teams',
    group: 'Team Management',
  },
  {
    name: 'Teams.ManageMembers',
    description: 'Add or remove members on a team',
    group: 'Team Management',
  },
  {
    name: 'Clients.View',
    description: 'View clients',
    group: 'Client Management',
  },
  {
    name: 'Clients.Create',
    description: 'Create clients',
    group: 'Client Management',
  },
  {
    name: 'Clients.Update',
    description: 'Update clients',
    group: 'Client Management',
  },
  {
    name: 'Clients.Delete',
    description: 'Delete or restore clients',
    group: 'Client Management',
  },
  {
    name: 'Projects.View',
    description: 'View projects',
    group: 'Project Management',
  },
  {
    name: 'Projects.Create',
    description: 'Create projects',
    group: 'Project Management',
  },
  {
    name: 'Projects.Update',
    description: 'Update projects',
    group: 'Project Management',
  },
  {
    name: 'Projects.Delete',
    description: 'Delete or restore projects',
    group: 'Project Management',
  },
  {
    name: 'ProjectModules.View',
    description: 'View project modules',
    group: 'Module Management',
  },
  {
    name: 'ProjectModules.Create',
    description: 'Create project modules',
    group: 'Module Management',
  },
  {
    name: 'ProjectModules.Update',
    description: 'Update project modules',
    group: 'Module Management',
  },
  {
    name: 'ProjectModules.Delete',
    description: 'Delete or restore project modules',
    group: 'Module Management',
  },
  {
    name: 'Features.View',
    description: 'View features',
    group: 'Feature Management',
  },
  {
    name: 'Features.Create',
    description: 'Create features',
    group: 'Feature Management',
  },
  {
    name: 'Features.Update',
    description: 'Update features',
    group: 'Feature Management',
  },
  {
    name: 'Features.Delete',
    description: 'Delete or restore features',
    group: 'Feature Management',
  },
  {
    name: 'Milestones.View',
    description: 'View milestones',
    group: 'Milestone Management',
  },
  {
    name: 'Milestones.Create',
    description: 'Create milestones',
    group: 'Milestone Management',
  },
  {
    name: 'Milestones.Update',
    description: 'Update milestones',
    group: 'Milestone Management',
  },
  {
    name: 'Milestones.Delete',
    description: 'Delete or restore milestones',
    group: 'Milestone Management',
  },
  {
    name: 'Sprints.View',
    description: 'View sprints',
    group: 'Sprint Management',
  },
  {
    name: 'Sprints.Create',
    description: 'Create sprints',
    group: 'Sprint Management',
  },
  {
    name: 'Sprints.Update',
    description: 'Update sprints',
    group: 'Sprint Management',
  },
  {
    name: 'Sprints.Delete',
    description: 'Delete or restore sprints',
    group: 'Sprint Management',
  },
  {
    name: 'Tasks.View',
    description: 'View tasks',
    group: 'Task Management',
  },
  {
    name: 'Tasks.Create',
    description: 'Create tasks',
    group: 'Task Management',
  },
  {
    name: 'Tasks.Update',
    description: 'Update tasks',
    group: 'Task Management',
  },
  {
    name: 'Tasks.Delete',
    description: 'Delete or restore tasks',
    group: 'Task Management',
  },
  {
    name: 'Deliverables.View',
    description: 'View deliverables',
    group: 'Deliverable Management',
  },
  {
    name: 'Deliverables.Create',
    description: 'Create deliverables',
    group: 'Deliverable Management',
  },
  {
    name: 'Deliverables.Update',
    description: 'Update deliverables',
    group: 'Deliverable Management',
  },
  {
    name: 'Deliverables.Delete',
    description: 'Delete or restore deliverables',
    group: 'Deliverable Management',
  },
  {
    name: 'References.View',
    description: 'View references',
    group: 'Reference Management',
  },
  {
    name: 'References.Create',
    description: 'Create references',
    group: 'Reference Management',
  },
  {
    name: 'References.Update',
    description: 'Update references',
    group: 'Reference Management',
  },
  {
    name: 'References.Delete',
    description: 'Delete or restore references',
    group: 'Reference Management',
  },
];

// A Team Leader gets read-only visibility into the access-control screens;
// full management stays exclusive to Admin. Employee gets no permissions of
// its own yet — future modules (Tasks, Projects, ...) will add the
// permissions a regular employee actually needs.
const TEAM_LEADER_PERMISSIONS = [
  'Users.View',
  'Roles.View',
  'Organizations.View',
  'Offices.View',
  'Departments.View',
  'Designations.View',
  'Employees.View',
  'Teams.View',
  'Clients.View',
  'Projects.View',
  'ProjectModules.View',
  'Features.View',
  'Milestones.View',
  'Sprints.View',
  'Tasks.View',
  'Deliverables.View',
  'References.View',
];

const SAMPLE_ORGANIZATION = {
  name: 'Acme Corporation',
  legalName: 'Acme Corporation Pvt. Ltd.',
  industry: 'Information Technology',
};

const SAMPLE_OFFICE = {
  name: 'Headquarters',
  isHeadquarters: true,
  addressLine1: '1 Corporate Park',
  city: 'Mumbai',
  state: 'Maharashtra',
  country: 'India',
  postalCode: '400001',
};

const SAMPLE_DEPARTMENT = {
  name: 'Engineering',
  code: 'ENG',
  description: 'Builds and maintains the product',
};

const SAMPLE_DESIGNATION = {
  name: 'Software Engineer',
  code: 'SE',
  description: 'Designs, builds, and maintains software',
};

const SAMPLE_EMPLOYEE_USER = {
  email: 'employee@oms.local',
  firstName: 'Jane',
  lastName: 'Doe',
};

const SAMPLE_EMPLOYEE = {
  employeeCode: 'EMP-0001',
  employmentType: 'FULL_TIME' as const,
  dateOfJoining: '2025-01-06',
};

const SAMPLE_TEAM = {
  name: 'Engineering Team',
  code: 'ENG-TEAM',
  description: 'Owns the product engineering roadmap',
};

const SAMPLE_CLIENT = {
  name: 'Globex Corporation',
  code: 'GLOBEX',
  industry: 'Manufacturing',
  contactName: 'John Smith',
  contactEmail: 'john.smith@globex.example.com',
};

const SAMPLE_PROJECT = {
  name: 'Website Redesign',
  code: 'WEB-RD',
  description: "Refresh Globex's public-facing marketing site",
  status: 'IN_PROGRESS' as const,
  priority: 'HIGH' as const,
  startDate: '2026-01-13',
  endDate: '2026-06-30',
  budget: 50000,
};

const SAMPLE_MODULE = {
  name: 'Homepage Revamp',
  code: 'HOME',
  description: 'Redesign the homepage hero, navigation, and footer',
  status: 'IN_PROGRESS' as const,
  startDate: '2026-01-13',
  endDate: '2026-03-31',
};

const SAMPLE_FEATURE = {
  name: 'Hero Banner Redesign',
  code: 'HERO',
  description: 'New hero banner with updated messaging and imagery',
  status: 'IN_PROGRESS' as const,
  priority: 'HIGH' as const,
  startDate: '2026-01-13',
  endDate: '2026-02-14',
};

const SAMPLE_MILESTONE = {
  name: 'Beta Launch',
  code: 'BETA',
  description: 'Public beta release of the redesigned website',
  status: 'AT_RISK' as const,
  dueDate: '2026-04-30',
};

const SAMPLE_SPRINT = {
  name: 'Sprint 1',
  code: 'SPR-1',
  goal: 'Ship the redesigned homepage hero and navigation',
  status: 'ACTIVE' as const,
  startDate: '2026-01-13',
  endDate: '2026-01-27',
};

const SAMPLE_TASK = {
  name: 'Build hero banner component',
  code: 'HERO-1',
  description:
    'Implement the new hero banner React component with responsive layout',
  type: 'TASK' as const,
  status: 'IN_PROGRESS' as const,
  priority: 'HIGH' as const,
  dueDate: '2026-01-24',
  estimatedHours: 12,
};

const SAMPLE_DELIVERABLE = {
  name: 'Beta Launch Readiness Report',
  code: 'BETA-RPT',
  description: 'Summary report confirming the site is ready for public beta',
  type: 'REPORT' as const,
  status: 'IN_PROGRESS' as const,
  dueDate: '2026-04-23',
};

const SAMPLE_REFERENCE = {
  name: 'Design System Figma',
  url: 'https://figma.com/file/example-design-system',
  description: 'Shared Figma file with the redesigned component library',
  type: 'DESIGN' as const,
};

async function main(): Promise<void> {
  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: ['error', 'warn', 'log'],
  });
  const usersService = app.get(UsersService);
  const rolesService = app.get(RolesService);
  const permissionGroupsService = app.get(PermissionGroupsService);
  const permissionsService = app.get(PermissionsService);
  const organizationsService = app.get(OrganizationsService);
  const officesService = app.get(OfficesService);
  const departmentsService = app.get(DepartmentsService);
  const designationsService = app.get(DesignationsService);
  const employeesService = app.get(EmployeesService);
  const teamsService = app.get(TeamsService);
  const clientsService = app.get(ClientsService);
  const projectsService = app.get(ProjectsService);
  const projectModulesService = app.get(ProjectModulesService);
  const featuresService = app.get(FeaturesService);
  const milestonesService = app.get(MilestonesService);
  const sprintsService = app.get(SprintsService);
  const tasksService = app.get(TasksService);
  const deliverablesService = app.get(DeliverablesService);
  const referencesService = app.get(ReferencesService);

  const email = process.env.SEED_ADMIN_EMAIL ?? 'admin@oms.local';
  const password = process.env.SEED_ADMIN_PASSWORD ?? 'ChangeMe123!';

  let adminUser = await usersService.findByEmail(email);
  if (adminUser) {
    Logger.log(`Seed admin user already exists: ${email}`, 'Seed');
  } else {
    adminUser = await usersService.createUser({
      email,
      password,
      firstName: 'System',
      lastName: 'Administrator',
    });
    Logger.log(`Seed admin user created: ${email}`, 'Seed');
    Logger.log(
      `Temporary password: ${password} — change this immediately after first login.`,
      'Seed',
    );
  }

  const roleIdByName = new Map<string, string>();
  for (const roleDef of DEFAULT_ROLES) {
    const existingRole = await rolesService.findByName(roleDef.name);
    if (existingRole) {
      Logger.log(`Default role already exists: ${roleDef.name}`, 'Seed');
      roleIdByName.set(roleDef.name, existingRole.id);
    } else {
      const role = await rolesService.createSystemRole(
        roleDef.name,
        roleDef.description,
      );
      Logger.log(`Default role created: ${roleDef.name}`, 'Seed');
      roleIdByName.set(roleDef.name, role.id);
    }
  }

  const adminRoleId = roleIdByName.get('Admin');
  if (adminRoleId && adminUser) {
    const alreadyAssigned = await rolesService.hasUserRole(
      adminUser.id,
      adminRoleId,
    );
    if (alreadyAssigned) {
      Logger.log('Seed admin user already has the Admin role', 'Seed');
    } else {
      await rolesService.assignUser(adminRoleId, adminUser.id);
      Logger.log('Assigned Admin role to seed admin user', 'Seed');
    }
  }

  const groupIdByName = new Map<PermissionGroupName, string>();
  for (const groupDef of DEFAULT_PERMISSION_GROUPS) {
    const existingGroup = await permissionGroupsService.findByName(
      groupDef.name,
    );
    if (existingGroup) {
      Logger.log(
        `Default permission group already exists: ${groupDef.name}`,
        'Seed',
      );
      groupIdByName.set(groupDef.name, existingGroup.id);
    } else {
      const group = await permissionGroupsService.createGroup({
        name: groupDef.name,
        description: groupDef.description,
      });
      Logger.log(`Default permission group created: ${groupDef.name}`, 'Seed');
      groupIdByName.set(groupDef.name, group.id);
    }
  }

  const permissionIdByName = new Map<string, string>();
  for (const permissionDef of DEFAULT_PERMISSIONS) {
    const existingPermission = await permissionsService.findByName(
      permissionDef.name,
    );
    if (existingPermission) {
      Logger.log(
        `Default permission already exists: ${permissionDef.name}`,
        'Seed',
      );
      permissionIdByName.set(permissionDef.name, existingPermission.id);
    } else {
      const groupId = groupIdByName.get(permissionDef.group);
      const permission = await permissionsService.createSystemPermission(
        permissionDef.name,
        permissionDef.description,
        groupId,
      );
      Logger.log(`Default permission created: ${permissionDef.name}`, 'Seed');
      permissionIdByName.set(permissionDef.name, permission.id);
    }
  }

  if (adminRoleId) {
    for (const permissionId of permissionIdByName.values()) {
      const alreadyAssigned = await rolesService.hasRolePermission(
        adminRoleId,
        permissionId,
      );
      if (!alreadyAssigned) {
        await rolesService.assignPermission(adminRoleId, permissionId);
      }
    }
    Logger.log('Assigned all permissions to the Admin role', 'Seed');
  }

  const teamLeaderRoleId = roleIdByName.get('Team Leader');
  if (teamLeaderRoleId) {
    for (const permissionName of TEAM_LEADER_PERMISSIONS) {
      const permissionId = permissionIdByName.get(permissionName);
      if (!permissionId) continue;
      const alreadyAssigned = await rolesService.hasRolePermission(
        teamLeaderRoleId,
        permissionId,
      );
      if (!alreadyAssigned) {
        await rolesService.assignPermission(teamLeaderRoleId, permissionId);
      }
    }
    Logger.log(
      'Assigned view-only permissions to the Team Leader role',
      'Seed',
    );
  }

  let organization = await organizationsService.findByName(
    SAMPLE_ORGANIZATION.name,
  );
  if (organization) {
    Logger.log(
      `Sample organization already exists: ${SAMPLE_ORGANIZATION.name}`,
      'Seed',
    );
  } else {
    organization = await organizationsService.createOrganization(
      SAMPLE_ORGANIZATION,
      adminUser?.id,
    );
    Logger.log(
      `Sample organization created: ${SAMPLE_ORGANIZATION.name}`,
      'Seed',
    );
  }

  const existingOffices = await officesService.listOffices({
    page: 1,
    limit: 1,
    search: SAMPLE_OFFICE.name,
    organizationId: organization.id,
    sortBy: 'name',
    sortOrder: 'asc',
  });
  let office = existingOffices.items[0];
  if (office) {
    Logger.log(`Sample office already exists: ${SAMPLE_OFFICE.name}`, 'Seed');
  } else {
    office = await officesService.createOffice(
      { ...SAMPLE_OFFICE, organizationId: organization.id },
      adminUser?.id,
    );
    Logger.log(`Sample office created: ${SAMPLE_OFFICE.name}`, 'Seed');
  }

  const existingDepartments = await departmentsService.listDepartments({
    page: 1,
    limit: 1,
    search: SAMPLE_DEPARTMENT.name,
    organizationId: organization.id,
    sortBy: 'name',
    sortOrder: 'asc',
  });
  let department = existingDepartments.items[0];
  if (department) {
    Logger.log(
      `Sample department already exists: ${SAMPLE_DEPARTMENT.name}`,
      'Seed',
    );
  } else {
    department = await departmentsService.createDepartment(
      {
        ...SAMPLE_DEPARTMENT,
        organizationId: organization.id,
        officeId: office.id,
      },
      adminUser?.id,
    );
    Logger.log(`Sample department created: ${SAMPLE_DEPARTMENT.name}`, 'Seed');
  }

  const existingDesignations = await designationsService.listDesignations({
    page: 1,
    limit: 1,
    search: SAMPLE_DESIGNATION.name,
    organizationId: organization.id,
    sortBy: 'name',
    sortOrder: 'asc',
  });
  let designation = existingDesignations.items[0];
  if (designation) {
    Logger.log(
      `Sample designation already exists: ${SAMPLE_DESIGNATION.name}`,
      'Seed',
    );
  } else {
    designation = await designationsService.createDesignation(
      {
        ...SAMPLE_DESIGNATION,
        organizationId: organization.id,
        departmentId: department.id,
      },
      adminUser?.id,
    );
    Logger.log(
      `Sample designation created: ${SAMPLE_DESIGNATION.name}`,
      'Seed',
    );
  }

  let employeeUser = await usersService.findByEmail(SAMPLE_EMPLOYEE_USER.email);
  if (employeeUser) {
    Logger.log(
      `Sample employee user already exists: ${SAMPLE_EMPLOYEE_USER.email}`,
      'Seed',
    );
  } else {
    employeeUser = await usersService.createUser({
      ...SAMPLE_EMPLOYEE_USER,
      password,
    });
    Logger.log(
      `Sample employee user created: ${SAMPLE_EMPLOYEE_USER.email}`,
      'Seed',
    );
  }

  const employeeRoleId = roleIdByName.get('Employee');
  if (employeeRoleId) {
    const alreadyAssigned = await rolesService.hasUserRole(
      employeeUser.id,
      employeeRoleId,
    );
    if (alreadyAssigned) {
      Logger.log('Sample employee user already has the Employee role', 'Seed');
    } else {
      await rolesService.assignUser(employeeRoleId, employeeUser.id);
      Logger.log('Assigned Employee role to sample employee user', 'Seed');
    }
  }

  const existingEmployees = await employeesService.listEmployees({
    page: 1,
    limit: 1,
    search: SAMPLE_EMPLOYEE.employeeCode,
    organizationId: organization.id,
    sortBy: 'employeeCode',
    sortOrder: 'asc',
  });
  let employee = existingEmployees.items[0];
  if (employee) {
    Logger.log(
      `Sample employee already exists: ${SAMPLE_EMPLOYEE.employeeCode}`,
      'Seed',
    );
  } else {
    employee = await employeesService.createEmployee(
      {
        ...SAMPLE_EMPLOYEE,
        userId: employeeUser.id,
        organizationId: organization.id,
        departmentId: department.id,
        designationId: designation.id,
        officeId: office.id,
      },
      adminUser?.id,
    );
    Logger.log(
      `Sample employee created: ${SAMPLE_EMPLOYEE.employeeCode}`,
      'Seed',
    );
  }

  const existingTeams = await teamsService.listTeams({
    page: 1,
    limit: 1,
    search: SAMPLE_TEAM.name,
    organizationId: organization.id,
    sortBy: 'name',
    sortOrder: 'asc',
  });
  let team = existingTeams.items[0];
  if (team) {
    Logger.log(`Sample team already exists: ${SAMPLE_TEAM.name}`, 'Seed');
  } else {
    team = await teamsService.createTeam(
      {
        ...SAMPLE_TEAM,
        organizationId: organization.id,
        departmentId: department.id,
        teamLeaderId: employee.id,
      },
      adminUser?.id,
    );
    Logger.log(`Sample team created: ${SAMPLE_TEAM.name}`, 'Seed');
  }

  const isLeaderAlreadyMember = await teamsService
    .listMembersForTeam(team.id, { page: 1, limit: 1, sortOrder: 'asc' })
    .then((result) => result.items.some((member) => member.id === employee.id));
  if (isLeaderAlreadyMember) {
    Logger.log('Sample team leader is already a team member', 'Seed');
  } else {
    await teamsService.addMember(team.id, employee.id, adminUser?.id);
    Logger.log('Added sample team leader as a team member', 'Seed');
  }

  const existingClients = await clientsService.listClients({
    page: 1,
    limit: 1,
    search: SAMPLE_CLIENT.name,
    organizationId: organization.id,
    sortBy: 'name',
    sortOrder: 'asc',
  });
  let client = existingClients.items[0];
  if (client) {
    Logger.log(`Sample client already exists: ${SAMPLE_CLIENT.name}`, 'Seed');
  } else {
    client = await clientsService.createClient(
      {
        ...SAMPLE_CLIENT,
        organizationId: organization.id,
        accountManagerId: employee.id,
      },
      adminUser?.id,
    );
    Logger.log(`Sample client created: ${SAMPLE_CLIENT.name}`, 'Seed');
  }

  const existingProjects = await projectsService.listProjects({
    page: 1,
    limit: 1,
    search: SAMPLE_PROJECT.name,
    organizationId: organization.id,
    sortBy: 'name',
    sortOrder: 'asc',
  });
  let project = existingProjects.items[0];
  if (project) {
    Logger.log(`Sample project already exists: ${SAMPLE_PROJECT.name}`, 'Seed');
  } else {
    project = await projectsService.createProject(
      {
        ...SAMPLE_PROJECT,
        organizationId: organization.id,
        clientId: client.id,
        departmentId: department.id,
        projectManagerId: employee.id,
        teamId: team.id,
      },
      adminUser?.id,
    );
    Logger.log(`Sample project created: ${SAMPLE_PROJECT.name}`, 'Seed');
  }

  const existingModules = await projectModulesService.listProjectModules({
    page: 1,
    limit: 1,
    search: SAMPLE_MODULE.name,
    projectId: project.id,
    sortBy: 'name',
    sortOrder: 'asc',
  });
  let projectModule = existingModules.items[0];
  if (projectModule) {
    Logger.log(`Sample module already exists: ${SAMPLE_MODULE.name}`, 'Seed');
  } else {
    projectModule = await projectModulesService.createProjectModule(
      {
        ...SAMPLE_MODULE,
        organizationId: organization.id,
        projectId: project.id,
        moduleLeadId: employee.id,
      },
      adminUser?.id,
    );
    Logger.log(`Sample module created: ${SAMPLE_MODULE.name}`, 'Seed');
  }

  const existingFeatures = await featuresService.listFeatures({
    page: 1,
    limit: 1,
    search: SAMPLE_FEATURE.name,
    moduleId: projectModule.id,
    sortBy: 'name',
    sortOrder: 'asc',
  });
  let feature = existingFeatures.items[0];
  if (feature) {
    Logger.log(`Sample feature already exists: ${SAMPLE_FEATURE.name}`, 'Seed');
  } else {
    feature = await featuresService.createFeature(
      {
        ...SAMPLE_FEATURE,
        organizationId: organization.id,
        projectId: project.id,
        moduleId: projectModule.id,
        ownerId: employee.id,
      },
      adminUser?.id,
    );
    Logger.log(`Sample feature created: ${SAMPLE_FEATURE.name}`, 'Seed');
  }

  const existingMilestones = await milestonesService.listMilestones({
    page: 1,
    limit: 1,
    search: SAMPLE_MILESTONE.name,
    projectId: project.id,
    sortBy: 'name',
    sortOrder: 'asc',
  });
  let milestone = existingMilestones.items[0];
  if (milestone) {
    Logger.log(
      `Sample milestone already exists: ${SAMPLE_MILESTONE.name}`,
      'Seed',
    );
  } else {
    milestone = await milestonesService.createMilestone(
      {
        ...SAMPLE_MILESTONE,
        organizationId: organization.id,
        projectId: project.id,
        ownerId: employee.id,
      },
      adminUser?.id,
    );
    Logger.log(`Sample milestone created: ${SAMPLE_MILESTONE.name}`, 'Seed');
  }

  const existingSprints = await sprintsService.listSprints({
    page: 1,
    limit: 1,
    search: SAMPLE_SPRINT.name,
    projectId: project.id,
    sortBy: 'name',
    sortOrder: 'asc',
  });
  let sprint = existingSprints.items[0];
  if (sprint) {
    Logger.log(`Sample sprint already exists: ${SAMPLE_SPRINT.name}`, 'Seed');
  } else {
    sprint = await sprintsService.createSprint(
      {
        ...SAMPLE_SPRINT,
        organizationId: organization.id,
        projectId: project.id,
        teamId: team.id,
        scrumMasterId: employee.id,
      },
      adminUser?.id,
    );
    Logger.log(`Sample sprint created: ${SAMPLE_SPRINT.name}`, 'Seed');
  }

  const existingTasks = await tasksService.listTasks({
    page: 1,
    limit: 1,
    search: SAMPLE_TASK.name,
    projectId: project.id,
    sortBy: 'name',
    sortOrder: 'asc',
  });
  if (existingTasks.items.length > 0) {
    Logger.log(`Sample task already exists: ${SAMPLE_TASK.name}`, 'Seed');
  } else {
    await tasksService.createTask(
      {
        ...SAMPLE_TASK,
        organizationId: organization.id,
        projectId: project.id,
        moduleId: projectModule.id,
        featureId: feature.id,
        sprintId: sprint.id,
        assigneeId: employee.id,
      },
      adminUser?.id,
    );
    Logger.log(`Sample task created: ${SAMPLE_TASK.name}`, 'Seed');
  }

  const existingDeliverables = await deliverablesService.listDeliverables({
    page: 1,
    limit: 1,
    search: SAMPLE_DELIVERABLE.name,
    projectId: project.id,
    sortBy: 'name',
    sortOrder: 'asc',
  });
  if (existingDeliverables.items.length > 0) {
    Logger.log(
      `Sample deliverable already exists: ${SAMPLE_DELIVERABLE.name}`,
      'Seed',
    );
  } else {
    await deliverablesService.createDeliverable(
      {
        ...SAMPLE_DELIVERABLE,
        organizationId: organization.id,
        projectId: project.id,
        milestoneId: milestone.id,
        ownerId: employee.id,
      },
      adminUser?.id,
    );
    Logger.log(
      `Sample deliverable created: ${SAMPLE_DELIVERABLE.name}`,
      'Seed',
    );
  }

  const existingReferences = await referencesService.listReferences({
    page: 1,
    limit: 1,
    search: SAMPLE_REFERENCE.name,
    projectId: project.id,
    sortBy: 'name',
    sortOrder: 'asc',
  });
  if (existingReferences.items.length > 0) {
    Logger.log(
      `Sample reference already exists: ${SAMPLE_REFERENCE.name}`,
      'Seed',
    );
  } else {
    await referencesService.createReference(
      {
        ...SAMPLE_REFERENCE,
        organizationId: organization.id,
        projectId: project.id,
      },
      adminUser?.id,
    );
    Logger.log(`Sample reference created: ${SAMPLE_REFERENCE.name}`, 'Seed');
  }

  await app.close();
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
