exports.handler = async function(event, context, callback) {

  const fetch = require('node-fetch');
//  const authURL = process.env.ilsConnectorUrl+"/v4/users/sirsi_staff_login";
//  const holdURL = process.env.ilsConnectorUrl+"/v4/requests/fill_hold/";
//  const userURL = "https://uva.hosts.atlas-sys.com/illiadwebplatform/Users/ExternalUserId/";
  const authURL = process.env.ilsConnectorStaffLoginUrl;
  const holdURL = process.env.ilsConnectorFillHoldUrl;
  const userURL = process.env.illiadUserUrl;
  const illiadKey = process.env.ApiKey;

  const jsonHeaders = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': "*",
    'Access-Control-Expose-Headers': "*",
    
  };

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
  const override = event.headers["override"];
  const action = event.headers["action"]; // can be set to 'auth' for auth only
  var sessionToken = event.headers["sessiontoken"];
  var sirsiUser;


  // no authentication
  if (!sessionToken && !authUser && !authPass)
    callback(null, {'statusCode': 403, 'headers': jsonHeaders, 'body': errorResponse("Please provide a session or user/pass!!!")} );
  // we have userid and pass but no token, get a session token
  if (!sessionToken && authUser && authPass) {
    const userpass = {username:authUser, password:authPass};
console.log("body:");
console.log(userpass);
    let response = await fetch(authURL,{ method: 'POST', headers: jsonHeaders, body: JSON.stringify(userpass)});
    sirsiUser = await response.json();
console.log("sirsi User return:");
console.log(sirsiUser);      
    // yeah, we got a session now!
    if (sirsiUser.sessionToken) sessionToken = sirsiUser.sessionToken;
    // yeah, looks like those creds were bad, bummer!
    else callback(null, {'statusCode': 401, 'headers': jsonHeaders, 'body': errorResponse("Looks like that user/pass was no good!!!")} );
  }

  if (action === "auth" && sirsiUser) {
    callback(null, {'statusCode': 200, 'headers': jsonHeaders, 'body': JSON.stringify(sirsiUser) } );
  }

  if (sessionToken && action !== "auth") {
      // give the user a session token so we don't have to keep passinng that pass around
      jsonHeaders.sessionToken = sessionToken;
      // continue if we have a session token
      const barcode =  (event.headers["barcode"])? event.headers["barcode"]: event['pathParameters']['barcode'];
      if (!barcode) {
        callback(null,
          {
            'statusCode': 404,
            'headers': jsonHeaders,
            'body': errorResponse("No barcode specified! Please try again with a barcode")
          }
        );
      } else {
        var barcodePath = (override=="OK")? barcode+"?override=OK":barcode
        return fetch(holdURL+barcodePath,{ method: 'POST', body: '{}', headers:{'Content-Type':'application/json','Authorization':"Bearer anything",'SirsiSessionToken':sessionToken} })
          .then(res=>res.json())
          .then(json=>{
console.log(json);
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
  } else if (action !== "auth") {
     callback(null, {'statusCode': 403, 'headers': jsonHeaders, 'body': errorResponse("Something odd happened, I'm not sure how you managed to get here!?!")} );
  }

};
