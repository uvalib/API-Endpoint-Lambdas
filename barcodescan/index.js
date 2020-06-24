exports.handler = (event, context, callback) => {

    const https = require("https");
    const agent = new https.Agent({rejectUnauthorized: false});
    const fetch = require('node-fetch');
    const holdURL = "https://ils-connector-ws-dev.internal.lib.virginia.edu/v4/requests/fill_hold/";
    const userURL = "https://uva.hosts.atlas-sys.com/illiadwebplatform/Users/ExternalUserId/";
    const illiadKey = process.env.illiad_key

    const errorResponse = function(message){
      return JSON.stringify({
        "error_messages": [
          message
        ]
      });
    }

    const fetchUserInfo = function(holdInfo){
      return fetch(userURL+holdInfo['user_id'], { agent:agent, headers:{'ApiKey':illiadKey} })
        .then(res=>res.json())
        .then(json=>{
            return JSON.stringify({hold:holdInfo,user:json});
        })
    }

    const barcode = event['query']['barcode'];
    if (!barcode) {
      callback(null, errorResponse("No barcode specified! Please try again with a barcode") );
    } else {
      fetch(holdURL+barcode,{ method: 'POST', agent:agent })
        .then(res=>res.json())
        .then(json=>{
            if ( Array.isArray(json) && json.length === 0 ) {
                return errorResponse("It seems that you have entered an invalid barcode, please check and try again.");
            } else {
                if (json["user_id"]) {
                  return fetchUserInfo(json);
                } else {
                  return JSON.stringify({hold:json});
                }
            }
        })
        .then( hold=>callback(null, hold) );
    }

};
