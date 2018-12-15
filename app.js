const child_process = require('child_process');
const axios = require('axios').default;

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

class BrookSlave {
    constructor() {
        this.prevCmd = '';
        this.prevExit;
        this.prev;
    }
    async init() {
        var { data } = await axios.get('https://ssr.inu1255.cn/api/node/gen');
        console.log(data.data.msg);
        this.token = data.data.token;
    }
    async loop() {
        let url = 'https://ssr.inu1255.cn/api/node/brook?token=' + this.token;
        var { data } = await axios.get(url);
        let args = ['servers'];
        for (let item of data.data) {
            args.push('-l', `:${item.port} ${item.passwd}`);
        }
        let cmd = args.join(' ');
        if (this.prevCmd != cmd) {
            console.log(new Date().toLocaleString(), 'brook', cmd);
            this.prevCmd = cmd;
            if (this.prevExit) {
                await this.prevExit();
            }
            if (args.length > 1) {
                let proc = child_process.spawn('brook', args);
                let pms = new Promise((resolve, reject) => {
                    proc.on('exit', resolve);
                });
                this.prevExit = function() {
                    proc.kill('SIGINT');
                    return pms;
                };
                proc.stdout.on('data', x => console.log(x + ''));
                proc.stderr.on('data', x => console.error(x + ''));
            }
        }
    }
}

async function main() {
    let slave = new BrookSlave();
    await slave.init();
    while (true) {
        try {
            await slave.loop();
        } catch (error) {
            console.log(error);
        }
        await sleep(5e3);
    }
}

main.apply(null, process.argv.slice(2)).then(function() {
    console.log("end");
}).catch(function(err) {
    console.log(err);
    console.log("err end");
});