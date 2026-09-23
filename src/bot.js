'use strict';

const { postWorkNotes } = require('./serviceNow');
const { buildServiceNowPayload, buildWorkNotes, searchCommunications } = require('./workNotes');

function parseBotCommand(text) {
  const trimmed = String(text || '').trim();

  if (!trimmed) {
    throw new Error('Bot command text is required.');
  }

  if (/^help$/i.test(trimmed)) {
    return { intent: 'help' };
  }

  const match = trimmed.match(/^summarize\s+(incident|task)\s+(\S+)(?:\s+for\s+(.+?))?(?:\s+query\s+(.+?))?(\s+post)?$/i);

  if (!match) {
    throw new Error('Unsupported bot command. Use "summarize incident|task <recordSysId> [for <customer>] [query <terms>] [post]".');
  }

  return {
    intent: 'summarize',
    recordType: match[1].toLowerCase(),
    recordSysId: match[2],
    customerName: match[3] ? match[3].trim() : '',
    query: match[4] ? match[4].trim() : '',
    postToServiceNow: Boolean(match[5])
  };
}

function buildHelpResponse() {
  return {
    message: 'Commands:\n- help\n- summarize incident <recordSysId> [for <customer>] [query <terms>] [post]\n- summarize task <recordSysId> [for <customer>] [query <terms>] [post]'
  };
}

function buildBotSummaryResponse({ command, matchedCommunications, workNotes }) {
  const payload = buildServiceNowPayload({
    recordType: command.recordType,
    recordSysId: command.recordSysId,
    workNotes
  });

  return {
    message: [
      `Prepared ${payload.table} work notes for ${payload.sysId}.`,
      `Matched messages: ${matchedCommunications.length}.`,
      '',
      workNotes
    ].join('\n'),
    matchedCount: matchedCommunications.length,
    workNotes,
    serviceNow: {
      table: payload.table,
      sysId: payload.sysId,
      posted: false
    }
  };
}

async function handleBotCommand(body) {
  const command = parseBotCommand(body?.text);

  if (command.intent === 'help') {
    return buildHelpResponse();
  }

  const matchedCommunications = searchCommunications(body?.communications, command.query);
  const workNotes = buildWorkNotes({
    communications: matchedCommunications,
    customerName: command.customerName || body?.customerName
  });

  const response = buildBotSummaryResponse({
    command,
    matchedCommunications,
    workNotes
  });

  if (command.postToServiceNow) {
    await postWorkNotes({
      recordType: command.recordType,
      recordSysId: command.recordSysId,
      workNotes
    });
    response.serviceNow.posted = true;
    response.message = `${response.message}\n\nPosted to ServiceNow.`;
  }

  return response;
}

module.exports = {
  buildHelpResponse,
  buildBotSummaryResponse,
  handleBotCommand,
  parseBotCommand
};
