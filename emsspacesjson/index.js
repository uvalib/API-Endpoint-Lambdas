exports.handler = (event, context, callback) => {
    var axios = require('axios'),
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
    var data = { 
        'clientID': process.env.ems_api_id,
        'secret': process.env.ems_api_secret
    };
    axios.post('http://lb-ems.eservices.virginia.edu/EmsPlatform/api/v1/clientauthentication/', data)
    .then((res) => {
        //console.log(`Status: ${res.status}`);
        //console.log(res.data);
        var token = res.data.clientToken;
        var config = { headers: { 'x-ems-api-token': token } };
        var today = (new Date()).toISOString().split('T')[0] + 'T00:00:00Z';
        data = {
            'userBookingsOnly': false,
            'minReserveStartTime': today,
            'roomIds': roomIdArray
        };
        axios.post('http://lb-ems.eservices.virginia.edu/EmsPlatform/api/v1/bookings/actions/search?pageSize=2000' , data, config)
        .then((res) => {
            //console.log(`Status: ${res.status}`);
            //console.log(JSON.stringify(res.data, null, 2));            
            var data = res.data;
            var results = data.results;
            // Loop through each room ID to get those events from the results to generate a single file for each room.
            for (var i = 0; i < roomIdArray.length; i++) {
                var room_code = '';
                var room_loc_num = '';
                var building = '';
                var ics_file;
                // loop through results to retrieve one room event to capture room info and initialize iCal file
                for (var j = 0; j < results.length; j++) {
                    if (roomIdArray[i] == results[j].room.id) {
                        room_code = results[j].room.description.replace(/\//g,'-').replace(/ /g,'-');
                        room_loc_num = results[j].room.description;
                        building = results[j].room.building.description;
                        ics_file = ical({
                            name: building+' '+room_loc_num,
                            prodId: { company: company_name, product: product_name },
                            timezone: 'America/New_York',
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
                        ics_file.createEvent({ summary: eventInfo, start: results[k].reserveStartTime,
                            end: results[k].reserveEndTime, timestamp: results[k].audit.dateAdded, 
                            location: results[k].room.description });
                    }
                } // for k
                //console.log(room_code);
                //console.log(ics_file.toString());
                space_ics_files.push({ room: room_code, data: ics_file.toString() });
            } // for i
            // callback should return the space_ics_files dataset and then the API call using this
            // Lambda function should retrieve the appropriate room data and return it.
            callback(null, space_ics_files);
        }).catch((err) => {
            console.error(err);
        })
    }).catch((err) => {
        console.error(err);
    });
};
