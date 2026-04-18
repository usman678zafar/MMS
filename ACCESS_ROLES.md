# Access Roles & Permissions

This document outlines the User Roles and their associated Permissions within the Madrasa Management System (MMS).

## Role Hierarchy

Roles are structured in a hierarchy. Users with higher-level roles generally have administrative authority over lower-level roles.

| Level | Role | Identifier |
| :--- | :--- | :--- |
| 6 | Super Admin | `super_admin` |
| 5 | Admin | `admin` |
| 4 | Accountant | `accountant` |
| 3 | Teacher | `teacher` |
| 2 | Inventory Manager | `inventory_manager` |
| 1 | Viewer | `viewer` |

---

## Roles Description & Access Levels

### 1. Super Admin (`super_admin`)
- **Description**: Full system access. The only role capable of managing system users and critical configurations.
- **Permissions**: 
  - All system permissions (Dashboard, Students, Donors, Donations, Expenses, Staff, Inventory, Users).
  - Can create, update, and delete other Admin and Super Admin accounts.

### 2. Admin (`admin`)
- **Description**: General manager of the Madrasa. Handles most day-to-day operations across all modules except user management.
- **Permissions**:
  - Full access to Students, Donors, Donations, Expenses, Staff, and Inventory.
  - No access to the **Users** management module.

### 3. Accountant (`accountant`)
- **Description**: Handles the financial aspects of the Madrasa.
- **Permissions**:
  - **Dashboard**: View only.
  - **Donors**: View list.
  - **Donations**: View, Create, Update, Delete.
  - **Expenses**: View, Create, Update, Delete.
  - **Note**: No access to Students, Staff, or Inventory.

### 4. Teacher (`teacher`)
- **Description**: Manages educational records and student progress.
- **Permissions**:
  - **Dashboard**: View only.
  - **Students**: View, Create, Update, Delete (Education tracks and progress).
  - **Staff**: View staff list and details.
  - **Note**: No access to Financials (Donations/Expenses) or Inventory.

### 5. Inventory Manager (`inventory_manager`)
- **Description**: Responsible for tracking assets and supplies.
- **Permissions**:
  - **Dashboard**: View only.
  - **Inventory**: View, Create, Update, Delete assets.
  - **Note**: No access to Students, Staff, or Financials.

### 6. Viewer (`viewer`)
- **Description**: Read-only access for guest or oversight purposes.
- **Permissions**:
  - **Dashboard**: View only.
  - **Everything else**: Denied.

---

## Detailed Permissions Map

| Module | Super Admin | Admin | Accountant | Teacher | Inventory Mgr | Viewer |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: |
| **Dashboard** | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| **Students** | ✅ | ✅ | ❌ | ✅ | ❌ | ❌ |
| **Donors** | ✅ | ✅ | View | ❌ | ❌ | ❌ |
| **Donations** | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ |
| **Expenses** | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ |
| **Staff** | ✅ | ✅ | ❌ | ✅ | ❌ | ❌ |
| **Inventory** | ✅ | ✅ | ❌ | ❌ | ✅ | ❌ |
| **Users** | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |

---

## Security Implementation

The system uses **Role-Based Access Control (RBAC)** implemented via:
1. **Frontend**: Navigation links and action buttons are conditionally rendered based on user permissions.
2. **Backend**: Server actions and API routes verify the requestor's role against the required permissions before execution.
3. **Database**: Environment-level security ensures data integrity.
