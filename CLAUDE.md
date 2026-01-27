# Azure Management Desktop Application

## Project Overview

This project converts existing PowerShell scripts for Azure resource management into a modern, secure, and feature-ready desktop application.

### Original PowerShell Scripts (D:\PowerShell\Azure)

1. **AzureManagementSuite.ps1** - Main launcher with Cost Management
2. **AzureRBACManager.ps1** - Azure RBAC role assignments
3. **EntraGroupsManager.ps1** - Entra ID group management
4. **Serviceprincipalmanager.ps1** - Service principal & secret management
5. **SPSecretMonitor.ps1** - Secret expiration monitoring

---

## Technology Stack Decision

### Recommended: Electron + React + TypeScript

**Why Electron + React:**

- Modern, responsive UI with React components
- TypeScript for type safety and maintainability
- Official Azure SDKs for JavaScript/TypeScript
- Easy packaging and distribution with electron-builder
- Secure credential storage with electron-store/keytar
- Cross-platform capability (Windows, macOS, Linux)
- Hot module replacement for development
- Large ecosystem and community support

**Alternative Considered:**

- WPF/.NET MAUI: Windows-native but less modern UI libraries
- Tauri: Lighter but less mature ecosystem for enterprise apps
- Python/PyQt: Good but slower UI and larger distribution size

---

## Architecture

```
AzureManagementApp/
├── src/
│   ├── main/                    # Electron main process
│   │   ├── index.ts             # Main entry point
│   │   ├── ipc-handlers.ts      # IPC communication handlers
│   │   ├── secure-storage.ts    # Credential storage (keytar)
│   │   └── updater.ts           # Auto-update logic
│   │
│   ├── renderer/                # React frontend
│   │   ├── App.tsx
│   │   ├── index.tsx
│   │   ├── components/
│   │   │   ├── common/          # Shared UI components
│   │   │   │   ├── Sidebar.tsx
│   │   │   │   ├── Header.tsx
│   │   │   │   ├── DataGrid.tsx
│   │   │   │   ├── Modal.tsx
│   │   │   │   ├── ConfirmationModal.tsx  # Reusable delete confirmations
│   │   │   │   ├── Toast.tsx
│   │   │   │   └── UpdateNotification.tsx
│   │   │   ├── auth/
│   │   │   │   ├── ConfigSelector.tsx
│   │   │   │   └── ConnectionStatus.tsx
│   │   │   └── modules/         # Feature modules
│   │   │       ├── CostManagement/
│   │   │       ├── RBACManager/
│   │   │       ├── GroupsManager/
│   │   │       ├── ServicePrincipalManager/
│   │   │       └── SecretMonitor/
│   │   │
│   │   ├── hooks/               # Custom React hooks
│   │   │   ├── useAzureAuth.ts
│   │   │   ├── useSubscriptions.ts
│   │   │   └── useGraphAPI.ts
│   │   │
│   │   ├── services/            # API services
│   │   │   ├── api-fetch.ts      # IPC proxy for production builds
│   │   │   ├── azure-api.ts
│   │   │   ├── graph-api.ts
│   │   │   └── cost-api.ts
│   │   │
│   │   ├── store/               # State management (Zustand)
│   │   │   ├── authStore.ts
│   │   │   ├── subscriptionStore.ts
│   │   │   └── configStore.ts
│   │   │
│   │   ├── types/               # TypeScript definitions
│   │   │   ├── azure.ts
│   │   │   ├── graph.ts
│   │   │   └── config.ts
│   │   │
│   │   └── styles/              # CSS/Tailwind styles
│   │
│   └── preload/                 # Electron preload scripts
│       └── index.ts
│
├── public/                      # Static assets
├── electron-builder.json        # Build configuration
├── package.json
├── tsconfig.json
├── vite.config.ts               # Vite bundler config
└── claude.md                    # This file
```

---

## Module Specifications

### 1. Authentication & Configuration Module

**Purpose:** Centralized authentication using Service Principal credentials

**Features:**

- Load configuration from file (same format as current .txt files)
- Secure credential storage using OS keychain (keytar)
- Token management (Graph API + Azure Management API)
- Auto-refresh tokens before expiry
- Multiple config profiles support

**Security:**

- Credentials stored in Windows Credential Manager (via keytar)
- Tokens kept in memory only, never persisted
- Config file validation before use
- Clear credentials on app close

### 2. Cost Management Module

**Source:** AzureManagementSuite.ps1 (cost functions)

**Features:**

- View costs by subscription/resource group/service/resource
- Date range selection with quick filters
- Monthly cost trends
- Export to CSV
- Cost comparison between periods

**API Endpoints:**

- `POST /subscriptions/{id}/providers/Microsoft.CostManagement/query`

### 3. RBAC Manager Module

**Source:** AzureRBACManager.ps1

**Features:**

- Search users/groups/service principals
- Assign/remove role assignments
- Support subscription/RG/resource scope
- Time-bound assignments (PIM)
- View existing assignments

**API Endpoints:**

- `GET/PUT/DELETE /providers/Microsoft.Authorization/roleAssignments`
- `PUT /providers/Microsoft.Authorization/roleAssignmentScheduleRequests` (PIM)

### 4. Entra Groups Manager Module

**Source:** EntraGroupsManager.ps1

**Features:**

- Create/delete security and M365 groups
- Add/remove members (users and service principals)
- Search users and service principals
- Bulk member operations
- View group members

**API Endpoints:**

- Microsoft Graph: `/groups`, `/users`, `/servicePrincipals`

### 5. Service Principal Manager Module

**Source:** Serviceprincipalmanager.ps1

**Features:**

- Create app registrations with service principals
- Generate/delete client secrets
- Add/remove federated identity credentials (GitHub OIDC)
- View secret expiration dates
- Copy credentials to clipboard

**API Endpoints:**

- Microsoft Graph: `/applications`, `/servicePrincipals`
- `/applications/{id}/addPassword`, `/applications/{id}/federatedIdentityCredentials`

### 6. Secret Monitor Module

**Source:** SPSecretMonitor.ps1

**Features:**

- Scan all or specific service principals
- Show expiring/expired secrets and certificates
- Color-coded status (expired/expiring soon/OK)
- Export reports to CSV
- YAML file support for SP list

---

## Implementation Phases

### Phase 1: Project Setup & Core Infrastructure

- [x] Initialize Electron + React + TypeScript project
- [x] Set up Vite for fast development
- [x] Configure electron-builder for packaging
- [x] Implement secure credential storage
- [x] Create authentication service
- [x] Build basic UI shell with navigation

### Phase 2: Authentication & Subscription Loading

- [x] Config file reader (compatible with existing format)
- [x] Token acquisition for Graph API and Azure Management API
- [x] Subscription loading from management groups/direct
- [x] Connection status indicator
- [x] Error handling and retry logic

### Phase 3: Cost Management Module

- [x] Date range picker with quick filters
- [x] Cost query API integration
- [x] Results display in sortable/filterable grid
- [x] Charts for cost visualization
- [x] CSV export functionality
- [x] Top 10 Consumers widget
- [x] Cost by Resource (individual) grouping
- [x] Month-over-Month Comparison

### Phase 4: RBAC Manager Module

- [x] User/Group/SP search with debouncing
- [x] Role selection with autocomplete
- [x] Scope selection (subscription/RG/resource)
- [x] Role assignment creation/deletion
- [x] Principal name resolution (displays names instead of IDs)
- [x] Confirmation modal for deletions
- [ ] Time-bound assignment support (PIM)

### Phase 5: Groups Manager Module

- [x] Group CRUD operations
- [x] Member search and selection
- [x] Bulk add/remove members
- [x] Multi-select from search results
- [x] Confirmation modal for deletions

### Phase 6: Service Principal Manager Module

- [x] App registration creation
- [x] Secret generation with secure display
- [x] Federated credential management (GitHub focus)
- [x] Quick actions for common operations
- [x] Copy to clipboard for long values
- [x] Fixed horizontal scroll issues
- [x] Expiration countdown with color coding

### Phase 7: Secret Monitor Module

- [x] Full scan capability
- [x] YAML file import
- [x] Status-based filtering and coloring
- [x] Multi-select Service Principal picker
- [x] Favorites system with persistence (electron-store)
- [ ] Scheduled scan option
- [ ] Email notification integration (optional)

### Phase 8: Polish & Distribution

- [x] Auto-update functionality
- [x] Installer creation (NSIS)
- [x] Documentation
- [x] Error tracking/logging
- [ ] Performance optimization (ongoing)

---

## Key Dependencies

```json
{
  "dependencies": {
    "@azure/identity": "^4.x",
    "@azure/arm-resources": "^5.x",
    "@azure/arm-costmanagement": "^2.x",
    "@microsoft/microsoft-graph-client": "^3.x",
    "electron-store": "^8.x",
    "keytar": "^7.x",
    "react": "^18.x",
    "react-router-dom": "^6.x",
    "zustand": "^4.x",
    "@tanstack/react-query": "^5.x",
    "tailwindcss": "^3.x",
    "@headlessui/react": "^1.x",
    "date-fns": "^3.x",
    "recharts": "^2.x"
  },
  "devDependencies": {
    "electron": "^28.x",
    "electron-builder": "^24.x",
    "vite": "^5.x",
    "@vitejs/plugin-react": "^4.x",
    "typescript": "^5.x"
  }
}
```

---

## Security Considerations

1. **Credential Storage:**
   - Use keytar for OS-level secure storage
   - Never store secrets in plain text or electron-store
   - Clear tokens on app close

2. **API Communication:**
   - All API calls use HTTPS
   - Token refresh before expiry
   - Proper error handling for auth failures

3. **Input Validation:**
   - Validate all user inputs
   - Sanitize data before API calls
   - Handle malformed config files gracefully

4. **Code Signing:**
   - Sign the application for distribution
   - Use electron-builder's code signing support

---

## Installation & Distribution

### Development

```bash
npm install
npm run dev
```

### Unit Testing

The project uses Vitest with React Testing Library for testing.

```bash
npm test              # Run tests in watch mode
npm run test:run      # Run tests once
npm run test:coverage # Run with coverage report
npm run test:ui       # Run with Vitest UI
```

**Test Configuration:**
- `vitest.config.ts` - Test runner configuration
- `src/test/setup.ts` - Global mocks (Electron API, browser APIs)
- `src/test/mocks/electron.ts` - Electron module mocks

**Test Locations:**
- `src/renderer/store/__tests__/` - Zustand store tests
- `src/renderer/services/__tests__/` - API service tests
- `src/renderer/components/__tests__/` - Component tests

### Building Production Executables

#### Prerequisites
1. Node.js 18+ installed
2. All dependencies installed (`npm install`)
3. No syntax/type errors in code

#### Step-by-Step Build Process

```bash
# 1. Run tests to ensure code quality
npm run test:run

# 2. Build for Windows (creates both NSIS installer and portable)
npm run build:win
```

#### Build Output

After successful build, executables are created in the `release/` folder:

| File | Description | Size |
|------|-------------|------|
| `Azure Management App-{version}-win-x64.exe` | NSIS Installer | ~91 MB |
| `Azure Management App-{version}-portable.exe` | Portable (no install) | ~91 MB |

#### Build Commands Reference

```bash
npm run build        # Build for current platform
npm run build:win    # Build for Windows (NSIS + portable)
npm run build:mac    # Build for macOS (DMG + ZIP)
npm run build:linux  # Build for Linux (AppImage + deb + rpm)
```

#### Troubleshooting Build Issues

**1. Code Signing Errors (Windows)**
```
Cannot create symbolic link: A required privilege is not held
```
**Solution:** Code signing is disabled by default (`signAndEditExecutable: false` in electron-builder.json). For production distribution, obtain a code signing certificate and enable signing.

**2. Icon Errors**
```
icon directory doesn't contain icons
```
**Solution:** Either add icons to `build/` folder or remove icon references from electron-builder.json.

**3. Cache Corruption**
If builds fail unexpectedly, clear the electron-builder cache:
```bash
rm -rf ~/AppData/Local/electron-builder/Cache
```

**4. TypeScript Build Cache (Preload Script)**
If preload script changes aren't reflected in production builds:
```bash
npx tsc -b --clean && npx tsc -b
```
This cleans and rebuilds all TypeScript project references (main, preload, renderer).

#### Build Configuration

Build settings are in `electron-builder.json`:
- `win.target` - Windows targets (nsis, portable)
- `nsis` - Installer options (one-click, shortcuts, etc.)
- `asar` - Package app into asar archive (enabled)
- `compression` - Set to "maximum" for smaller builds

### Distribution Formats

- **Windows:** NSIS installer (.exe), portable (.exe)
- **macOS:** DMG, ZIP (for both x64 and arm64)
- **Linux:** AppImage, deb, rpm

### Auto-Update

- Uses electron-updater with GitHub releases
- Configure `publish` in electron-builder.json with your GitHub repo
- Silent background updates with user notification

---

## Config File Format (Backward Compatible)

```txt
# Azure Service Principal Configuration
ClientId = xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
TenantId = xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
ClientSecret = your-client-secret-here
```

---

## UI/UX Design Principles

1. **Modern & Clean:** Use Tailwind CSS with a professional color scheme
2. **Responsive:** Support different window sizes
3. **Keyboard Navigation:** Full keyboard support for power users
4. **Dark Mode:** Support system theme preference
5. **Consistent Patterns:** Similar workflows across modules
6. **Clear Feedback:** Loading states, success/error toasts
7. **Accessible:** ARIA labels, proper contrast ratios

---

## Current Status

- [x] Requirements analysis complete
- [x] Architecture defined
- [x] Technology stack selected
- [x] Project initialization
- [x] Core infrastructure
- [x] Module implementation (all core modules complete)
- [x] Unit testing setup (Vitest + React Testing Library, 38 tests)
- [x] Distribution setup
- [x] Production build created (NSIS installer + portable)
- [x] GitHub repository initialized

---

## Completed Features (January 2026)

### Cost Management Enhancements

- **Top 10 Consumers Widget**: Quick view of highest-cost items
- **Cost by Resource Grouping**: Individual resource cost breakdown (new grouping option)
- **Month-over-Month Comparison**: Period comparison with delta and percentage change
- **Improved Layout**: 4-column summary cards, reorganized chart placement

### RBAC Manager Improvements

- **Tabbed Scope Selection**: Intuitive interface with Subscription/Resource Group/Resource tabs
- **Resource-Level RBAC**: Grant or remove access at individual resource level
- **Search & Filtering**: Search by name, filter by role and principal type
- **Active Filters Display**: Visual chips showing active filters with clear buttons
- **Pre-populated Modal**: Add Assignment modal inherits current scope context
- **Resource Picker**: Dynamic resource loading based on selected resource group
- **Principal Name Resolution**: Displays user/group/SP names instead of raw IDs
- **Batch Name Resolution**: Efficient API calls with caching (1-hour TTL)
- **Confirmation Modal**: Full-context modal for role assignment deletions
- **Delete Error Display**: Error messages shown inside confirmation modal instead of silently swallowed

### Groups Manager Improvements

- **Nested Group Support**: Add AD groups as members to other groups
- **Service Principal Display Fix**: Correctly identifies and displays service principals in member list
- **Member Type Detection**: Multiple fallback methods for accurate type detection
- **Group Search for Membership**: Excludes current group to prevent circular references
- **Type-Cast Member Fetching**: Fetches users, service principals, and groups via separate type-specific Graph API endpoints to work with limited permissions

### Key Vault Manager (New Module)

- **Secret Management**: List, view, create, update, and delete Key Vault secrets
- **Version History**: View all versions of a secret with timestamps
- **CSP Bypass**: All Key Vault API calls routed through Electron main process via IPC
- **Dynamic Vault URLs**: Supports any Key Vault regardless of subdomain

### Service Principal Manager Fixes

- **Horizontal Scroll Fix**: Proper overflow handling with `min-w-0` and `break-all`
- **Copy Buttons**: Added copy functionality for long values (issuer, subject, keyId)
- **Improved Secrets Display**: Color-coded expiration badges (expired/critical/warning/healthy)
- **Responsive Layout**: Better handling of long URLs in federated credentials

### Secret Monitor Enhancements

- **Multi-Select SP Picker**: Searchable modal for selecting specific service principals
- **Favorites System**: Save and load SP selections with persistence
- **Quick Actions**: Scan All, Scan Selected, or Scan from YAML
- **Improved UX**: Selected items displayed as chips with easy removal

### Shared Components

- **ConfirmationModal**: Reusable component for destructive action confirmations
- **Consistent Delete Pattern**: All modules use modal confirmations

---

## Known Limitations

1. **Graph API Restrictions**
   - `$orderby` not supported for groups/apps/servicePrincipals (client-side sorting used)
   - Principal name resolution requires additional API calls per principal
   - Generic `/groups/{id}/members` may not return all member types without `Directory.Read.All` (workaround: type-cast endpoints)

2. **Cost Management**
   - Cost Forecast and Anomaly Detection deferred for future enhancement
   - Cost by Tag grouping requires tag selector (not yet implemented)

3. **RBAC Manager**
   - PIM (time-bound assignments) support not yet implemented
   - Principal names may show as ID if deleted or inaccessible

4. **Rate Limiting**
   - Microsoft Graph: 120 requests/60 seconds (batch resolve uses chunking)
   - Azure Management API: Varies by endpoint

---

## Recent Bug Fixes

- **Production Build Networking**: All API calls now route through Electron's main process via IPC proxy
- **HashRouter for Production**: Replaced BrowserRouter with HashRouter for file:// protocol compatibility
- **Electron net Module**: Authentication and API calls use Electron's `net` module instead of native `fetch`
- **CORS Fix**: Authentication token acquisition moved to main process
- **$orderby Removal**: Client-side sorting for all Graph API list operations
- **Horizontal Scroll**: Fixed layout overflow in federated credentials display
- **Principal Names**: Now resolved via batch Graph API calls instead of empty field
- **Key Vault CSP**: Moved Key Vault data plane API calls to main process via IPC
- **Service Principal in Groups**: Fixed `@odata.type` detection by removing `$select` clause
- **RBAC Delete Error Handling**: Delete errors now displayed in confirmation modal instead of silently swallowed
- **Group Members Missing Types**: Generic `/members` endpoint filtered out SPs and groups without `Directory.Read.All`; switched to type-cast endpoints (`/members/microsoft.graph.user`, `.servicePrincipal`, `.group`) that work with existing per-type permissions

---

## Latest Session - Technical Implementation Details

### Files Modified

#### RBAC Manager Rewrite
- `src/renderer/components/modules/RBACManager/index.tsx` - Complete UI rewrite
  - Added `ScopeLevel` type for tab management
  - Added `SCOPE_ICONS` mapping for visual indicators
  - Implemented tabbed scope selection (Subscription/Resource Group/Resource)
  - Added search input with debouncing
  - Added role and type filter dropdowns
  - Added active filters display with clear functionality
  - Modal pre-populates from current view context

- `src/renderer/services/rbac-api.ts` - Added resource listing
  ```typescript
  export interface AzureResource {
    id: string;
    name: string;
    type: string;
    location: string;
    resourceGroup: string;
  }

  export async function listResources(
    config: AuthConfig,
    subscriptionId: string,
    resourceGroupName?: string
  ): Promise<AzureResource[]>
  ```

- `src/renderer/hooks/useRBAC.ts` - Added `useResources` hook
- `src/renderer/hooks/index.ts` - Export updates

#### Groups Manager Fixes
- `src/renderer/services/groups-api.ts`
  - Removed `$select` clause from `getGroupMembers` to ensure `@odata.type` is returned
  - Added fallback type detection for service principals
  - Added `searchGroupsForMembership` function for nested group support

- `src/renderer/hooks/useGroups.ts`
  - Updated `MemberSearchResult` type to include `'Group'`
  - Updated `useMemberSearch` hook to support group search

- `src/renderer/components/modules/GroupsManager/index.tsx`
  - Added `includeGroups` toggle in AddMembersModal
  - Added Group icon and type handling

#### Key Vault Manager (New)
- `src/main/ipc-handlers.ts` - Added Key Vault IPC handlers
  - `keyvault:list-secrets`
  - `keyvault:get-secret-value`
  - `keyvault:set-secret`
  - `keyvault:delete-secret`
  - `keyvault:list-versions`
  - `keyvault:update-attributes`
  - Helper: `ensureKeyVaultToken` for token management

- `src/preload/index.ts` - Exposed Key Vault API to renderer
  ```typescript
  keyVault: {
    listSecrets: (params) => ipcRenderer.invoke('keyvault:list-secrets', params),
    getSecretValue: (params) => ipcRenderer.invoke('keyvault:get-secret-value', params),
    setSecret: (params) => ipcRenderer.invoke('keyvault:set-secret', params),
    deleteSecret: (params) => ipcRenderer.invoke('keyvault:delete-secret', params),
    listVersions: (params) => ipcRenderer.invoke('keyvault:list-versions', params),
    updateAttributes: (params) => ipcRenderer.invoke('keyvault:update-attributes', params),
  }
  ```

- `src/renderer/types/electron.d.ts` - Type declarations for Key Vault API
- `src/renderer/services/keyvault-api.ts` - IPC-based implementation

#### Configuration Changes
- `vite.config.ts` - Port changed to 5200
- `package.json` - Dev server port updated
- `src/main/index.ts` - Electron dev server port updated

### Key Patterns Used

1. **IPC for CSP Bypass**: When Electron's CSP blocks dynamic URLs (like Key Vault subdomains), route API calls through main process:
   ```typescript
   // In preload/index.ts
   keyVault: {
     listSecrets: (params) => ipcRenderer.invoke('keyvault:list-secrets', params),
   }

   // In main/ipc-handlers.ts
   ipcMain.handle('keyvault:list-secrets', async (_, params) => {
     const response = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
     return response.json();
   });
   ```

2. **Member Type Detection Fallback**:
   ```typescript
   const odataType = member['@odata.type'] || '';
   if (odataType.includes('servicePrincipal') ||
       member.servicePrincipalType ||
       (member.appId && !member.userPrincipalName)) {
     type = 'ServicePrincipal';
   }
   ```

3. **Scope Hierarchy for RBAC**:
   ```typescript
   type ScopeLevel = 'subscription' | 'resourceGroup' | 'resource';
   // Each level enables the next selector
   ```

---

## Next Steps

1. Implement PIM support for time-bound role assignments
2. Add scheduled scanning for Secret Monitor
3. Implement Cost Forecast based on current spend rate
4. Add automated testing suite
5. Performance optimization review

---

## Reference: Original Script Functionality Mapping

| PowerShell Function       | New Location                             |
| ------------------------- | ---------------------------------------- |
| `Read-ConfigFile`         | `src/main/secure-storage.ts`             |
| `Get-GraphAccessToken`    | `src/renderer/services/graph-api.ts`     |
| `Get-AzureAccessToken`    | `src/renderer/services/azure-api.ts`     |
| `Get-AllSubscriptions`    | `src/renderer/hooks/useSubscriptions.ts` |
| `Get-SubscriptionCost`    | `src/renderer/services/cost-api.ts`      |
| `Get-RoleDefinitionId`    | `src/renderer/services/rbac-api.ts`      |
| `New-EntraGroup`          | `src/renderer/services/groups-api.ts`    |
| `New-ApplicationSecret`   | `src/renderer/services/sp-api.ts`        |
| `Get-ExpiringCredentials` | `src/renderer/services/monitor-api.ts`   |

---

## GitHub Repository

**URL:** https://github.com/ven-nbondala-tf/AzureManagementApp

```bash
# Clone the repository
git clone https://github.com/ven-nbondala-tf/AzureManagementApp.git
cd AzureManagementApp
npm install
npm run dev
```

---

## Session History

### Session: January 22, 2026

**Accomplishments:**
1. **Unit Testing Setup**
   - Installed Vitest 1.6.0, React Testing Library, jsdom 24.0.0
   - Created `vitest.config.ts` with path aliases and coverage settings
   - Created `src/test/setup.ts` with mocks for Electron API, matchMedia, ResizeObserver, clipboard
   - Created `src/test/mocks/electron.ts` for Electron module mocking
   - Wrote 38 passing tests:
     - `authStore.test.ts` (8 tests)
     - `subscriptionStore.test.ts` (8 tests)
     - `rbac-api.test.ts` (6 tests)
     - `Header.test.tsx` (10 tests)
     - `Modal.test.tsx` (6 tests)

2. **Production Build**
   - Fixed code signing issues (`signAndEditExecutable: false`)
   - Cleared corrupted winCodeSign cache
   - Successfully built Windows executables:
     - `Azure Management App-1.0.0-win-x64.exe` (91.2 MB NSIS installer)
     - `Azure Management App-1.0.0-portable.exe` (91 MB portable)

3. **Git Repository**
   - Initialized git repo
   - Updated `.gitignore` (added .claude/, *.tsbuildinfo, azurite files)
   - Created initial commit (78 files, 27,089 insertions)
   - Pushed to GitHub: https://github.com/ven-nbondala-tf/AzureManagementApp

4. **Documentation**
   - Added comprehensive build documentation to CLAUDE.md
   - Added unit testing documentation
   - Added troubleshooting guide for common build issues

**Port Configuration:**
- Dev server runs on port **5200** (configured in vite.config.ts, package.json, src/main/index.ts)

**Key Files Created This Session:**
- `vitest.config.ts`
- `src/test/setup.ts`
- `src/test/mocks/electron.ts`
- `src/renderer/store/__tests__/authStore.test.ts`
- `src/renderer/store/__tests__/subscriptionStore.test.ts`
- `src/renderer/services/__tests__/rbac-api.test.ts`
- `src/renderer/components/__tests__/Header.test.tsx`
- `src/renderer/components/__tests__/Modal.test.tsx`

### Session: January 22, 2026 (Evening) - Production Build Fixes

**Problem:** Application worked in dev mode but failed in production builds with "fetch failed" errors.

**Root Causes Identified:**
1. Native `fetch` in main process fails in packaged Electron apps (proxy/cert issues)
2. `fetch` from renderer fails when loaded from `file://` protocol
3. `BrowserRouter` doesn't work with `file://` protocol
4. TypeScript build cache wasn't rebuilding preload script

**Fixes Implemented:**

1. **Electron net Module for Main Process**
   - Created `electronFetch()` helper using Electron's `net.request()` API
   - Handles system proxies and SSL certificates correctly in production
   - File: `src/main/ipc-handlers.ts`

2. **IPC Proxy for Renderer API Calls**
   - Added `proxy-fetch` IPC handler in main process
   - Created `src/renderer/services/api-fetch.ts` utility
   - Updated all 8 service files to use `apiFetch()` instead of native `fetch`:
     - `azure-api.ts`, `graph-api.ts`, `cost-api.ts`, `rbac-api.ts`
     - `groups-api.ts`, `sp-api.ts`, `monitor-api.ts`, `keyvault-api.ts`

3. **HashRouter for Production**
   - Changed `BrowserRouter` to `HashRouter` in `src/renderer/App.tsx`
   - URLs now use hash format (`/#/costs`) which works with `file://` protocol

4. **TypeScript Build Fix**
   - Need `tsc -b --clean` to rebuild preload script when adding new IPC methods
   - Added troubleshooting note to documentation

**Files Modified:**
- `src/main/ipc-handlers.ts` - Added `electronFetch()` and `proxy-fetch` handler
- `src/preload/index.ts` - Exposed `proxyFetch` to renderer
- `src/renderer/App.tsx` - BrowserRouter → HashRouter
- `src/renderer/services/api-fetch.ts` - New file (IPC fetch wrapper)
- `src/renderer/services/*.ts` - All 8 service files updated
- `src/renderer/types/electron.d.ts` - Added `ProxyFetchResponse` type

**Key Pattern - Production API Calls:**
```typescript
// In renderer service (e.g., azure-api.ts)
import { apiFetch } from './api-fetch';

const response = await apiFetch(url, {
  method: 'GET',
  headers: { Authorization: `Bearer ${token}` },
});

// apiFetch routes through IPC → main process → electronFetch → net.request
```

**Build Commands for Clean Production Build:**
```bash
npx tsc -b --clean && npm run build:win
```

### Session: January 27, 2026 - Bug Fixes & Group Member Visibility

**Accomplishments:**

1. **RBAC Delete Error Display**
   - Added `error` prop to `ConfirmationModal` component (red banner between message and actions)
   - Added `deleteErrorMsg` state in RBAC Manager to capture and display deletion errors
   - Error clears on retry and on modal close
   - Files: `src/renderer/components/common/ConfirmationModal.tsx`, `src/renderer/components/modules/RBACManager/index.tsx`

2. **Group Members - Service Principals & Nested Groups Not Showing**
   - **Root Cause**: The generic `/groups/{id}/members` Graph API endpoint filters out member types the service principal lacks specific read permissions for. Without `Directory.Read.All`, only users were returned.
   - **Fix**: Replaced single `/members` call with three parallel type-cast endpoint calls:
     - `/groups/{id}/members/microsoft.graph.user` (uses `User.Read.All`)
     - `/groups/{id}/members/microsoft.graph.servicePrincipal` (uses `Application.ReadWrite.All`)
     - `/groups/{id}/members/microsoft.graph.group` (uses `Group.ReadWrite.All`)
   - Each call uses the existing per-type permission, no admin consent needed
   - File: `src/renderer/services/groups-api.ts`

3. **Production Build**
   - Built new Windows executables with all fixes
   - Portable exe placed on Desktop

**Key Pattern - Type-Cast Member Fetching:**
```typescript
// Fetch all member types in parallel using type-specific endpoints
const [users, servicePrincipals, groups] = await Promise.all([
  fetchAllPages(`/groups/${groupId}/members/microsoft.graph.user?$top=100`).catch(() => []),
  fetchAllPages(`/groups/${groupId}/members/microsoft.graph.servicePrincipal?$top=100`).catch(() => []),
  fetchAllPages(`/groups/${groupId}/members/microsoft.graph.group?$top=100`).catch(() => []),
]);
```

**Key Files Modified:**
- `src/renderer/components/common/ConfirmationModal.tsx` - Added `error` prop
- `src/renderer/components/modules/RBACManager/index.tsx` - Delete error state management
- `src/renderer/services/groups-api.ts` - Type-cast member fetching

**Azure RBAC Permissions Note:**
- The service principal (`github_databricks`) gets `User Access Administrator` on the `TFFI` management group via group membership (`grp_azr_vendor_tffi_user-access-administrator`)
- Subscription `543fb3c7-...` (D365 Dev/Test) is under the `TFFI` management group
- RBAC changes can take 5-10 minutes to propagate

---

## Contact & Continuation

This claude.md file contains all context needed to continue development in a new conversation. Reference this file when starting new sessions to maintain continuity.
