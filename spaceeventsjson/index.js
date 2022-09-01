exports.handler = (event, context, callback) => {
    var axios = require('axios');

    // EMS Spaces
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
            var json_file = { event: [] };
            const timeOptions = { hour12: false, hour: '2-digit', minute: '2-digit' };
            // Loop through each room ID to get its events from the results.
            for (var i = 0; i < roomIdArray.length; i++) {
                // loop through the results to retrieve each event's details and add to the array to be returned
                for (var k = 0; k < results.length; k++) {
                    if (roomIdArray[i] == results[k].room.id) {
                        var eventInfo = results[k].eventName + ' / ' + results[k].group.name;
                        const startDt = new Date(results[k].reserveStartTime);
                        // using the en-CA Canadian locale for date strings to get a format of YYYY-MM-DD since US locale does not 
                        // return that format by default.
                        let startDate = startDt.toLocaleDateString('en-CA') + ' ' + startDt.toLocaleTimeString('en-US',timeOptions);
                        const endDt = new Date(results[k].reserveEndTime);
                        let endDate = endDt.toLocaleDateString('en-CA') + ' ' + endDt.toLocaleTimeString('en-US',timeOptions);
                        // for an event that ends at midnight
                        if (endDate.includes("24:00")) {
                            let endDate1 = startDt.toLocaleDateString('en-CA') + ' 23:59';
                            json_file.event.push({ name: eventInfo, startTime: startDate,
                                endTime: endDate1, roomName: results[k].room.description, status: "confirmed" });
                        // for an event that runs past midnight two events need to be created as Visix doesn't support events spanning a day
                        } else if (endDate.includes("24:")) {
                            let endDate1 = startDt.toLocaleDateString('en-CA') + ' 23:59';
                            let startDate2 = endDt.toLocaleDateString('en-CA') + ' 00:00';
                            let endDate2 = endDate.replace("24:", "00:");
                            json_file.event.push({ name: eventInfo, startTime: startDate,
                                endTime: endDate1, roomName: results[k].room.description, status: "confirmed" });
                            json_file.event.push({ name: eventInfo, startTime: startDate2,
                                endTime: endDate2, roomName: results[k].room.description, status: "confirmed" });
                        } else {
                            json_file.event.push({ name: eventInfo, startTime: startDate,
                                endTime: endDate, roomName: results[k].room.description, status: "confirmed" });
                        }
                    }
                } // for k
            } // for i
            // callback should return the space_ics_files dataset and then the API call using this
            // Lambda function should retrieve the appropriate room data and return it.
            //console.log(JSON.stringify(json_file));
            callback(null, JSON.stringify(json_file));
        }).catch((err) => {
            console.error(err);
        })
    }).catch((err) => {
        console.error(err);
    });
};