const express = require('express')
const path = require('path')
const expressWs = require('express-ws')
const SSHClient = require('ssh2').Client;
const utf8 = require('utf8');

const app = express()
const port = 3000
expressWs(app)
app.use('/', express.static(path.join(__dirname, 'static')))

function getJsonObjFromStr(str) {
    if (typeof str == 'string') {
        try {
            return JSON.parse(str);
        } catch (e) {
            return false;
        }
    }
}

function connectSshServer(connInfo, socket) {
    const ssh = new SSHClient();
    const { host, username, password, port } = connInfo;
    ssh.on('ready', function () {
        socket.send('SSH connect success ');
        ssh.shell(function (err, stream) {
            if (err) {
                return socket.send('SSH fail: ' + err.message + '');
            }
            socket.on('message', function (data) {
                stream.write(data);
            });
            stream.on('data', function (d) {
                socket.send(utf8.decode(d.toString('binary')));
            }).on('close', function () {
                ssh.end();
            });
        })
    }).on('close', function () {
        // socket.send('close ssh connect ');
        socket.close();
    }).on('error', function (err) {
        socket.send('SSH connect fail: ' + err.message);
        socket.close();
    }).connect({
        port,
        host,
        username,
        password
    });
}

app.ws('/ws', function (ws, req) {
    ws.on("message", (data) => {
        try {
            connInfo = getJsonObjFromStr(data)
            connInfo && connectSshServer({
                host: connInfo.host,
                username: connInfo.username,
                password: connInfo.password,
                port: connInfo.port
            }, ws)
        } catch (e) {
            console.log(e);
        }
    });
})

app.listen(port, () => {
    console.log(`Example app listening on port ${port}`)
})