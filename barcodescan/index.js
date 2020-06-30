exports.handler = (event, context, callback) => {

    const fetch = require('node-fetch');
    const holdURL = process.env.ilsConnectorUrl+"/v4/requests/fill_hold/";
    const userURL = "https://uva.hosts.atlas-sys.com/illiadwebplatform/Users/ExternalUserId/";
    const illiadKey = process.env.ApiKey;

    const jsonHeaders = { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': "*"}

    const errorResponse = function(message){
      return JSON.stringify({ "error_messages": [ message ] });
    }

    const fetchUserInfo = function(holdInfo){
      return fetch(userURL+holdInfo['user_id'], { headers:{'ApiKey':illiadKey} })
        .then(res=>res.json())
        .then(json=>{ return JSON.stringify({hold:holdInfo,user:json}); })
    }

    const barcode =  event['pathParameters']['barcode'];
    if (!barcode) {
      callback(null,
        {
          'statusCode': 200,
          'headers': jsonHeaders,
          'body': errorResponse("No barcode specified! Please try again with a barcode")
        }
      );
    } else {
      return fetch(holdURL+barcode,{ method: 'POST', headers:{'Authorization':"Bearer anything"} })
        .then(res=>res.json())
        .then(json=>{
            if ( Array.isArray(json) && json.length === 0 ) {
                // Invalid barcode most likely
                return errorResponse("It seems that you have entered an invalid barcode, please check and try again.");
            } else {
                if (json["user_id"]) {
                  // Request successful since we have a userid
                  return fetchUserInfo(json);
                } else {
                  // Most likely have some errors in the response to pass back
                  return JSON.stringify({hold:json});
                }
            }
        })
        .then( hold=>{
          // send our response back through the API Gateway
          callback(null, {'statusCode': 200, 'headers': jsonHeaders, 'body': hold} );
        });

    }

};
