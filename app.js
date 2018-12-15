const child_process = require('child_process');
const axios = require('axios').default;

async function main(token) {
    let url = 'https://ssr.inu1255.cn/api/node/brook?token=' + token;
    let { data } = await axios.get(url);
    let args = ['servers'];
    for (let item of data.data) {
        args.push('-l', `:${item.port} ${item.passwd}`);
    }
    console.log('brook', args);
}

main.apply(null, process.argv.slice(2)).then(function() {
    console.log("end");
}).catch(function(err) {
    console.log(err);
    console.log("err end");
});