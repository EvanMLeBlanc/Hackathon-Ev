'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const { createServer } = require('../src/server');
const {
  buildTeamsMessageActivity,
  extractBotRequestFromTeamsActivity,
  handleTeamsActivity
} = require('../src/teams');

test('extractBotRequestFromTeamsActivity reads message text and communications', () => {
  const request = extractBotRequestFromTeamsActivity({
    type: 'message',
    text: 'summarize incident inc123 query vpn',
    value: {
      communications: [
        { source: 'teams', sender: 'Customer', message: 'VPN disconnects every 10 minutes.' }
      ],
      customerName: 'Contoso'
    },
    conversation: { id: 'conversation-1' }
  });

  assert.equal(request.text, 'summarize incident inc123 query vpn');
  assert.equal(request.customerName, 'Contoso');
  assert.equal(request.communications.length, 1);
  assert.equal(request.teamsContext.conversationId, 'conversation-1');
});

test('buildTeamsMessageActivity swaps sender and recipient for replies', () => {
  const activity = buildTeamsMessageActivity('hello', {
    id: 'message-1',
    conversation: { id: 'conversation-1' },
    from: { id: 'user-1' },
    recipient: { id: 'bot-1' }
  });

  assert.equal(activity.type, 'message');
  assert.equal(activity.text, 'hello');
  assert.equal(activity.replyToId, 'message-1');
  assert.deepEqual(activity.from, { id: 'bot-1' });
  assert.deepEqual(activity.recipient, { id: 'user-1' });
});

test('handleTeamsActivity returns help text for empty message text', async () => {
  const response = await handleTeamsActivity({
    type: 'message',
    value: {},
    from: { id: 'user-1' },
    recipient: { id: 'bot-1' }
  });

  assert.match(response.text, /Teams bot commands:/);
});

test('teams endpoint returns a Teams message activity', async () => {
  const server = createServer();

  await new Promise((resolve) => server.listen(0, resolve));

  try {
    const { port } = server.address();
    const response = await fetch(`http://127.0.0.1:${port}/api/teams/messages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        type: 'message',
        id: 'message-1',
        text: 'summarize incident inc123 for Contoso query vpn',
        from: { id: 'user-1', name: 'User' },
        recipient: { id: 'bot-1', name: 'Bot' },
        conversation: { id: 'conversation-1' },
        value: {
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
        }
      })
    });

    assert.equal(response.status, 200);

    const payload = await response.json();
    assert.equal(payload.type, 'message');
    assert.equal(payload.replyToId, 'message-1');
    assert.match(payload.text, /Prepared incident work notes for inc123\./);
  } finally {
    await new Promise((resolve, reject) => server.close((error) => (error ? reject(error) : resolve())));
  }
});
