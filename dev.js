const { spawn } = require('child_process');

console.log('🚀 Starting UrbanFix Platform (Backend & Frontend)...');

const server = spawn('npm', ['run', 'dev'], {
  cwd: 'server',
  stdio: 'inherit',
  shell: true,
  env: process.env,
});

const client = spawn('npm', ['run', 'dev'], {
  cwd: 'client',
  stdio: 'inherit',
  shell: true,
  env: process.env,
});

const cleanup = () => {
  console.log('\n🛑 Shutting down UrbanFix services...');
  server.kill();
  client.kill();
  process.exit(0);
};

process.on('SIGINT', cleanup);
process.on('SIGTERM', cleanup);
