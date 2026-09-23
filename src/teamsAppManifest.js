'use strict';

const { URL } = require('node:url');

const DEFAULT_CONFIG = {
  appId: '11111111-1111-1111-1111-111111111111',
  appName: 'ServiceNow Work Notes Bot',
  baseUrl: 'https://example.com',
  botId: '11111111-1111-1111-1111-111111111111',
  developerName: 'Hackathon-Ev',
  packageName: 'com.evanshackathon.worknotesbot',
  shortDescription: 'Summarize Teams and Outlook conversations into ServiceNow work notes.',
  fullDescription: 'Search selected Teams chats or Outlook emails, summarize troubleshooting steps, and prepare or post ServiceNow work notes.',
  version: '1.0.0'
};

function normalizeBaseUrl(baseUrl) {
  const url = new URL(baseUrl);
  return url.toString().replace(/\/$/, '');
}

function getTeamsAppConfig(env = process.env) {
  const baseUrl = normalizeBaseUrl(env.TEAMS_BASE_URL || DEFAULT_CONFIG.baseUrl);

  return {
    appId: env.TEAMS_APP_ID || DEFAULT_CONFIG.appId,
    appName: env.TEAMS_APP_NAME || DEFAULT_CONFIG.appName,
    baseUrl,
    botId: env.TEAMS_BOT_ID || env.TEAMS_APP_ID || DEFAULT_CONFIG.botId,
    developerName: env.TEAMS_DEVELOPER_NAME || DEFAULT_CONFIG.developerName,
    packageName: env.TEAMS_PACKAGE_NAME || DEFAULT_CONFIG.packageName,
    shortDescription: env.TEAMS_SHORT_DESCRIPTION || DEFAULT_CONFIG.shortDescription,
    fullDescription: env.TEAMS_FULL_DESCRIPTION || DEFAULT_CONFIG.fullDescription,
    version: env.npm_package_version || DEFAULT_CONFIG.version
  };
}

function buildTeamsAppManifest(configInput) {
  const config = {
    ...DEFAULT_CONFIG,
    ...configInput
  };
  const baseUrl = normalizeBaseUrl(config.baseUrl);
  const hostname = new URL(baseUrl).hostname;

  return {
    $schema: 'https://developer.microsoft.com/json-schemas/teams/v1.17/MicrosoftTeams.schema.json',
    manifestVersion: '1.17',
    version: config.version,
    id: config.appId,
    packageName: config.packageName,
    developer: {
      name: config.developerName,
      websiteUrl: baseUrl,
      privacyUrl: `${baseUrl}/privacy`,
      termsOfUseUrl: `${baseUrl}/terms`
    },
    icons: {
      color: 'color.png',
      outline: 'outline.png'
    },
    name: {
      short: config.appName,
      full: config.appName
    },
    description: {
      short: config.shortDescription,
      full: config.fullDescription
    },
    accentColor: '#2563EB',
    bots: [
      {
        botId: config.botId,
        scopes: ['personal', 'team', 'groupchat'],
        supportsFiles: false,
        isNotificationOnly: false,
        commandLists: [
          {
            scopes: ['personal', 'team', 'groupchat'],
            commands: [
              {
                title: 'help',
                description: 'Show supported bot commands.'
              },
              {
                title: 'summarize',
                description: 'Generate ServiceNow work notes from selected Teams or Outlook messages.'
              }
            ]
          }
        ]
      }
    ],
    permissions: ['identity', 'messageTeamMembers'],
    validDomains: [hostname],
    webApplicationInfo: {
      id: config.botId,
      resource: baseUrl
    }
  };
}

module.exports = {
  buildTeamsAppManifest,
  getTeamsAppConfig
};
