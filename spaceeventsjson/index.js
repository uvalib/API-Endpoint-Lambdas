exports.handler = (event, context, callback) => {
    const axios = require('axios');
    const request = require('request');
    const json_file = { event: [] };
    const timeOptions = { timeZone: 'America/New_York', hour12: false, hour: '2-digit', minute: '2-digit' };

    // EMS Spaces
    // ID | Room     | Description
    //  6 | 318/318A | Harrison/Small 318
    // 16 | CLEM407  | Clemons 407
    // 17 | CLK133   | Brown 133
    // 19 | CLEM322  | Clemons 322
    // 40 | G-Lab.   | G-Lab
    const roomIdArray = [ 6, 16, 17, 19, 40 ];

    // LibCal Space category identifiers are needed to retrieve all of the space events.
    const spaceCategoryIDs = ['2181,8435', // brown sel
                        '2198,2196', // rmc dml video studio and audio studio
                        '2177,11625,2197', // fine arts
                        '2188', // music
                        '3780,3781' // total advising 
                    ];
                    
    // get a date string for the number day out in the future from today
    function getDateString(numDayOut) {
        let theDate = new Date();
        theDate.setDate(theDate.getDate() + numDayOut);
        return theDate.toLocaleDateString('en-CA');
    }

    // parse the data returned from the Springshare API call and push it onto the global json_file object
    function parseSpringshareSpaceData(categories,theDate,addSixtyDays) {
        for (let i = 0; i < categories.length; i++) {
            // make sure the category has nicknames enabled before attempting to access events otherwise an error will occur
            if (categories[i].spaces) {
                // loop through spaces to get events and generate event data for each
                for (let j = 0; j < categories[i].spaces.length; j++) {
                    let room_num = categories[i].spaces[j].name.replace(/\D/g, '');
                    // if the room does not have a number then replace spaces in string with hyphens
                    room_num = (room_num != '') ? room_num : categories[i].spaces[j].name.replace(/ /g, '-');                    
                    let location = categories[i].spaces[j].name;
                    categories[i].spaces[j].bookings.forEach(function(evt) {
                        let startDt = new Date(evt.start);
                        let startDate = startDt.toLocaleDateString('en-CA') + ' ' + startDt.toLocaleTimeString('en-US',timeOptions);
                        let endDt = new Date(evt.end);
                        let endDate = endDt.toLocaleDateString('en-CA') + ' ' + endDt.toLocaleTimeString('en-US',timeOptions);
                        // LibCal for reserving after midnight in location that is open from mid-day overnight to next morning.
                        if (startDate.includes("24:")) {
                            startDate = startDate.replace("24:", "00:");
                            if (endDate.includes("24:")) {
                                endDate = endDate.replace("24:","00:");
                            }
                            json_file.event.push({ name: evt.nickname, startTime: startDate, endTime: endDate, roomName: location, status: "confirmed" });
                        // for an event that ends at midnight
                        } else if (endDate.includes("24:00")) {
                            let endDate1 = startDt.toLocaleDateString('en-CA') + ' 23:59';
                            json_file.event.push({ name: evt.nickname, startTime: startDate, endTime: endDate1, roomName: location, status: "confirmed" });
                        // for an event that runs past midnight two events need to be created as Visix doesn't support events spanning a day
                        } else if (endDate.includes("24:")) {
                            let endDate1 = startDt.toLocaleDateString('en-CA') + ' 23:59';
                            let startDate2 = endDt.toLocaleDateString('en-CA') + ' 00:00';
                            let endDate2 = endDate.replace("24:", "00:");
                            json_file.event.push({ name: evt.nickname, startTime: startDate, endTime: endDate1, roomName: location, status: "confirmed" });
                            json_file.event.push({ name: evt.nickname, startTime: startDate2, endTime: endDate2, roomName: location, status: "confirmed" });
                        } else {
                            json_file.event.push({ name: evt.nickname, startTime: startDate, endTime: endDate, roomName: location, status: "confirmed" });
                        }
                    });
                    if (addSixtyDays) {
                        for (let k=1; k < 60; k++) {
                            // create future dates for LibCal spaces
                            let nextDay = new Date(theDate);
                            nextDay.setDate(nextDay.getDate() + k);
                            let tomorrowStart = nextDay.toLocaleDateString('en-CA') + ' 00:00';
                            let tomorrowEnd = nextDay.toLocaleDateString('en-CA') + ' 23:59';
                            json_file.event.push({ name: "See https://cal.lib.virginia.edu/ for this date's schedule", startTime: tomorrowStart, endTime: tomorrowEnd, roomName: location, status: "confirmed" });
                        }    
                    }
                } // for j
            }
        } // for i
    }

    // authentication for EMS API access
    let data = { 
        'clientID': process.env.ems_api_id,
        'secret': process.env.ems_api_secret
    };
    axios.post('http://lb-ems.eservices.virginia.edu/EmsPlatform/api/v1/clientauthentication/', data)
    .then((res) => {
        //console.log(`Status: ${res.status}`);
        //console.log(res.data);
        let token = res.data.clientToken;
        let config = { headers: { 'x-ems-api-token': token } };
        let today = (new Date()).toISOString().split('T')[0] + 'T00:00:00Z';
        let data = {
            'userBookingsOnly': false,
            'minReserveStartTime': today,
            'roomIds': roomIdArray
        };
        axios.post('http://lb-ems.eservices.virginia.edu/EmsPlatform/api/v1/bookings/actions/search?pageSize=2000' , data, config)
        .then((res) => {
            //console.log(`Status: ${res.status}`);
            //console.log(JSON.stringify(res.data, null, 2));            
            let data = res.data;
            let results = data.results;
            // Loop through each room ID to get its events from the results.
            for (let i = 0; i < roomIdArray.length; i++) {
                // loop through the results to retrieve all the events for all EMS rooms
                for (let j = 0; j < results.length; j++) {
                    if (roomIdArray[i] == results[j].room.id) {
                        let eventInfo = results[j].eventName + ' / ' + results[j].group.name;
                        let startDt = new Date(results[j].reserveStartTime);
                        let startDate = startDt.toLocaleDateString('en-CA') + ' ' + startDt.toLocaleTimeString('en-US',timeOptions);
                        let endDt = new Date(results[j].reserveEndTime);
                        let endDate = endDt.toLocaleDateString('en-CA') + ' ' + endDt.toLocaleTimeString('en-US',timeOptions);
                        // for an event that ends at midnight
                        if (endDate.includes("24:00")) {
                            let endDate1 = startDt.toLocaleDateString('en-CA') + ' 23:59';
                            json_file.event.push({ name: eventInfo, startTime: startDate,
                                endTime: endDate1, roomName: results[j].room.description, status: "confirmed" });
                        // for an event that runs past midnight two events need to be created as Visix doesn't support events spanning a day
                        } else if (endDate.includes("24:")) {
                            let endDate1 = startDt.toLocaleDateString('en-CA') + ' 23:59';
                            let startDate2 = endDt.toLocaleDateString('en-CA') + ' 00:00';
                            let endDate2 = endDate.replace("24:", "00:");
                            json_file.event.push({ name: eventInfo, startTime: startDate,
                                endTime: endDate1, roomName: results[j].room.description, status: "confirmed" });
                            json_file.event.push({ name: eventInfo, startTime: startDate2,
                                endTime: endDate2, roomName: results[j].room.description, status: "confirmed" });
                        } else {
                            json_file.event.push({ name: eventInfo, startTime: startDate,
                                endTime: endDate, roomName: results[j].room.description, status: "confirmed" });
                        }
                    }
                } // for j
            } // for i
        }).catch((err) => {
            console.error(err);
        })
        .then(function() {
            // oAuth for LibCal API
            request({
                url: 'https://cal.lib.virginia.edu/1.1/oauth/token',
                method: 'POST',
                form: {
                    'client_id': process.env.client_id,
                    'client_secret': process.env.client_secret,
                    'grant_type': 'client_credentials'
                }
            }, function(err, res) {
                if (err) return callback(err);
                // Save access token for Springshare API calls
                let json = JSON.parse(res.body);
                let access_token = json.access_token;
                let today = getDateString(0);
                request({
                    url: 'https://cal.lib.virginia.edu/1.1/space/nickname/' + spaceCategoryIDs.join(',')+ '?date=' + today,
                    method: 'GET',
                    auth: {
                        'bearer': access_token
                    }
                }, function(err, res) {
                    if (err) return callback(err);
                    let data = JSON.parse(res.body);
                    let categories = data[0].categories;
                    parseSpringshareSpaceData(categories,today,false);
                    let firstDayOut = getDateString(1);
                    // get the first day out
                    request({
                        url: 'https://cal.lib.virginia.edu/1.1/space/nickname/' + spaceCategoryIDs.join(',')+ '?date=' + firstDayOut,
                        method: 'GET',
                        auth: {
                            'bearer': access_token
                        }
                    }, function(err, res) {
                        if (err) return callback(err);
                        let data = JSON.parse(res.body);
                        let categories = data[0].categories;
                        parseSpringshareSpaceData(categories,firstDayOut,false);
                        let secondDayOut = getDateString(2);
                        // get the second day out
                        request({
                            url: 'https://cal.lib.virginia.edu/1.1/space/nickname/' + spaceCategoryIDs.join(',')+ '?date=' + secondDayOut,
                            method: 'GET',
                            auth: {
                                'bearer': access_token
                            }
                        }, function(err, res) {
                            if (err) return callback(err);
                            let data = JSON.parse(res.body);
                            let categories = data[0].categories;
                            parseSpringshareSpaceData(categories,secondDayOut,false);
                            let thirdDayOut = getDateString(3);
                            // get the third day out
                            request({
                                url: 'https://cal.lib.virginia.edu/1.1/space/nickname/' + spaceCategoryIDs.join(',')+ '?date=' + thirdDayOut,
                                method: 'GET',
                                auth: {
                                    'bearer': access_token
                                }
                            }, function(err, res) {
                                if (err) return callback(err);
                                let data = JSON.parse(res.body);
                                let categories = data[0].categories;
                                parseSpringshareSpaceData(categories,thirdDayOut,false);
                                let fourthDayOut = getDateString(4);
                                // get the fourth day out
                                request({
                                    url: 'https://cal.lib.virginia.edu/1.1/space/nickname/' + spaceCategoryIDs.join(',')+ '?date=' + fourthDayOut,
                                    method: 'GET',
                                    auth: {
                                        'bearer': access_token
                                    }
                                }, function(err, res) {
                                    if (err) return callback(err);
                                    let data = JSON.parse(res.body);
                                    let categories = data[0].categories;
                                    parseSpringshareSpaceData(categories,fourthDayOut,false);
                                    let fifthDayOut = getDateString(5);
                                    // get the fifth day out
                                    request({
                                        url: 'https://cal.lib.virginia.edu/1.1/space/nickname/' + spaceCategoryIDs.join(',')+ '?date=' + fifthDayOut,
                                        method: 'GET',
                                        auth: {
                                            'bearer': access_token
                                        }
                                    }, function(err, res) {
                                        if (err) return callback(err);
                                        let data = JSON.parse(res.body);
                                        let categories = data[0].categories;
                                        parseSpringshareSpaceData(categories,fifthDayOut,false);
                                        let sixthDayOut = getDateString(6);
                                        // get the sixth day out
                                        request({
                                            url: 'https://cal.lib.virginia.edu/1.1/space/nickname/' + spaceCategoryIDs.join(',')+ '?date=' + sixthDayOut,
                                            method: 'GET',
                                            auth: {
                                                'bearer': access_token
                                            }
                                        }, function(err, res) {
                                            if (err) return callback(err);
                                            let data = JSON.parse(res.body);
                                            let categories = data[0].categories;
                                            parseSpringshareSpaceData(categories,sixthDayOut,false);
                                            let seventhDayOut = getDateString(7);
                                            // get the seventh day out
                                            request({
                                                url: 'https://cal.lib.virginia.edu/1.1/space/nickname/' + spaceCategoryIDs.join(',')+ '?date=' + seventhDayOut,
                                                method: 'GET',
                                                auth: {
                                                    'bearer': access_token
                                                }
                                            }, function(err, res) {
                                                if (err) return callback(err);
                                                let data = JSON.parse(res.body);
                                                let categories = data[0].categories;
                                                // indicate to look at the LibCal site for the next sixty days via the true attribute
                                                parseSpringshareSpaceData(categories,seventhDayOut,true);
    
                                                //console.log(JSON.stringify(json_file));
                                                // return JSON data for events for all EMS and LibCal spaced referenced.
                                                callback(null, json_file);
                                            });
                                        });
                                    });
                                });
                            });
                        });
                    });   
                });
            });
        });
    }).catch((err) => {
        console.error(err);
    });
};
