exports.handler = async function(event, context, callback) {

    const fetch = require('node-fetch');
    const authURL = process.env.ilsConnectorUrl+"/v4/users/sirsi_staff_login";
    const holdURL = process.env.ilsConnectorUrl+"/v4/requests/fill_hold/";
    const userURL = "https://uva.hosts.atlas-sys.com/illiadwebplatform/Users/ExternalUserId/";
    const illiadKey = process.env.ApiKey;

    const jsonHeaders = { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': "*"}

    const errorResponse = function(message){
      return JSON.stringify({ "hold": {"error_messages": [ message ]} });
    }

    const fetchUserInfo = function(holdInfo){
      return fetch(userURL+holdInfo['user_id'], { headers:{'ApiKey':illiadKey} })
        .then(res=>res.json())
        .then(json=>{ return JSON.stringify({hold:holdInfo,user:json}); })
    }

    const authUser = event.headers["userid"];
    const authPass = event.headers["password"];
    var sessionToken = event.headers["sessionToken"];

    // no authentication
    if (!sessionToken && !authUser && !authPass)
      callback(null, {'statusCode': 403, 'headers': {}, 'body': errorResponse("Please provide a session or user/pass!!!")} );
    // we have userid and pass but no token, get a session token
    if (!sessionToken && authUser && authPass) {
      const userpass = {username:authUser, password:authPass};
      let response = await fetch(authURL,{ method: 'POST', headers:{'Content-Type':"application/json"}, body: JSON.stringify(userpass)});
      let data = await response.json();
      // yeah, we got a session now!
      if (data.sessionToken) sessionToken = data.sessionToken;
      // yeah, looks like those creds were bad, bummer!
      else callback(null, {'statusCode': 403, 'headers': {}, 'body': errorResponse("Looks like that user/pass was no good!!!")} );
    }

    if (sessionToken) {
        // continue if we have a session token
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
          return fetch(holdURL+barcode,{ method: 'POST', headers:{'Authorization':"Bearer anything",'SirsiSessionToken':sessionToken} })
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
    } else {
       callback(null, {'statusCode': 403, 'headers': {}, 'body': errorResponse("Something odd happened, I'm not sure how you managed to get here!?!")} );
    }

};
