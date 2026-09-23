# Teams/Outlook to ServiceNow Work Notes Helper

This repository contains a lightweight Node.js service and Microsoft Teams-friendly bot interface that helps a specialist:

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

### `POST /api/bot/message`

Bot-style endpoint for Teams or Outlook clients that want to send a command plus selected communication content.

Request body:

```json
{
  "text": "summarize incident 8d6353b21b2c0110f3f54db8cc4bcb12 for Contoso query vpn disconnect",
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

Supported commands:

- `help`
- `summarize incident <recordSysId> [for <customer>] [query <terms>] [post]`
- `summarize task <recordSysId> [for <customer>] [query <terms>] [post]`

If `post` is included, the bot posts the generated work notes to ServiceNow.

### `POST /api/teams/messages`

Microsoft Teams-compatible endpoint for bot message activities.

The endpoint accepts a Teams/Bot Framework-style activity payload and returns a reply activity:

```json
{
  "type": "message",
  "id": "message-1",
  "text": "summarize incident inc123 for Contoso query vpn",
  "from": {
    "id": "29:user"
  },
  "recipient": {
    "id": "28:bot"
  },
  "conversation": {
    "id": "conversation-1"
  },
  "value": {
    "communications": [
      {
        "source": "teams",
        "sender": "Customer",
        "subject": "VPN issue",
        "message": "Customer reports the VPN disconnects every 10 minutes."
      },
      {
        "source": "outlook",
        "sender": "Specialist",
        "message": "Verified the home network and reset the VPN profile."
      }
    ]
  }
}
```

The reply body is a Teams message activity containing the generated work notes summary.

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
npm run package:teams
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
2. that client sends the selected communication records and bot command to this service,
3. this service returns a formatted summary or posts it to ServiceNow.

This separation keeps the summarization and ServiceNow update behavior reusable across both Teams and Outlook.

## Teams bot wiring

To use this as a Teams bot:

1. expose this service over HTTPS,
2. configure the Teams bot messaging endpoint to point to `/api/teams/messages`,
3. send user commands in the Teams message text,
4. include selected Teams chat or Outlook email content in `activity.value.communications`.

This repository does not depend on the Bot Framework SDK; it provides the bot-compatible HTTP surface that a Teams app can call directly.

## Teams app package scaffold

This repository now includes a Teams app package scaffold for sideloading:

- `/home/runner/work/Hackathon-Ev/Hackathon-Ev/teams-app/assets/color.png`
- `/home/runner/work/Hackathon-Ev/Hackathon-Ev/teams-app/assets/outline.png`
- `/home/runner/work/Hackathon-Ev/Hackathon-Ev/src/teamsAppManifest.js`
- `/home/runner/work/Hackathon-Ev/Hackathon-Ev/scripts/package-teams-app.js`

Build the sideload package with:

```bash
TEAMS_BASE_URL=https://your-bot-host.example.com \
TEAMS_APP_ID=11111111-1111-1111-1111-111111111111 \
TEAMS_BOT_ID=11111111-1111-1111-1111-111111111111 \
npm run package:teams
```

The command creates:

- `/home/runner/work/Hackathon-Ev/Hackathon-Ev/dist/teams-app-package/manifest.json`
- `/home/runner/work/Hackathon-Ev/Hackathon-Ev/dist/teams-app-package.zip`

### Required Teams packaging variables

- `TEAMS_BASE_URL`: public HTTPS base URL for this service
- `TEAMS_APP_ID`: Teams app ID
- `TEAMS_BOT_ID`: Bot/Azure app ID used by Teams

Optional variables:

- `TEAMS_APP_NAME`
- `TEAMS_PACKAGE_NAME`
- `TEAMS_DEVELOPER_NAME`
- `TEAMS_SHORT_DESCRIPTION`
- `TEAMS_FULL_DESCRIPTION`

### Sideloading

1. Build the package zip with `npm run package:teams`.
2. In Teams, open **Apps**.
3. Choose **Manage your apps** or **Upload a custom app**.
4. Upload `/home/runner/work/Hackathon-Ev/Hackathon-Ev/dist/teams-app-package.zip`.
5. Configure the bot messaging endpoint in Teams/Azure to use `/api/teams/messages`.
