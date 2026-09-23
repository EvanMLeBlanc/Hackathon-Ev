'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const { buildTeamsAppManifest, getTeamsAppConfig } = require('../src/teamsAppManifest');

test('getTeamsAppConfig resolves base values from environment', () => {
  const config = getTeamsAppConfig({
    TEAMS_APP_ID: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    TEAMS_BOT_ID: 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
    TEAMS_APP_NAME: 'Contoso Work Notes Bot',
    TEAMS_BASE_URL: 'https://bot.contoso.com/',
    TEAMS_DEVELOPER_NAME: 'Contoso',
    TEAMS_PACKAGE_NAME: 'com.contoso.worknotes'
  });

  assert.equal(config.appId, 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa');
  assert.equal(config.botId, 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb');
  assert.equal(config.appName, 'Contoso Work Notes Bot');
  assert.equal(config.baseUrl, 'https://bot.contoso.com');
  assert.equal(config.packageName, 'com.contoso.worknotes');
});

test('buildTeamsAppManifest creates a Teams manifest with the configured bot endpoint domain', () => {
  const manifest = buildTeamsAppManifest({
    appId: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    botId: 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
    appName: 'Contoso Work Notes Bot',
    baseUrl: 'https://bot.contoso.com',
    developerName: 'Contoso',
    packageName: 'com.contoso.worknotes',
    version: '1.2.3'
  });

  assert.equal(manifest.id, 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa');
  assert.equal(manifest.bots[0].botId, 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb');
  assert.deepEqual(manifest.validDomains, ['bot.contoso.com']);
  assert.equal(manifest.webApplicationInfo.resource, 'https://bot.contoso.com');
  assert.match(manifest.description.short, /ServiceNow work notes/i);
});
