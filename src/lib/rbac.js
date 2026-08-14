// Role-Based Access Control Configuration

export const ROLES = {
  SUPER_ADMIN: "super_admin",
  ADMIN: "admin",
  ACCOUNTANT: "accountant",
  TEACHER: "teacher",
  INVENTORY_MANAGER: "inventory_manager",
  VIEWER: "viewer",
};

export const ROLE_HIERARCHY = {
  [ROLES.SUPER_ADMIN]: 6,
  [ROLES.ADMIN]: 5,
  [ROLES.ACCOUNTANT]: 4,
  [ROLES.TEACHER]: 3,
  [ROLES.INVENTORY_MANAGER]: 2,
  [ROLES.VIEWER]: 1,
};

export const PERMISSIONS = {
  // Dashboard
  DASHBOARD_VIEW: "dashboard_view",

  // Students
  STUDENTS_VIEW: "students_view",
  STUDENTS_CREATE: "students_create",
  STUDENTS_UPDATE: "students_update",
  STUDENTS_DELETE: "students_delete",

  // Student progress
  PROGRESS_VIEW: "progress_view",
  PROGRESS_MANAGE: "progress_manage",

  // Student fees
  FEES_VIEW: "fees_view",
  FEES_MANAGE: "fees_manage",

  // Student attendance
  ATTENDANCE_VIEW: "attendance_view",
  ATTENDANCE_MANAGE: "attendance_manage",

  // Donors
  DONORS_VIEW: "donors_view",
  DONORS_CREATE: "donors_create",
  DONORS_UPDATE: "donors_update",
  DONORS_DELETE: "donors_delete",

  // Donations
  DONATIONS_VIEW: "donations_view",
  DONATIONS_CREATE: "donations_create",
  DONATIONS_UPDATE: "donations_update",
  DONATIONS_DELETE: "donations_delete",

  // Expenses
  EXPENSES_VIEW: "expenses_view",
  EXPENSES_CREATE: "expenses_create",
  EXPENSES_UPDATE: "expenses_update",
  EXPENSES_DELETE: "expenses_delete",

  // Staff
  STAFF_VIEW: "staff_view",
  STAFF_CREATE: "staff_create",
  STAFF_UPDATE: "staff_update",
  STAFF_DELETE: "staff_delete",

  // Inventory
  INVENTORY_VIEW: "inventory_view",
  INVENTORY_CREATE: "inventory_create",
  INVENTORY_UPDATE: "inventory_update",
  INVENTORY_DELETE: "inventory_delete",

  // Users
  USERS_VIEW: "users_view",
  USERS_CREATE: "users_create",
  USERS_UPDATE: "users_update",
  USERS_DELETE: "users_delete",
};

export const ROLE_PERMISSIONS = {
  [ROLES.SUPER_ADMIN]: Object.values(PERMISSIONS),

  [ROLES.ADMIN]: [
    PERMISSIONS.DASHBOARD_VIEW,
    PERMISSIONS.STUDENTS_VIEW,
    PERMISSIONS.STUDENTS_CREATE,
    PERMISSIONS.STUDENTS_UPDATE,
    PERMISSIONS.STUDENTS_DELETE,
    PERMISSIONS.PROGRESS_VIEW,
    PERMISSIONS.PROGRESS_MANAGE,
    PERMISSIONS.FEES_VIEW,
    PERMISSIONS.FEES_MANAGE,
    PERMISSIONS.ATTENDANCE_VIEW,
    PERMISSIONS.ATTENDANCE_MANAGE,
    PERMISSIONS.DONORS_VIEW,
    PERMISSIONS.DONORS_CREATE,
    PERMISSIONS.DONORS_UPDATE,
    PERMISSIONS.DONORS_DELETE,
    PERMISSIONS.DONATIONS_VIEW,
    PERMISSIONS.DONATIONS_CREATE,
    PERMISSIONS.DONATIONS_UPDATE,
    PERMISSIONS.DONATIONS_DELETE,
    PERMISSIONS.EXPENSES_VIEW,
    PERMISSIONS.EXPENSES_CREATE,
    PERMISSIONS.EXPENSES_UPDATE,
    PERMISSIONS.EXPENSES_DELETE,
    PERMISSIONS.STAFF_VIEW,
    PERMISSIONS.STAFF_CREATE,
    PERMISSIONS.STAFF_UPDATE,
    PERMISSIONS.STAFF_DELETE,
    PERMISSIONS.INVENTORY_VIEW,
    PERMISSIONS.INVENTORY_CREATE,
    PERMISSIONS.INVENTORY_UPDATE,
    PERMISSIONS.INVENTORY_DELETE,
  ],

  [ROLES.ACCOUNTANT]: [
    PERMISSIONS.DASHBOARD_VIEW,
    PERMISSIONS.DONORS_VIEW,
    PERMISSIONS.DONATIONS_VIEW,
    PERMISSIONS.DONATIONS_CREATE,
    PERMISSIONS.DONATIONS_UPDATE,
    PERMISSIONS.DONATIONS_DELETE,
    PERMISSIONS.EXPENSES_VIEW,
    PERMISSIONS.EXPENSES_CREATE,
    PERMISSIONS.EXPENSES_UPDATE,
    PERMISSIONS.EXPENSES_DELETE,
  ],

  [ROLES.TEACHER]: [
    PERMISSIONS.DASHBOARD_VIEW,
    PERMISSIONS.STUDENTS_VIEW,
    PERMISSIONS.STUDENTS_CREATE,
    PERMISSIONS.STUDENTS_UPDATE,
    PERMISSIONS.STUDENTS_DELETE,
    PERMISSIONS.PROGRESS_VIEW,
    PERMISSIONS.PROGRESS_MANAGE,
    PERMISSIONS.FEES_VIEW,
    PERMISSIONS.FEES_MANAGE,
    PERMISSIONS.ATTENDANCE_VIEW,
    PERMISSIONS.ATTENDANCE_MANAGE,
    PERMISSIONS.STAFF_VIEW,
    PERMISSIONS.STAFF_CREATE,
    PERMISSIONS.STAFF_UPDATE,
    PERMISSIONS.STAFF_DELETE,
  ],

  [ROLES.INVENTORY_MANAGER]: [
    PERMISSIONS.DASHBOARD_VIEW,
    PERMISSIONS.INVENTORY_VIEW,
    PERMISSIONS.INVENTORY_CREATE,
    PERMISSIONS.INVENTORY_UPDATE,
    PERMISSIONS.INVENTORY_DELETE,
  ],

  [ROLES.VIEWER]: [PERMISSIONS.DASHBOARD_VIEW],
};

export const hasPermission = (userRole, permission, customPermissions = null) => {
  if (!userRole || !permission) return false;
  if (userRole === ROLES.SUPER_ADMIN) return true;
  if (Array.isArray(customPermissions)) {
    return customPermissions.includes(permission);
  }
  return ROLE_PERMISSIONS[userRole]?.includes(permission) || false;
};

export const hasAnyPermission = (userRole, permissions, customPermissions = null) => {
  if (!userRole || !permissions || !Array.isArray(permissions)) return false;
  return permissions.some((permission) => hasPermission(userRole, permission, customPermissions));
};

export const hasAllPermissions = (userRole, permissions, customPermissions = null) => {
  if (!userRole || !permissions || !Array.isArray(permissions)) return false;
  return permissions.every((permission) => hasPermission(userRole, permission, customPermissions));
};

export const getEffectivePermissions = (userRole, customPermissions = null) => {
  if (userRole === ROLES.SUPER_ADMIN) return [...ROLE_PERMISSIONS[ROLES.SUPER_ADMIN]];
  return Array.isArray(customPermissions)
    ? customPermissions.filter((permission) => Object.values(PERMISSIONS).includes(permission))
    : [...(ROLE_PERMISSIONS[userRole] || [])];
};

export const PERMISSION_GROUPS = [
  { key: "dashboard", view: [PERMISSIONS.DASHBOARD_VIEW], manage: [] },
  { key: "students", view: [PERMISSIONS.STUDENTS_VIEW], manage: [PERMISSIONS.STUDENTS_CREATE, PERMISSIONS.STUDENTS_UPDATE, PERMISSIONS.STUDENTS_DELETE] },
  { key: "progress", view: [PERMISSIONS.PROGRESS_VIEW], manage: [PERMISSIONS.PROGRESS_MANAGE], requiresStudents: true },
  { key: "fees", view: [PERMISSIONS.FEES_VIEW], manage: [PERMISSIONS.FEES_MANAGE], requiresStudents: true },
  { key: "attendance", view: [PERMISSIONS.ATTENDANCE_VIEW], manage: [PERMISSIONS.ATTENDANCE_MANAGE], requiresStudents: true },
  { key: "donations", view: [PERMISSIONS.DONATIONS_VIEW, PERMISSIONS.DONORS_VIEW], manage: [PERMISSIONS.DONATIONS_CREATE, PERMISSIONS.DONATIONS_UPDATE, PERMISSIONS.DONATIONS_DELETE, PERMISSIONS.DONORS_CREATE, PERMISSIONS.DONORS_UPDATE, PERMISSIONS.DONORS_DELETE] },
  { key: "expenses", view: [PERMISSIONS.EXPENSES_VIEW], manage: [PERMISSIONS.EXPENSES_CREATE, PERMISSIONS.EXPENSES_UPDATE, PERMISSIONS.EXPENSES_DELETE] },
  { key: "staff", view: [PERMISSIONS.STAFF_VIEW], manage: [PERMISSIONS.STAFF_CREATE, PERMISSIONS.STAFF_UPDATE, PERMISSIONS.STAFF_DELETE] },
  { key: "inventory", view: [PERMISSIONS.INVENTORY_VIEW], manage: [PERMISSIONS.INVENTORY_CREATE, PERMISSIONS.INVENTORY_UPDATE, PERMISSIONS.INVENTORY_DELETE] },
  { key: "users", view: [PERMISSIONS.USERS_VIEW], manage: [PERMISSIONS.USERS_CREATE, PERMISSIONS.USERS_UPDATE, PERMISSIONS.USERS_DELETE] },
];

export const getRoleLevel = (role) => {
  return ROLE_HIERARCHY[role] || 0;
};

export const canAccessRole = (currentUserRole, targetRole) => {
  return getRoleLevel(currentUserRole) >= getRoleLevel(targetRole);
};
