'use strict';
/* Syntax check all frontend ES modules without executing them. */
const vm = require('vm');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', 'public', 'js');
const files = [];
(function walk(d) {
  for (const f of fs.readdirSync(d, { withFileTypes: true })) {
    if (f.isDirectory()) walk(path.join(d, f.name));
    else if (f.name.endsWith('.js')) files.push(path.join(d, f.name));
  }
})(ROOT);

let fail = 0;
for (const f of files) {
  const src = fs.readFileSync(f, 'utf8');
  try {
    new vm.SourceTextModule(src, { identifier: f });
    console.log('OK  ', path.relative(ROOT, f));
  } catch (e) {
    fail++;
    console.error('FAIL', path.relative(ROOT, f), '\n     ', e.message);
  }
}
console.log(fail ? `\n${fail} file(s) FAILED` : `\nAll ${files.length} modules parse clean`);
process.exit(fail ? 1 : 0);
