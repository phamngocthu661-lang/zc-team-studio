'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { ensureDirectory } = require('./path-utils');

function formatDuration(milliseconds) {
  const totalSeconds = Math.max(0, Math.round(milliseconds / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return [hours, minutes, seconds].map((value) => String(value).padStart(2, '0')).join(':');
}

function writeReport(directoryPath, fileName, report) {
  ensureDirectory(directoryPath);
  const jsonPath = path.join(directoryPath, `${fileName}.json`);
  const textPath = path.join(directoryPath, `${fileName}.txt`);
  fs.writeFileSync(jsonPath, JSON.stringify(report, null, 2), 'utf8');
  const lines = [
    report.title || 'Video Batch Studio Report',
    '='.repeat(60),
    `Thời gian: ${new Date().toISOString()}`,
    '',
    ...(report.lines || []),
    '',
    'Dữ liệu chi tiết:',
    JSON.stringify(report.details || {}, null, 2)
  ];
  fs.writeFileSync(textPath, lines.join('\n'), 'utf8');
  return { jsonPath, textPath };
}

function csvCell(value) {
  const text = value === null || value === undefined ? '' : String(value);
  if (!/[",\r\n]/.test(text)) return text;
  return `"${text.replace(/"/g, '""')}"`;
}

function writeCsvReport(directoryPath, fileName, headers, rows) {
  ensureDirectory(directoryPath);
  const csvPath = path.join(directoryPath, `${fileName}.csv`);
  const lines = [
    headers.map(csvCell).join(','),
    ...rows.map((row) => headers.map((header) => csvCell(row[header])).join(','))
  ];
  fs.writeFileSync(csvPath, `\uFEFF${lines.join('\r\n')}\r\n`, 'utf8');
  return csvPath;
}

module.exports = { formatDuration, writeReport, writeCsvReport };
