import { describe, it, expect } from 'vitest';
import { buildScope } from '../rbac-api';

describe('rbac-api', () => {
  describe('buildScope', () => {
    it('should return resourceId when provided', () => {
      const result = buildScope(
        'sub-123',
        'rg-name',
        '/subscriptions/sub-123/resourceGroups/rg-name/providers/Microsoft.Compute/virtualMachines/vm-1'
      );
      expect(result).toBe(
        '/subscriptions/sub-123/resourceGroups/rg-name/providers/Microsoft.Compute/virtualMachines/vm-1'
      );
    });

    it('should build resource group scope when resourceGroupName is provided', () => {
      const result = buildScope('sub-123', 'my-resource-group');
      expect(result).toBe('/subscriptions/sub-123/resourceGroups/my-resource-group');
    });

    it('should build subscription scope when only subscriptionId is provided', () => {
      const result = buildScope('sub-123');
      expect(result).toBe('/subscriptions/sub-123');
    });

    it('should handle subscription IDs with different formats', () => {
      const result = buildScope('12345678-1234-1234-1234-123456789012');
      expect(result).toBe('/subscriptions/12345678-1234-1234-1234-123456789012');
    });

    it('should handle resource group names with special characters', () => {
      const result = buildScope('sub-123', 'my-rg-name-123');
      expect(result).toBe('/subscriptions/sub-123/resourceGroups/my-rg-name-123');
    });

    it('should prioritize resourceId over resourceGroupName', () => {
      const resourceId = '/subscriptions/sub-123/resourceGroups/rg/providers/Microsoft.Storage/storageAccounts/sa1';
      const result = buildScope('sub-456', 'different-rg', resourceId);
      expect(result).toBe(resourceId);
    });
  });
});
