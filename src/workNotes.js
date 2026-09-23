'use strict';

const TROUBLESHOOTING_KEYWORDS = [
  'checked',
  'collected',
  'confirmed',
  'escalated',
  'gathered',
  'investigated',
  'reproduced',
  'reset',
  'restarted',
  'reviewed',
  'tested',
  'troubleshot',
  'validated',
  'verified'
];

function normalizeCommunication(item) {
  return {
    source: String(item?.source || '').trim().toLowerCase(),
    sender: String(item?.sender || '').trim(),
    subject: String(item?.subject || '').trim(),
    message: String(item?.message || '').trim()
  };
}

function searchCommunications(communications, query) {
  const normalized = (Array.isArray(communications) ? communications : [])
    .map(normalizeCommunication)
    .filter((item) => item.message);

  const normalizedQuery = String(query || '').trim().toLowerCase();

  if (!normalizedQuery) {
    return normalized;
  }

  return normalized.filter((item) =>
    [item.sender, item.subject, item.message]
      .join(' ')
      .toLowerCase()
      .includes(normalizedQuery)
  );
}

function uniqueNonEmptyLines(lines) {
  return [...new Set(lines.map((line) => line.trim()).filter(Boolean))];
}

function extractSummaryLines(communications) {
  return uniqueNonEmptyLines(
    communications
      .filter((item) => item.message)
      .map((item) => item.message)
  );
}

function extractTroubleshootingLines(communications) {
  return uniqueNonEmptyLines(
    communications
      .filter((item) =>
        TROUBLESHOOTING_KEYWORDS.some((keyword) =>
          item.message.toLowerCase().includes(keyword)
        )
      )
      .map((item) => item.message)
  );
}

function formatBulletSection(title, lines, emptyState) {
  const entries = lines.length ? lines.map((line) => `- ${line}`) : [`- ${emptyState}`];
  return `${title}\n${entries.join('\n')}`;
}

function buildWorkNotes({ communications, customerName }) {
  const safeCommunications = Array.isArray(communications) ? communications : [];
  const summaryLines = extractSummaryLines(safeCommunications);
  const troubleshootingLines = extractTroubleshootingLines(safeCommunications);
  const sections = [];

  if (customerName) {
    sections.push(`Customer: ${customerName}`);
  }

  sections.push(
    formatBulletSection(
      'Summary of discussion:',
      summaryLines,
      'No matching customer communication was identified in the selected messages.'
    )
  );

  sections.push(
    formatBulletSection(
      'Troubleshooting performed:',
      troubleshootingLines,
      'No troubleshooting actions were explicitly identified in the selected messages.'
    )
  );

  return sections.join('\n');
}

function getServiceNowTable(recordType) {
  return String(recordType || '').trim().toLowerCase() === 'task' ? 'task' : 'incident';
}

function buildServiceNowPayload({ recordType, recordSysId, workNotes }) {
  return {
    table: getServiceNowTable(recordType),
    sysId: String(recordSysId || '').trim(),
    body: {
      work_notes: workNotes
    }
  };
}

module.exports = {
  buildServiceNowPayload,
  buildWorkNotes,
  getServiceNowTable,
  searchCommunications
};
