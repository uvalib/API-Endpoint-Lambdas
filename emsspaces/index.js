exports.handler = (event, context, callback) => {
    var request = require('request'),
        ical = require('ical-generator'),
        company_name = 'UVA Library',
        product_name = 'AWS Lambda',
        space_ics_files = new Array();
    // ID | Room     | Description
    //  6 | 318/318A | Harrison/Small 318
    // 16 | CLEM407  | Clemons 407
    // 17 | CLK133   | Brown 133
    // 19 | CLEM322  | Clemons 322
    var roomIdArray = [ 6, 16, 17, 19 ];

    // authentication for EMS API access
    request({
        url: 'http://lb-ems.eservices.virginia.edu/EmsPlatform/api/v1/clientauthentication/ ',
        method: 'POST',
        form: {
            'clientId': process.env.ems_api_id,
            'secret': process.env.ems_api_secret
        }
    }, function(err, res) {
        if (err) return callback(err);
        // Save client token for EMS API calls
        var json = JSON.parse(res.body);
        var clientToken = json.clientToken;
        var today = (new Date()).toISOString().split('T')[0] + 'T00:00:00Z';
        // Make EMSSpaces API call for desired locations event reservations for today or later
        request({
            url: 'http://lb-ems.eservices.virginia.edu/EmsPlatform/api/v1/bookings/actions/search?pageSize=2000',
            method: 'POST',
            headers: {
                'x-ems-api-token': clientToken
            },
            body: {
                'userBookingsOnly': false,
                'minReserveStartTime': today,
                'roomIds': roomIdArray
            }
        }, function(err, res) {
            // @TODO Adjust this code to accommodate the results of the EMS API calls???
            if (err) return callback(err);
            var data = JSON.parse(res.body);
            var results = data[0].results;
            // Loop through each room ID to get those events from the results to generate a single file for each room.
            for (var i = 0; i < roomIdArray.length; i++) {
                var room_code = '';
                var room_loc_num = '';
                var building = '';
                var timezone = '';
                var ics_file;
                // loop through results to retrieve one room event to capture room info and initialize iCal file
                for (var j = 0; j < results.length; j++) {
                    if (roomIdArray[i] == results[j].room.id) {
                        room_code = results[j].room.description.replace(/\//g,'-').replace(/ /g,'-');
                        room_loc_num = results[j].room.description;
                        building = results[j].room.building.description;
                        timezone = results[j].room.building.timeZone.name;
                        ics_file = ical({
                            name: building+' '+room_loc_num,
                            prodId: { company: company_name, product: product_name },
                            timezone: timezone,
                            method: 'publish'
                        });
                        ics_file.ttl(60 * 30); //time to live of 30 minutes (same as API cache)
                        break;
                    }
                } // for j
                // loop through the results to retrieve all the events for the room to add to the iCal file
                for (var k = 0; k < results.length; k++) {
                    if (roomIdArray[i] == results[k].room.id) {
                        var eventInfo = results[k].eventName + ' / ' + results[k].group.name;
                        ics_file.createEvent({ summary: eventInfo, start: results[k].eventStartTime,
                            end: results[k].eventEndTime, timestamp: results[k].audit.dateAdded, 
                            location: results[k].room.description });
                    }
                } // for k
                //console.log(ics_file.toString());
                space_ics_files.push({ room: room_code, data: ics_file.toString() });
            } // for i
            // callback should return the space_ics_files dataset and then the API call using this
            // Lambda function should retrieve the appropriate room data and return it.
            callback(null, space_ics_files);
        });
    });
};
