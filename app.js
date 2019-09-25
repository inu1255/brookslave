const child_process = require('child_process');
const axios = require('axios').default;
const utils = require('./utils');
const Traffic = require('./traffic');

class BrookSlave {
	constructor() {
		this.prevCmd = '';
		this.prevExit;
		this.prev;
		this.traffic = new Traffic();
	}
	async init() {
		var { data } = await axios.get('https://ssr.inu1255.cn/api/node/gen');
		console.log(data.data.msg);
		this.token = data.data.token;
		var { data } = await axios.post('https://ssr.inu1255.cn/api/node/register', { token: this.token });
		if (data.no == 200) console.log('注册成功');
		this.traffic.onchange = this.onTraffic.bind(this);
		this.traffic.run(1e6, 5e3);
	}
	async onTraffic(port, u, d) {
		// console.log(port, utils.b2m(u), utils.b2m(d));
		var { data } = await axios.post('https://ssr.inu1255.cn/api/node/traffic', { port, u, d, token: this.token });
		if (data.no != 200) throw data.msg;
	}
	async loop() {
		let url = 'https://ssr.inu1255.cn/api/node/userlist?token=' + this.token;
		var { data } = await axios.get(url, { timeout: 5e3 });
		let args = ['servers'];
		for (let item of data.data) {
			this.traffic.add(item.port);
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
				let proc = child_process.spawn(__dirname + '/brook', args);
				let pms = new Promise((resolve, reject) => {
					proc.on('exit', resolve);
				});
				this.prevExit = function() {
					proc.kill('SIGINT');
					return pms;
				};
				// proc.stdout.on('data', x => console.log(x + ''));
				// proc.stderr.on('data', x => console.error(x + ''));
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
			if (/timeout/.test(error + ''))
				console.log(new Date().toLocaleString(), '请求超时', error.config.url);
			else
				console.log(new Date().toLocaleString(), error + '');
		}
		await utils.sleep(5e3);
	}
}

main.apply(null, process.argv.slice(2)).then(function() {
	console.log("end");
}).catch(function(err) {
	console.log(err);
	console.log("err end");
});