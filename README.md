# Teams/Outlook to ServiceNow Work Notes Helper

This repository contains a lightweight Node.js service that helps a specialist:

1. collect Teams chat or Outlook email content,
2. search the communication for the relevant discussion,
3. generate a concise troubleshooting summary, and
4. prepare or post that summary to the **Work Notes** field of a ServiceNow **Task** or **Incident**.

## What it does

The service exposes an HTTP API that accepts communication records from an upstream Teams bot, Outlook add-in, Power Automate flow, or other client.

For the selected messages, it:

- filters the conversation with an optional search query,
- extracts customer discussion highlights,
- extracts troubleshooting actions already taken, and
- formats the result as ServiceNow-friendly work notes text.

When ServiceNow credentials are configured, the same request can also push the generated notes directly to ServiceNow.

## API

### `GET /healthz`

Returns a simple health payload.

### `POST /api/work-notes/summarize`

Request body:

```json
{
  "query": "vpn disconnect",
  "customerName": "Contoso",
  "recordType": "incident",
  "recordSysId": "8d6353b21b2c0110f3f54db8cc4bcb12",
  "postToServiceNow": false,
  "communications": [
    {
      "source": "teams",
      "sender": "Customer",
      "subject": "VPN issue",
      "message": "Customer reports the VPN disconnects every 10 minutes."
    },
    {
      "source": "teams",
      "sender": "Specialist",
      "message": "Verified the user's home network, reset the VPN profile, and collected logs."
    }
  ]
}
```

Response body:

```json
{
  "matchedCount": 2,
  "workNotes": "Customer: Contoso\nSummary of discussion:\n- Customer reports the VPN disconnects every 10 minutes.\nTroubleshooting performed:\n- Verified the user's home network, reset the VPN profile, and collected logs.",
  "serviceNow": {
    "table": "incident",
    "sysId": "8d6353b21b2c0110f3f54db8cc4bcb12",
    "posted": false
  }
}
```

## Running locally

Requires Node.js 18+.

```bash
npm test
npm start
```

The server defaults to port `3000`.

## ServiceNow configuration

Set these environment variables to enable direct posting:

- `SERVICENOW_INSTANCE_URL`
- `SERVICENOW_USERNAME`
- `SERVICENOW_PASSWORD`

When `postToServiceNow` is `true`, the service sends the generated text to:

- `incident/{sys_id}` for incidents
- `task/{sys_id}` for tasks

using the `work_notes` field.

## Integrating with Teams or Outlook

This repository intentionally keeps the implementation small. The expected integration pattern is:

1. a Teams bot, Outlook add-in, or workflow gathers chat/email content,
2. that client sends the selected communication records to this service,
3. this service returns a formatted summary or posts it to ServiceNow.

This separation keeps the summarization and ServiceNow update behavior reusable across both Teams and Outlook.
