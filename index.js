const { program } = require('commander');
const fs = require('fs/promises');
const http = require('http');
const { create } = require('xmlbuilder2');

program
  .option('-h, --host <host>', 'Server host')
  .option('-p, --port <port>', 'Server port')
  .option('-i, --input <path>', 'Input file path');

program.parse(process.argv);
const options = program.opts();

if (!options.host || !options.port || !options.input) {
  if (!options.host) console.error("Помилка: параметр -h (host) є обов'язковим.");
  if (!options.port) console.error("Помилка: параметр -p (port) є обов'язковим.");
  if (!options.input) console.error("Помилка: параметр -i (input) є обов'язковим.");
  process.exit(1);
}

const server = http.createServer(async (req, res) => {
  try {
    const data = await fs.readFile(options.input, 'utf-8');
    const json = JSON.parse(data);

    let resultData = [];

    // Обробка маршрутів
    switch (req.url) {
      case '/':
        resultData = json;
        break;

      case '/max':
        const maxRate = Math.max(...json.map(e => e.rate));
        resultData = json.filter(e => e.rate === maxRate);
        break;

      case '/min':
        const minRate = Math.min(...json.map(e => e.rate));
        resultData = json.filter(e => e.rate === minRate);
        break;

      case '/avg':
        const avg = json.reduce((acc, cur) => acc + cur.rate, 0) / json.length;
        resultData = [{ exchangedate: 'average', rate: avg }];
        break;

      case '/usd':
        resultData = json.filter(e => e.cc === 'USD');
        break;

      default:
        res.writeHead(404, { 'Content-Type': 'text/plain' });
        res.end('404 Not Found');
        return;
    }

    
    const xml = create({ version: '1.0' }).ele('data');

    resultData.forEach(rate => {
      if (rate.exchangedate && rate.rate) {
        xml.ele('exchange')
          .ele('date').txt(rate.exchangedate).up()
          .ele('rate').txt(rate.rate.toString()).up()
          .up();
      }
    });

    const xmlStr = xml.end({ prettyPrint: true });

    res.writeHead(200, { 'Content-Type': 'application/xml' });
    res.end(xmlStr);
  } catch (err) {
    if (err.code === 'ENOENT') {
      console.error('Cannot find input file');
    } else {
      console.error(err);
    }
    res.writeHead(500);
    res.end('Internal Server Error');
  }
});

server.listen(options.port, options.host, () => {
  console.log(`Server running at http://${options.host}:${options.port}/`);
  console.log(`http://${options.host}:${options.port}/max`);
  console.log(`http://${options.host}:${options.port}/min`);
  console.log(`http://${options.host}:${options.port}/avg`);
  console.log(`http://${options.host}:${options.port}/usd`)
});
