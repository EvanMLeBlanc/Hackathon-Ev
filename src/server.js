'use strict';

const http = require('http');
const { handleBotCommand } = require('./bot');
const { handleTeamsActivity } = require('./teams');
const { postWorkNotes } = require('./serviceNow');
const { buildServiceNowPayload, buildWorkNotes, searchCommunications } = require('./workNotes');

function sendJson(response, statusCode, payload) {
  response.writeHead(statusCode, { 'Content-Type': 'application/json' });
  response.end(JSON.stringify(payload));
}

function parseJsonBody(request) {
  return new Promise((resolve, reject) => {
    let body = '';

    request.on('data', (chunk) => {
      body += chunk;
    });

    request.on('end', () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch (error) {
        reject(new Error('Request body must be valid JSON.'));
      }
    });

    request.on('error', reject);
  });
}

async function handleSummarize(request, response) {
  const body = await parseJsonBody(request);
  const communications = searchCommunications(body.communications, body.query);
  const workNotes = buildWorkNotes({
    communications,
    customerName: body.customerName
  });

  const payload = buildServiceNowPayload({
    recordType: body.recordType,
    recordSysId: body.recordSysId,
    workNotes
  });

  const result = {
    matchedCount: communications.length,
    workNotes,
    serviceNow: {
      table: payload.table,
      sysId: payload.sysId,
      posted: false
    }
  };

  if (body.postToServiceNow) {
    await postWorkNotes({
      recordType: body.recordType,
      recordSysId: body.recordSysId,
      workNotes
    });
    result.serviceNow.posted = true;
  }

  sendJson(response, 200, result);
}

async function handleBotMessage(request, response) {
  const body = await parseJsonBody(request);
  const result = await handleBotCommand(body);
  sendJson(response, 200, result);
}

async function handleTeamsMessage(request, response) {
  const body = await parseJsonBody(request);
  const result = await handleTeamsActivity(body);
  sendJson(response, 200, result);
}

function createServer() {
  return http.createServer(async (request, response) => {
    try {
      if (request.method === 'GET' && request.url === '/healthz') {
        return sendJson(response, 200, { ok: true });
      }

      if (request.method === 'POST' && request.url === '/api/work-notes/summarize') {
        return await handleSummarize(request, response);
      }

      if (request.method === 'POST' && request.url === '/api/bot/message') {
        return await handleBotMessage(request, response);
      }

      if (request.method === 'POST' && request.url === '/api/teams/messages') {
        return await handleTeamsMessage(request, response);
      }

      return sendJson(response, 404, { error: 'Not found' });
    } catch (error) {
      return sendJson(response, 400, { error: error.message });
    }
  });
}

if (require.main === module) {
  const port = Number(process.env.PORT || 3000);
  createServer().listen(port, () => {
    process.stdout.write(`Server listening on port ${port}\n`);
  });
}

module.exports = {
  createServer
};
