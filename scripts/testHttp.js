const http = require('http');
const url = process.argv[2] || 'http://localhost:3000/';
http.get(url, res => {
  console.log('status', res.statusCode);
  let b = '';
  res.on('data', c => b += c);
  res.on('end', () => {
    console.log('len', b.length);
    console.log('first', b.slice(0, 200));
  });
}).on('error', e => {
  console.error('err', e);
});
