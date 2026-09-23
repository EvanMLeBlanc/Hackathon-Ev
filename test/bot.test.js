'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const { handleBotCommand, parseBotCommand } = require('../src/bot');
const { createServer } = require('../src/server');

test('parseBotCommand supports summarize command with query and post flags', () => {
  const command = parseBotCommand('summarize incident abc123 for Contoso query vpn disconnect post');

  assert.deepEqual(command, {
    intent: 'summarize',
    recordType: 'incident',
    recordSysId: 'abc123',
    customerName: 'Contoso',
    query: 'vpn disconnect',
    postToServiceNow: true
  });
});

test('handleBotCommand returns help text', async () => {
  const response = await handleBotCommand({ text: 'help' });

  assert.match(response.message, /summarize incident/);
});

test('handleBotCommand generates bot response from communications', async () => {
  const response = await handleBotCommand({
    text: 'summarize task task123 for Contoso query vpn',
    communications: [
      {
        source: 'teams',
        sender: 'Customer',
        subject: 'VPN issue',
        message: 'Customer reports the VPN disconnects every 10 minutes.'
      },
      {
        source: 'teams',
        sender: 'Specialist',
        message: 'Verified the home network and reset the VPN profile.'
      }
    ]
  });

  assert.equal(response.matchedCount, 2);
  assert.equal(response.serviceNow.table, 'task');
  assert.match(response.message, /Prepared task work notes for task123\./);
  assert.match(response.workNotes, /Troubleshooting performed:/);
});

test('bot endpoint responds with summarized work notes', async () => {
  const server = createServer();

  await new Promise((resolve) => server.listen(0, resolve));

  try {
    const { port } = server.address();
    const response = await fetch(`http://127.0.0.1:${port}/api/bot/message`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        text: 'summarize incident inc123 for Contoso query vpn',
        communications: [
          {
            source: 'outlook',
            sender: 'Customer',
            subject: 'VPN issue',
            message: 'Customer reports the VPN disconnects every 10 minutes.'
          },
          {
            source: 'teams',
            sender: 'Specialist',
            message: 'Verified the home network and reset the VPN profile.'
          }
        ]
      })
    });

    assert.equal(response.status, 200);

    const payload = await response.json();
    assert.equal(payload.serviceNow.sysId, 'inc123');
    assert.match(payload.message, /Prepared incident work notes/);
  } finally {
    await new Promise((resolve, reject) => server.close((error) => (error ? reject(error) : resolve())));
  }
});
