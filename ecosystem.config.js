module.exports = {
    apps: [
      {
        name: '6929a3b2a8441ee7d05f75ae-server',
        script: 'npm',
        args: 'run dev',
        cwd: './server',
        instances: 1,
        exec_mode: 'fork',
        autorestart: true,
        watch: true,
        time: true
      },
      {
        name: '6929a3b2a8441ee7d05f75ae-client',
        script: 'npm',
        args: 'start',
        cwd: './client',
        instances: 1,
        exec_mode: 'fork',
        autorestart: true,
        watch: false,
        time: true
      }
    ]
  };