const http = require('http');

/** Starts an Express app on an ephemeral local port and returns a tiny JSON client. */
function listen(app) {
  return new Promise(resolve => {
    const server = app.listen(0, '127.0.0.1', () => {
      const { port } = server.address();
      const request = (method, urlPath, { body, token, headers = {} } = {}) =>
        new Promise((resolveRequest, reject) => {
          const payload = body === undefined ? undefined : JSON.stringify(body);
          const finalHeaders = { ...headers };
          if (payload !== undefined) {
            finalHeaders['Content-Type'] = 'application/json';
            finalHeaders['Content-Length'] = Buffer.byteLength(payload);
          }
          if (token) {
            finalHeaders.Authorization = `Bearer ${token}`;
          }
          const req = http.request(
            { hostname: '127.0.0.1', port, path: urlPath, method, headers: finalHeaders },
            res => {
              const chunks = [];
              res.on('data', chunk => chunks.push(chunk));
              res.on('end', () => {
                const text = Buffer.concat(chunks).toString('utf8');
                let json = null;
                try {
                  json = text ? JSON.parse(text) : null;
                } catch {
                  json = null;
                }
                resolveRequest({ status: res.statusCode, headers: res.headers, text, body: json });
              });
            },
          );
          req.on('error', reject);
          if (payload !== undefined) {
            req.write(payload);
          }
          req.end();
        });
      resolve({ request, close: () => new Promise(done => server.close(done)) });
    });
  });
}

module.exports = { listen };
