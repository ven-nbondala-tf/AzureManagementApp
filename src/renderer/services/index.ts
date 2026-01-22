// Authentication
export {
  getGraphToken,
  getAzureToken,
  authenticate,
  clearTokens,
  testAuthentication,
} from './azure-auth';

// Azure API (subscriptions, resource groups)
export {
  listSubscriptions,
  listResourceGroups,
} from './azure-api';

// Cost API
export {
  queryCosts,
  queryResourceGroupCosts,
  queryCostTrend,
  exportCostsToCSV,
  exportTrendToCSV,
} from './cost-api';

// RBAC API (role management)
export {
  listRoleDefinitions,
  getCommonRoles,
  listRoleAssignments,
  getRoleAssignmentsWithDetails,
  createRoleAssignment,
  deleteRoleAssignment,
  buildScope,
  checkExistingAssignment,
} from './rbac-api';

// Groups API (Entra ID groups)
export {
  listGroups,
  searchGroups,
  getGroup,
  createGroup,
  updateGroup,
  deleteGroup,
  getGroupMembers,
  addGroupMember,
  addGroupMembers,
  removeGroupMember,
  removeGroupMembers,
  checkMembership,
  searchUsersForMembership,
  searchServicePrincipalsForMembership,
} from './groups-api';

// Service Principal API
export {
  listApplications,
  searchApplications,
  getApplication,
  createApplication,
  createServicePrincipal,
  createAppRegistration,
  deleteApplication,
  addApplicationSecret,
  removeApplicationSecret,
  addFederatedCredential,
  removeFederatedCredential,
  addGitHubFederatedCredential,
  listServicePrincipals,
  searchServicePrincipals,
} from './sp-api';

// Graph API (users)
export {
  searchUsers,
  getUser,
  getServicePrincipal,
} from './graph-api';

// Secret Monitor API
export {
  scanCredentials,
  parseYamlSpList,
  generateCsvReport,
  downloadCsv,
} from './monitor-api';

// Types re-exports
export type {
  CostSummary,
  CostGrouping,
  CostGranularity,
  CostItem,
  CostQueryResult,
} from './cost-api';
