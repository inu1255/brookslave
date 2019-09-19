const child_process = require('child_process');
const utils = require('./utils');

class Traffic {
    constructor() {
        this.onchange = function(port, u, d) {};
    }
    refresh() {
        return new Promise((resolve, reject) => {
            this.ports = {};
            let cur = {
                input: {},
                output: {},
            };
            // let total = 0;
            child_process.exec('iptables -t filter -L -xvn', (err, stdout, stderr) => {
                let lines = stdout.split('\n');
                let ports;
                for (let line of lines) {
                    let m = /chain (\w+) /i.exec(line);
                    if (m) {
                        ports = cur[m[1].toLowerCase()];
                        continue;
                    }
                    if (!ports) continue;
                    if (/^\s*\d/.test(line)) {
                        let ss = line.split(/\s+/).filter(x => x);
                        if (ss.length == 10) {
                            ss.splice(2, 0, '');
                        }
                        let [pkts, bytes, target, prot, opt, input, output, src, dst, _, pp] = ss;
                        if(!pp) continue;
                        pkts = +pkts;
                        bytes = +bytes;
                        let [ptype, port] = pp.split(':');
                        ports[port] = ports[port] || 0;
                        ports[port] += bytes;
                        // total += bytes + this.cnt + 5e5;
                        this.ports[port] = true;
                    }
                }
                this.cur = cur;
                // console.log(`总流量${utils.b2m(total)}`);
                resolve();
            });
        });
    }
    async diff(limit) {
        for (let port in this.ports) {
            let pu = this.prev.input[port] || 0;
            let pd = this.prev.output[port] || 0;
            let u = this.cur.input[port] || 0;
            let d = this.cur.output[port] || 0;
            u -= pu;
            d -= pd;
            if (u + d > limit) {
                try {
                    console.log(port, utils.b2m(u+d));
                    await this.onchange(port, u, d);
                    this.prev.input[port] = this.cur.input[port];
                    this.prev.output[port] = this.cur.output[port];
                } catch (error) {
                    console.log(`更新流量失败#port:${port}(${utils.b2m(u)},${utils.b2m(d)})`, error);
                }
            }
        }
    }
    async add(port) {
        if (!this.cur)
            await this.refresh();
        if (this.cur.input[port] == null)
            await utils.exec(`iptables -A INPUT -p tcp --dport ${port}`);
        if (this.cur.output[port] == null)
            await utils.exec(`iptables -A OUTPUT -p tcp --sport ${port}`);
    }
    show() {
        for(var port in this.cur.input){
            var u = this.cur.input[port];
            var d = this.cur.output[port] || 0;
            console.log(port, utils.b2m(u), utils.b2m(d));
        }
    }
    async run(limit, ms) {
        ms = ms || 5e3;
        await this.refresh();
        this.show();
        this.prev = JSON.parse(JSON.stringify(this.cur));
        while (true) {
            await utils.sleep(ms);
            await this.refresh();
            await this.diff(limit);
        }
    }
}

if (module === require.main) {
    async function main(params) {
        let t = new Traffic();
        await t.refresh();
        console.log(t);
    }
    main();
}

module.exports = Traffic;