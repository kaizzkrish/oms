module.exports = {
  apps: [
    {
      name: 'oms-backend',
      script: 'dist/main.js',
      instances: process.env.PM2_INSTANCES || 1,
      exec_mode:
        process.env.PM2_INSTANCES && process.env.PM2_INSTANCES !== '1'
          ? 'cluster'
          : 'fork',
      autorestart: true,
      max_memory_restart: '512M',
      env: {
        NODE_ENV: process.env.NODE_ENV || 'production',
      },
    },
  ],
};
