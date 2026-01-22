export interface User {
  id: string;
  displayName: string;
  userPrincipalName: string;
  mail?: string;
  jobTitle?: string;
}

export interface Group {
  id: string;
  displayName: string;
  description?: string;
  groupTypes: string[];
  mailEnabled: boolean;
  mailNickname: string;
  securityEnabled: boolean;
  membershipRule?: string;
  membershipRuleProcessingState?: 'On' | 'Paused';
}

export interface ServicePrincipal {
  id: string;
  appId: string;
  displayName: string;
  servicePrincipalType: string;
}

export interface Application {
  id: string;
  appId: string;
  displayName: string;
  signInAudience: string;
  passwordCredentials: PasswordCredential[];
  keyCredentials: KeyCredential[];
  federatedIdentityCredentials?: FederatedIdentityCredential[];
}

export interface PasswordCredential {
  customKeyIdentifier?: string;
  displayName?: string;
  endDateTime: string;
  hint?: string;
  keyId: string;
  secretText?: string;
  startDateTime: string;
}

export interface KeyCredential {
  customKeyIdentifier?: string;
  displayName?: string;
  endDateTime: string;
  key?: string;
  keyId: string;
  startDateTime: string;
  type: string;
  usage: string;
}

export interface FederatedIdentityCredential {
  id: string;
  name: string;
  issuer: string;
  subject: string;
  audiences: string[];
  description?: string;
}

export interface ExpiringCredential {
  applicationId: string;
  applicationName: string;
  credentialType: 'Secret' | 'Certificate';
  displayName?: string;
  expirationDate: string;
  daysUntilExpiry: number;
  status: 'Expired' | 'ExpiringSoon' | 'OK';
}
