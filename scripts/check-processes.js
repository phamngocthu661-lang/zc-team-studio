const { execSync } = require('child_process');

try {
  const psScript = `
    Get-CimInstance Win32_Process | Where-Object { $_.Name -like '*Video*' -or $_.Name -like '*wscript*' } | Select-Object ProcessId, Name, CommandLine | Format-Table -AutoSize
  `;
  const psOutput = execSync(`powershell -NoProfile -Command "${psScript.replace(/\n/g, ' ')}"`, { encoding: 'utf8' });
  console.log(psOutput);
} catch (e) {
  console.error(e.message);
}
