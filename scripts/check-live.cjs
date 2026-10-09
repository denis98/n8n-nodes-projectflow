// Run the package's live fixture with the backend's real integration runtime.
const fs = require('node:fs');
const path = require('node:path');
const { randomUUID } = require('node:crypto');
const { spawn } = require('node:child_process');
const args = process.argv.slice(2);
const option = name => args[args.indexOf(name) + 1];
if (!args.includes('--backend') || !args.includes('--n8n')) {
  console.error('Pass --backend /path/to/kanban/backend --n8n http://localhost:5679 (dedicated local test instance)');
  process.exit(1);
}
const backend = path.resolve(option('--backend'));
const fixture = path.join(backend, 'tests/integration', `feat550-live-${randomUUID()}.test.ts`);
fs.writeFileSync(fixture, fs.readFileSync(path.join(__dirname, '../tests/live/member-added.ts')));
const child = spawn(path.join(backend, 'node_modules/.bin/vitest'), ['run', '--project', 'integration', fixture], {
  cwd: backend, stdio: 'inherit', env: { ...process.env, FEAT550_N8N_URL: option('--n8n') },
});
const cleanup = () => fs.rmSync(fixture, { force: true });
child.on('error', error => { cleanup(); console.error(error.message); process.exitCode = 1; });
child.on('exit', code => { cleanup(); process.exitCode = code ?? 1; });
