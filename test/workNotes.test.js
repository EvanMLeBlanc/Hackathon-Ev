'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const {
  buildServiceNowPayload,
  buildWorkNotes,
  searchCommunications
} = require('../src/workNotes');

test('searchCommunications filters by query across subject and message', () => {
  const results = searchCommunications(
    [
      {
        source: 'teams',
        sender: 'Customer',
        subject: 'VPN issue',
        message: 'Customer reports a VPN disconnect every 10 minutes.'
      },
      {
        source: 'outlook',
        sender: 'Specialist',
        subject: 'Printer',
        message: 'Reviewed printer settings.'
      }
    ],
    'vpn'
  );

  assert.equal(results.length, 1);
  assert.equal(results[0].subject, 'VPN issue');
});

test('buildWorkNotes formats customer discussion and troubleshooting sections', () => {
  const workNotes = buildWorkNotes({
    customerName: 'Contoso',
    communications: [
      {
        source: 'teams',
        sender: 'Customer',
        message: 'Customer reports the VPN disconnects every 10 minutes.'
      },
      {
        source: 'teams',
        sender: 'Specialist',
        message: 'Verified the home network and reset the VPN profile.'
      }
    ]
  });

  assert.match(workNotes, /Customer: Contoso/);
  assert.match(workNotes, /Summary of discussion:/);
  assert.match(workNotes, /Troubleshooting performed:/);
  assert.match(workNotes, /Verified the home network and reset the VPN profile\./);
});

test('buildServiceNowPayload maps tasks to the task table and uses work_notes', () => {
  const payload = buildServiceNowPayload({
    recordType: 'task',
    recordSysId: 'abc123',
    workNotes: 'Summary text'
  });

  assert.deepEqual(payload, {
    table: 'task',
    sysId: 'abc123',
    body: {
      work_notes: 'Summary text'
    }
  });
});
