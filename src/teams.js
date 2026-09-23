'use strict';

const { handleBotCommand } = require('./bot');

function normalizeTeamsActivity(activity) {
  return activity && typeof activity === 'object' ? activity : {};
}

function extractBotRequestFromTeamsActivity(activity) {
  const normalized = normalizeTeamsActivity(activity);
  const value = normalized.value && typeof normalized.value === 'object' ? normalized.value : {};

  return {
    text: typeof normalized.text === 'string' && normalized.text.trim()
      ? normalized.text
      : value.text || value.command || '',
    communications: Array.isArray(value.communications) ? value.communications : [],
    customerName: typeof value.customerName === 'string' ? value.customerName : '',
    teamsContext: {
      conversationId: normalized.conversation?.id || '',
      fromId: normalized.from?.id || '',
      recipientId: normalized.recipient?.id || ''
    }
  };
}

function buildTeamsMessageActivity(message, inputActivity) {
  const normalized = normalizeTeamsActivity(inputActivity);

  return {
    type: 'message',
    text: message,
    textFormat: 'plain',
    conversation: normalized.conversation || undefined,
    from: normalized.recipient || undefined,
    recipient: normalized.from || undefined,
    replyToId: normalized.id || undefined
  };
}

function buildTeamsHelpActivity(inputActivity) {
  return buildTeamsMessageActivity(
    [
      'Teams bot commands:',
      '- help',
      '- summarize incident <recordSysId> [for <customer>] [query <terms>] [post]',
      '- summarize task <recordSysId> [for <customer>] [query <terms>] [post]',
      '',
      'Pass selected Teams or Outlook messages in activity.value.communications.'
    ].join('\n'),
    inputActivity
  );
}

async function handleTeamsActivity(activity) {
  const normalized = normalizeTeamsActivity(activity);

  if (normalized.type === 'conversationUpdate') {
    return buildTeamsMessageActivity(
      'Hello. Send "help" for commands or "summarize incident <recordSysId> ..." to prepare ServiceNow work notes.',
      normalized
    );
  }

  if (normalized.type !== 'message') {
    return buildTeamsMessageActivity(
      'Unsupported Teams activity type. Send a message activity with a bot command.',
      normalized
    );
  }

  const botRequest = extractBotRequestFromTeamsActivity(normalized);

  if (!botRequest.text.trim()) {
    return buildTeamsHelpActivity(normalized);
  }

  const result = await handleBotCommand(botRequest);
  return buildTeamsMessageActivity(result.message, normalized);
}

module.exports = {
  buildTeamsHelpActivity,
  buildTeamsMessageActivity,
  extractBotRequestFromTeamsActivity,
  handleTeamsActivity
};
