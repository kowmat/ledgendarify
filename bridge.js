const generators = require('./generators.js')
const request = require('request')


function sendJSON(
    JSON,                           // use generators.genSendJSON
    port = 10108,                   // optional arg
    address = 'http://localhost'    // optional arg
) {
    return new Promise((res, rej) => {
        request.post(
            address+':'+port+'/json',
            { json: JSON },
            (err, r, b) => {
                if (!err && (r == undefined || r.statusCode == 200)) {
                    res(b)
                } else {
                    rej({
                        error: err,
                        response: r
                    })
                }
            }
        )
    })
}



module.exports = {
    sendJSON: sendJSON
}
