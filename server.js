const http = require('node:http');

const version = process.env.APP_VERSION || 'v1';
if (!['v1', 'v2'].includes(version)) {
  throw new Error('APP_VERSION must be v1 or v2');
}

http.createServer((request, response) => {
  response.writeHead(200, { 'Content-Type': 'text/plain; charset=utf-8' });
  response.end(`[${version}] Hello, Kubernetes!`);
}).listen(4567, '0.0.0.0');
