export interface Subscription {
  id: string;
  subscriptionId: string;
  displayName: string;
  state: 'Enabled' | 'Disabled' | 'Deleted' | 'PastDue' | 'Warned';
  tenantId: string;
}

export interface ResourceGroup {
  id: string;
  name: string;
  location: string;
  tags?: Record<string, string>;
}

export interface CostData {
  id: string;
  name: string;
  type: string;
  totalCost: number;
  currency: string;
  usageStart: string;
  usageEnd: string;
}

export interface RoleAssignment {
  id: string;
  name: string;
  principalId: string;
  principalType: 'User' | 'Group' | 'ServicePrincipal';
  roleDefinitionId: string;
  roleDefinitionName: string;
  scope: string;
}

export interface RoleDefinition {
  id: string;
  name: string;
  roleName: string;
  description: string;
  type: string;
}
