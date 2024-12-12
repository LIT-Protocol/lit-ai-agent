import { readFileSync, writeFileSync, existsSync } from 'fs';

/**
 * Safe PKP Configuration Interface
 * ------------------------------
 * Defines the structure for Safe PKP system configuration.
 * 
 * Components:
 * 1. PKP Information
 * 2. Contract Addresses
 * 3. Network Configuration
 * 4. Owner Settings
 * 
 * @property pkp - PKP token information and credentials
 * @property safeAddress - Deployed Safe contract address
 * @property pkpToolsAddress - Tools contract address
 * @property chainId - Network chain identifier
 * @property owners - Array of owner addresses
 * @property threshold - Required signature threshold
 * @property network - Network configuration details
 * @property deploymentTimestamp - Initial deployment time
 * @property capacityTokenId - Capacity token ID
 */
interface Config {
    pkp: any;
    safeAddress: string;
    pkpToolsAddress: string;
    chainId: number;
    owners: string[];
    threshold: number;
    network: {
      name: string;
      rpcUrl: string;
      chainId: number;
    };
    deploymentTimestamp: string;
    capacityTokenId?: string;
  }

  /**
 * Configuration Management System
 * -----------------------------
 * Handles Safe PKP configuration persistence and validation.
 * 
 * Core Features:
 * 1. Configuration file management
 * 2. Validation checks
 * 3. Deployment verification
 * 
 * File Structure:
 * - Main config: safe-pkp-config.json
 */
export class ConfigManager {
  private readonly configPath: string;
  private config: Config | null = null;

  /**
   * Configuration Manager Constructor
   * ------------------------------
   * Initializes configuration path.
   * 
   * @param configPath - Path to configuration file
   */
  constructor(configPath: string = 'safe-pkp-config.json') {
    this.configPath = configPath;
  }

  /**
   * Configuration Loader
   * ------------------
   * Loads configuration from filesystem.
   * 
   * Process:
   * 1. Attempts to load configuration
   * 2. Returns null if not found
   * 
   * @returns Loaded configuration or null
   */
  public loadConfig(): Config | null {
    try {
      if (existsSync(this.configPath)) {
        const configData = readFileSync(this.configPath, 'utf8');
        this.config = JSON.parse(configData);
        return this.config;
      }
      return null;
    } catch (error) {
      console.error('Error loading config:', error);
      return null;
    }
  }

  /**
   * Configuration Persistence Handler
   * ------------------------------
   * Saves configuration to filesystem.
   * 
   * Process:
   * 1. Merges new config with existing
   * 2. Updates timestamps
   * 3. Writes to filesystem
   * 
   * @param configData - New configuration to save
   * @throws Error if save operation fails
   */
  public saveConfig(configData: Partial<Config>): void {
    try {
      const existingConfig = this.loadConfig();
      
      const newConfig: Config = {
        ...existingConfig,
        ...configData,
        lastUpdated: new Date().toISOString(),
        deploymentTimestamp: existingConfig?.deploymentTimestamp || new Date().toISOString(),
      } as Config;

      writeFileSync(this.configPath, JSON.stringify(newConfig, null, 2));
      this.config = newConfig;
      console.log('Configuration saved successfully');
    } catch (error) {
      console.error('Error saving config:', error);
      throw error;
    }
  }

  /**
   * Configuration Validator
   * ---------------------
   * Verifies completeness and validity of configuration.
   * 
   * Checks:
   * 1. PKP information
   * 2. Contract addresses
   * 3. Network settings
   * 4. Owner configuration
   * 
   * @returns True if configuration is valid
   */
  public validateConfig(): boolean {
    if (!this.config) return false;

    const requiredFields = [
      'pkp',
      'safeAddress',
      'pkpToolsAddress',
      'chainId',
      'owners',
      'threshold',
      'network'
    ];

    return requiredFields.every(field => {
      const value = this.config![field as keyof Config];
      return value !== undefined && value !== null;
    });
  }

  /**
   * Deployment Verification System
   * ---------------------------
   * Verifies contract deployments on the blockchain.
   * 
   * Verifications:
   * 1. Safe contract deployment
   * 2. Tools contract deployment
   * 
   * @param provider - Ethereum provider instance
   * @returns True if all deployments are verified
   */
  public async verifyDeployments(provider: any): Promise<boolean> {
    if (!this.config) return false;

    try {
      const safeCode = await provider.getCode(this.config.safeAddress);
      if (safeCode === '0x') return false;

      const toolsCode = await provider.getCode(this.config.pkpToolsAddress);
      if (toolsCode === '0x') return false;

      return true;
    } catch (error) {
      console.error('Error verifying deployments:', error);
      return false;
    }
  }
}