const os = require('os');
const http = require('http');
const querystring = require('querystring');
const Influx = require('influx');

const hostname = process.env.HOSTNAME || os.hostname();
const switch_host = process.env.SWITCH_HOST;
var session = '';

const idb = new Influx.InfluxDB({
    host: process.env.INFLUX_HOST || 'localhost',
    database: process.env.INFLUX_DB,
    username: process.env.INFLUX_USERNAME,
    password: process.env.INFLUX_PASSWORD,
    schema: [
        {
            measurement: 'port_statistics',
            fields: {
                bytes_received: Influx.FieldType.INTEGER,
                bytes_sent: Influx.FieldType.INTEGER,
                crc_error_packets: Influx.FieldType.INTEGER,
            },
            tags: [
                'host', 'port', 'switch_host',
            ]
        }
    ]
});

function login() {
    const password = process.env.SWITCH_PASSWORD;

    // Order of form arguments matters!
    const form = 'submitId=pwdLogin&password=' + querystring.escape(password) + '&submitEnd=';

    const req = http.request({
        hostname: switch_host,
        port: 80,
        path: '/login.htm',
        method: 'POST',
        headers: {
            // Case sensitive HTTP header!
            'Content-Length': Buffer.byteLength(form)
        }

    }, (res) => {
        const setcookie = res.headers['set-cookie'];
        if (res.statusCode == 200 && setcookie && setcookie.length) {
            const re = /SID=([^;]*)/.exec(setcookie[0]);
            if (re) {
                session = re[1];
            }
        }
    });

    req.on('error', console.error);
    req.write(form);
    req.end();
}

function handle_port_statistics(page) {
    // This is an HTML page with some Javascript that normally passes a data array back to the
    // parent to be displayed in a table. Look for the lines of data and extract values with a regex.

    var points = [];

    for (const line of page.split('\n')) {
        const re = /StatisticsEntry\[\d+\]\s+=\s+'(\d+)\?(\d+)\?(\d+)\?(\d+)'/.exec(line);
        if (re) {
            const port = parseInt(re[1]);
            const bytes_received = parseInt(re[2]);
            const bytes_sent = parseInt(re[3]);
            const crc_error_packets = parseInt(re[4]);

            points.push({
                measurement: 'port_statistics',
                tags: {
                    host: hostname,
                    port,
                    switch_host
                },
                fields: {
                    bytes_received,
                    bytes_sent,
                    crc_error_packets
                }
            });
        }
    }

    idb.writePoints(points);
}

function poll() {
    if (!session) {
        login();
        return;
    }

    const req = http.request({
        hostname: switch_host,
        port: 80,
        path: '/config/monitoring_port_statistics.htm',
        method: 'GET',
        headers: {
            'Cookie': 'SID=' + session
        }
    }, (res) => {
        var body = '';
        res.setEncoding('utf8');
        res.on('data', (chunk) => {
            body += chunk;
        });
        res.on('end', () => {
            if (body.includes("parent.location.href='/login.htm'")) {
                login();
            } else {
                handle_port_statistics(body);
            }
        });
    });


    req.end();
}

login();
setInterval(poll, parseInt(process.env.TIMER || '5000'));
