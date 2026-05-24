const http = require('http');
const data = JSON.stringify({ email: 'coach1@golx.com', password: 'Admin@123456', role: 'coach' });
const options = {
    hostname: 'localhost',
    port: 3001,
    path: '/api/v1/auth/register',
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(data) },
};
const req = http.request(options, (res) => {
    let body = '';
    res.on('data', (d) => body += d);
    res.on('end', () => {
        console.log('STATUS:', res.statusCode);
        console.log('BODY:', body);
    });
});
req.on('error', (e) => console.error('ERROR:', e.message));
req.write(data);
req.end();
