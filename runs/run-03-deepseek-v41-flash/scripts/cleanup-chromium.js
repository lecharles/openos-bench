'use strict';
/* Cleanup helper: terminate stray chromium processes from test runs. */
const { execSync } = require('child_process');
let pids = '';
try { pids = execSync('pgrep -f chromium', { encoding: 'utf8' }); } catch (e) { console.log('no chromium processes'); process.exit(0); }
for (const line of pids.split('\n').filter(Boolean)) {
  const pid = Number(line);
  try { process.kill(pid, 'SIGKILL'); console.log('terminated', pid); } catch (e) { console.log('skip', pid, e.message); }
}
console.log('done');
