const { execSync } = require('child_process');

try {
  const out = execSync('wmic process where "name=\'python.exe\'" get ProcessId,CommandLine', { encoding: 'utf8' });
  console.log('=== PYTHON PROCESSES ===');
  console.log(out);
} catch (e) {
  console.error('Error WMIC:', e.message);
}
