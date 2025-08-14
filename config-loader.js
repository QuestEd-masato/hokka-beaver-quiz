/**
 * Configuration Loader for hokka-beaver-quiz
 * Provides centralized configuration management for better reusability
 */

const fs = require('fs');
const path = require('path');

class ConfigLoader {
  constructor() {
    this.config = null;
    this.configPath = path.join(__dirname, 'config.json');
  }

  /**
   * Load configuration from config.json
   * Falls back to defaults if config file doesn't exist
   */
  load() {
    if (this.config) {
      return this.config;
    }

    try {
      if (fs.existsSync(this.configPath)) {
        const configData = fs.readFileSync(this.configPath, 'utf8');
        this.config = JSON.parse(configData);
      } else {
        this.config = this.getDefaultConfig();
        console.log('⚠️  config.json not found, using default configuration');
      }

      // Apply environment variable overrides
      this.applyEnvironmentOverrides();

      return this.config;
    } catch (error) {
      console.error('❌ Configuration load error:', error.message);
      this.config = this.getDefaultConfig();
      return this.config;
    }
  }

  /**
   * Get default configuration values
   */
  getDefaultConfig() {
    return {
      system: {
        name: "hokka-beaver-quiz",
        version: "Phase A Default",
        maxConnections: 200,
        timeout: 30000,
        keepAliveTimeout: 65000,
        headersTimeout: 66000
      },
      database: {
        batchInterval: 1000,
        dataDirectory: "./data",
        fileName: "database.json"
      },
      server: {
        host: "0.0.0.0",
        port: 8080,
        staticPath: "./public",
        templatePath: "./templates"
      },
      quiz: {
        defaultQuestionCount: 10,
        surveyBonusPoints: 10,
        scorePerQuestion: 10
      },
      logging: {
        level: "info",
        enableDebug: false,
        enableRequestLogging: true
      },
      security: {
        enableRegistration: false,
        requireAdminAuth: true,
        passwordHashAlgorithm: "sha256"
      },
      customization: {
        companyName: "北陸製菓",
        productName: "ビーバーおかき",
        eventName: "hokkaクイズラリー",
        eventDescription: "中学校文化祭でのクイズラリーアプリケーション",
        adminAccountInfo: {
          username: "admin",
          defaultPassword: "admin123"
        },
        testAccounts: [
          {"username": "test", "password": "test123"},
          {"username": "aaa", "password": "aaa123"}
        ]
      }
    };
  }

  /**
   * Apply environment variable overrides
   */
  applyEnvironmentOverrides() {
    if (process.env.PORT) {
      this.config.server.port = parseInt(process.env.PORT);
    }
    if (process.env.NODE_ENV) {
      this.config.logging.level = process.env.NODE_ENV === 'production' ? 'error' : 'info';
    }
    if (process.env.LOG_LEVEL) {
      this.config.logging.level = process.env.LOG_LEVEL;
    }
    if (process.env.MAX_CONNECTIONS) {
      this.config.system.maxConnections = parseInt(process.env.MAX_CONNECTIONS);
    }
  }

  /**
   * Get specific configuration value by path (e.g., 'server.port')
   */
  get(path, defaultValue = null) {
    const config = this.load();
    const keys = path.split('.');
    let value = config;
    
    for (const key of keys) {
      if (value && typeof value === 'object' && key in value) {
        value = value[key];
      } else {
        return defaultValue;
      }
    }
    
    return value;
  }

  /**
   * Get all configuration
   */
  getAll() {
    return this.load();
  }
}

// Export singleton instance
module.exports = new ConfigLoader();