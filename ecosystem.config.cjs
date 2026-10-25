module.exports = {
  apps: [{
    name: "barwaqt-admin",
    cwd: "/var/www/console.barwaqt.com",
    script: "node_modules/next/dist/bin/next",
    args: "start --hostname 127.0.0.1 --port 3002",
    instances: 1,
    exec_mode: "fork",
    autorestart: true,
    env: { NODE_ENV: "production", NEXT_TELEMETRY_DISABLED: "1" },
  }],
};
