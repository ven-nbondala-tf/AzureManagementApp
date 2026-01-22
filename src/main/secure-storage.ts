import * as keytar from 'keytar';
import * as fs from 'fs/promises';

const SERVICE_NAME = 'AzureManagementApp';

export interface AzureConfig {
  clientId: string;
  tenantId: string;
  clientSecret: string;
}

export class SecureStorage {
  /**
   * Load and parse a configuration file in the format:
   * ClientId = xxx
   * TenantId = xxx
   * ClientSecret = xxx
   */
  async loadConfigFile(filePath: string): Promise<AzureConfig> {
    const content = await fs.readFile(filePath, 'utf-8');
    const lines = content.split('\n');

    const config: Partial<AzureConfig> = {};

    for (const line of lines) {
      const trimmedLine = line.trim();

      // Skip comments and empty lines
      if (!trimmedLine || trimmedLine.startsWith('#')) {
        continue;
      }

      const [key, ...valueParts] = trimmedLine.split('=');
      if (key && valueParts.length > 0) {
        const cleanKey = key.trim().toLowerCase();
        const value = valueParts.join('=').trim();

        switch (cleanKey) {
          case 'clientid':
            config.clientId = value;
            break;
          case 'tenantid':
            config.tenantId = value;
            break;
          case 'clientsecret':
            config.clientSecret = value;
            break;
        }
      }
    }

    // Validate required fields
    if (!config.clientId || !config.tenantId || !config.clientSecret) {
      throw new Error(
        'Invalid config file. Required fields: ClientId, TenantId, ClientSecret'
      );
    }

    return config as AzureConfig;
  }

  /**
   * Store a credential in the OS keychain
   */
  async storeCredential(key: string, value: string): Promise<void> {
    await keytar.setPassword(SERVICE_NAME, key, value);
  }

  /**
   * Retrieve a credential from the OS keychain
   */
  async getCredential(key: string): Promise<string | null> {
    return await keytar.getPassword(SERVICE_NAME, key);
  }

  /**
   * Delete a credential from the OS keychain
   */
  async deleteCredential(key: string): Promise<boolean> {
    return await keytar.deletePassword(SERVICE_NAME, key);
  }

  /**
   * Clear all credentials for this application
   */
  async clearAllCredentials(): Promise<void> {
    const credentials = await keytar.findCredentials(SERVICE_NAME);
    for (const cred of credentials) {
      await keytar.deletePassword(SERVICE_NAME, cred.account);
    }
  }

  /**
   * Store the Azure config credentials securely
   */
  async storeConfig(config: AzureConfig, profileName: string = 'default'): Promise<void> {
    await this.storeCredential(`${profileName}:clientId`, config.clientId);
    await this.storeCredential(`${profileName}:tenantId`, config.tenantId);
    await this.storeCredential(`${profileName}:clientSecret`, config.clientSecret);
  }

  /**
   * Retrieve stored Azure config
   */
  async getConfig(profileName: string = 'default'): Promise<AzureConfig | null> {
    const clientId = await this.getCredential(`${profileName}:clientId`);
    const tenantId = await this.getCredential(`${profileName}:tenantId`);
    const clientSecret = await this.getCredential(`${profileName}:clientSecret`);

    if (!clientId || !tenantId || !clientSecret) {
      return null;
    }

    return { clientId, tenantId, clientSecret };
  }
}
