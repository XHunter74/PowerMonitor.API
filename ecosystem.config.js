module.exports = {
  apps : [
      {
        name: "PowerMonitor",
        script: "dist/main.js",
        watch: ["production.env"],                             
        ignore_watch: ["node_modules", "dist"],   
        env: {
          "NODE_ENV": "production",
        },
        watch_options: {
          usePolling: true,
          interval: 1000
       }
      }
  ]
}
