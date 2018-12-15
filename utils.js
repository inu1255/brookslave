const child_process = require('child_process');

/**
 * @param {string} command
 * @returns {{err:child_process.ExecException,stdin:string,stdout:string}}
 */
exports.exec = function(command) {
    return new Promise((resolve, reject) => {
        child_process.exec(command, function(err, stdin, stdout) {
            resolve({ err, stdin, stdout });
        });
    });
};

exports.sleep = function(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
};

exports.b2m = function(bytes) {
    let units = ['b', 'kb', 'mb', 'gb'];
    var i = 0;
    while (bytes > 1e3) {
        bytes /= 1e3;
        i++;
    }
    return bytes.toFixed(2) + units[i];
};