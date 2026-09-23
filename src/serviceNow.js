'use strict';

const { buildServiceNowPayload } = require('./workNotes');

async function postWorkNotes({ recordType, recordSysId, workNotes }) {
  const instanceUrl = process.env.SERVICENOW_INSTANCE_URL;
  const username = process.env.SERVICENOW_USERNAME;
  const password = process.env.SERVICENOW_PASSWORD;

  if (!instanceUrl || !username || !password) {
    throw new Error('ServiceNow credentials are not fully configured.');
  }

  const payload = buildServiceNowPayload({ recordType, recordSysId, workNotes });
  const response = await fetch(
    `${instanceUrl.replace(/\/$/, '')}/api/now/table/${payload.table}/${payload.sysId}`,
    {
      method: 'PATCH',
      headers: {
        'Authorization': `Basic ${Buffer.from(`${username}:${password}`).toString('base64')}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify(payload.body)
    }
  );

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`ServiceNow update failed: ${response.status} ${errorText}`);
  }

  return payload;
}

module.exports = {
  postWorkNotes
};
