/**
 * PM2 config for Vertex bot - keeps arbitrage + deposit watcher running 24/7
 * One process runs both (arbitrage + deposit attribution).
 * Usage: pm2 start ecosystem.config.cjs
 */

module.exports = {
  apps: [
    {
      name: "vertex-arbitrage",
      script: "dist/arbitrage.js",
      cwd: __dirname,
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: "500M",
      env: {
        NODE_ENV: "production",
      },
      error_file: "logs/error.log",
      out_file: "logs/out.log",
      log_date_format: "YYYY-MM-DD HH:mm:ss",
    },
  ],
};
