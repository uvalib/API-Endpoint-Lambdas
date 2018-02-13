exports.handler = (event, context, callback) => {
    var request = require('request'),
        ical = require('ical-generator'),
        company_name = 'UVA Library',
        product_name = 'AWS Lambda',
        space_ics_files = new Array();
    // oAuth for LibCal API
    request({
        url: 'https://api2.libcal.com/1.1/oauth/token',
        method: 'POST',
        form: {
            'client_id': process.env.client_id,
            'client_secret': process.env.client_secret,
            'grant_type': 'client_credentials'
        }
    }, function(err, res) {
        if (err) return callback(err);
        // Save access token for Springshare API calls
        var json = JSON.parse(res.body);
        var access_token = json.access_token;
        // Make Spaces API call for desired location Spaces
        // 3780 and 3781 are the Georges Student Center study room and conferenece room groups
        request({
            url: 'https://api2.libcal.com/1.1/space/nickname/3780,3781',
            method: 'GET',
            auth: {
              'bearer': access_token
            }
        }, function(err, res) {
          if (err) return callback(err);
          var data = JSON.parse(res.body);
          var categories = data[0].categories;
          // loop through categories, aka grouped spaces
          for (var i=0; i<categories.length; i++) {
            var grp_name = categories[i].name.substring(0, categories[i].name.length-1);
            // loop through spaces to get events and generate ics file content for each
            for (var j=0; j<categories[i].spaces.length; j++) {
              var room_num = categories[i].spaces[j].name.replace(/\D/g, '');
              var location = categories[i].spaces[j].name;
              var room_name = location + ' ' + grp_name;
              var ics_file = ical({name: room_name, prodId: {company: company_name, product: product_name}});
              ics_file.timezone('America/New_York');
              categories[i].spaces[j].bookings.forEach(function(evt, index, init_array) {
                ics_file.createEvent({summary: evt.nickname, start: evt.start, end: evt.end, timestamp: evt.created, location: room_name});
              });
              //console.log(ics_file.toString());
              space_ics_files.push({room: room_num, data: ics_file.toString()});
            } // for j
          } // for i
          // if the API call passes the room parameter, then use the code below to
          // retreive the desired ics data to return.
          //space_ics_files.forEach(function(space, index, init_array) {
          //  if (space.room == event.room) {
          //    callback(space.data, 'Success');
          //  }
          //});
          // callback should return the space_ics_files dataset and then the API call using this
          // Lambda function should retrieve the appropriate room data and return it.
          callback(null, space_ics_files);
        });
    });
};
