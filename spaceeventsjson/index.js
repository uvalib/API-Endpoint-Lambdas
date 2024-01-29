exports.handler = (event, context, callback) => {
    const axios = require('axios');
    const json_file = { event: [] };
    const timeOptions = { timeZone: 'America/New_York', hour12: false, hour: '2-digit', minute: '2-digit' };
    
    // EMS Spaces
    // ID | Room     | Description
    //  6 | 318/318A | Harrison/Small 318
    // 16 | CLEM407  | Clemons 407
    // 17 | CLK133   | Brown 133
    // 19 | CLEM322  | Clemons 322
    // 40 | G-Lab    | G-Lab
    // 46 | MAIN_207A| Study Court
    // 47 | MAIN_330 | Main 330
    // 48 | MAIN_223 | Classroom 223
    // 49 | MAIN_317 | Classroom 317
    // 50 | MAIN_415 | Classroom 415
    const roomIdArray = [ 6, 16, 17, 19, 40 , 46, 47, 48, 49, 50 ];
    
    // LibCal Space category identifiers are needed to retrieve all of the space events.
    const spaceCategoryIDs = ['2181,8435', // brown sel
                        '41529', // main lib group study rooms
                        '2198,2196', // rmc dml video studio and audio studio
                        '2177,11625,2197', // fine arts
                        '2188', // music
                        '3780,3781', // total advising
                        '42077' // staff outlook spaces
                    ];
    // All Springshare and Outlook reservable space names listed to use for padding out future dates to refer patrons to the LibCal website
    let springshareLocations = [
        "Brown 145", "Brown 147", "Brown 148", "Brown 152", "Brown 155", "Brown 156", "Brown G-046",
        "RMC Audio Studio", "Video Studio",
        "Fine Arts Conference Room", "Fine Arts Materials Collection", "Fine Arts R Lab",
        "L013 - Music Library Group Study Room", "L016 - Music Library Group Study Room",
        "318 C", "318 D", "318 F", "318 G", "318 H", "318 I", "318 K", "318 L", "Edgar Shannon Room (134)"
      ];
    let outlookLocations = [
        "Harrison/Small 311", "Main 321", "Main 323", "Main 421", "Main 508 C", "Main 515", "Main 521", "Main 522"
    ];
      
    // get a date string for the number day out in the future from today
    function getDateString(numDayOut) {
        let theDate = new Date();
        theDate.setDate(theDate.getDate() + numDayOut);
        return theDate.toLocaleDateString('en-CA');
    }
    
    // parse the data returned from the Springshare space/bookings API call and push it onto the global json_file object
    function parseSpringshareBookingData(events) {
        for (let i = 0; i < events.length; i++) {
          // make sure the category has nicknames enabled before attempting to access events otherwise an error will occur
          if (events[i].nickname) {
            let evt = events[i];
            let room_num = evt.item_name.replace(/\D/g, '');
            // if the room does not have a number then replace spaces in string with hyphens
            room_num = (room_num != '') ? room_num : evt.item_name.replace(/ /g, '-');                    
            let location = evt.item_name;
            let startDt = new Date(evt.fromDate);
            let startDate = startDt.toLocaleDateString('en-CA') + ' ' + startDt.toLocaleTimeString('en-US',timeOptions);
            let endDt = new Date(evt.toDate);
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
          }
        } // for i
    }
      
    // creates all day events in the future that point folks to look at LibCal
    function padDaysOut(locations, theDate, numDays, eventName) {
        for (let j=0; j < locations.length; j++) {
          for (let k=1; k < numDays+1; k++) {
            // create future dates for LibCal spaces
            let nextDay = new Date(theDate);
            nextDay.setDate(nextDay.getDate() + k);
            let tomorrowStart = nextDay.toLocaleDateString('en-CA') + ' 00:00';
            let tomorrowEnd = nextDay.toLocaleDateString('en-CA') + ' 23:59';
            json_file.event.push({ name: eventName, startTime: tomorrowStart, endTime: tomorrowEnd, roomName: locations[j], status: "confirmed" });
          }
        }
    }
    
    // authentication for EMS API access
    let emsAuth = { 
        'clientID': process.env.ems_api_id,
        'secret': process.env.ems_api_secret
    };
    
    // authentication for Springshare API access
    let springshareAuth = {
        'client_id': process.env.client_id,
        'client_secret': process.env.client_secret,
        'grant_type': 'client_credentials' 
    };
          
    axios.post('http://lb-ems.eservices.virginia.edu/EmsPlatform/api/v1/clientauthentication/', emsAuth)
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
        })    
        .then(function() {
            // oAuth for LibCal API
            axios.post('https://cal.lib.virginia.edu/1.1/oauth/token', springshareAuth)
            .then((res) => {
              //console.log(res.data.access_token);
              let access_token = res.data.access_token;
              //console.log(access_token);
              const config = {
                headers: {
                  Authorization: `Bearer ${access_token}`
                }
              }
              // get today for brown
              axios.get('https://cal.lib.virginia.edu/1.1/space/bookings?days=1&limit=500&include_remote=1&include_tentative=1&cid='+spaceCategoryIDs[0], config)
              .then((res) => {
                //console.log('brown');
                let events = res.data;
                if (events.length > 0) {
                  parseSpringshareBookingData(events);
                }
                // get today for main
                axios.get('https://cal.lib.virginia.edu/1.1/space/bookings?days=1&limit=500&include_remote=1&include_tentative=1&cid='+spaceCategoryIDs[1], config)
                .then((res) => {
                  //console.log('main');
                  let events = res.data;
                  if (events.length > 0) {
                    parseSpringshareBookingData(events);
                  }
                  // get today for rmc/dml
                  axios.get('https://cal.lib.virginia.edu/1.1/space/bookings?days=1&limit=500&include_remote=1&include_tentative=1&cid='+spaceCategoryIDs[2], config)
                  .then((res) => {
                    //console.log('rmc/dml');
                    let events = res.data;
                    if (events.length > 0) {
                      parseSpringshareBookingData(events);
                    }
                    // get today for fine arts
                    axios.get('https://cal.lib.virginia.edu/1.1/space/bookings?days=1&limit=500&include_remote=1&include_tentative=1&cid='+spaceCategoryIDs[3], config)
                    .then((res) => {
                      //console.log('fine arts');
                      let events = res.data;
                      if (events.length > 0) {
                        parseSpringshareBookingData(events);
                      }
                      // get today for music
                      axios.get('https://cal.lib.virginia.edu/1.1/space/bookings?days=1&limit=500&include_remote=1&include_tentative=1&cid='+spaceCategoryIDs[4], config)
                      .then((res) => {
                        //console.log('music');
                        let events = res.data;
                        if (events.length > 0) {
                          parseSpringshareBookingData(events);
                        }
                        // get today for total advising (page 1)
                        axios.get('https://cal.lib.virginia.edu/1.1/space/bookings?days=1&limit=500&include_remote=1&include_tentative=1&cid='+spaceCategoryIDs[5], config)
                        .then((res) => {
                          //console.log('total advising');
                          let events = res.data;
                          if (events.length > 0) {
                            parseSpringshareBookingData(events);
                          }
                          if (events.length == 500) {
                            axios.get('https://cal.lib.virginia.edu/1.1/space/bookings?page=2&days=1&limit=500&include_remote=1&include_tentative=1&cid='+spaceCategoryIDs[5], config)
                            .then((res) => {
                              //console.log('total advising page 2');
                              let events = res.data;
                              if (events.length > 0) {
                                parseSpringshareBookingData(events);
                              }  
                            })
                            .catch((err) => {
                              console.error(err);
                            });
                          }
                          // get today for staff outlook spaces
                          axios.get('https://cal.lib.virginia.edu/1.1/space/bookings?limit=500&include_remote=1&include_tentative=1&cid='+spaceCategoryIDs[6], config)
                          .then((res) => {
                            //console.log('staff outlook');
                            let events = res.data;
                            if (events.length > 0) {
                              parseSpringshareBookingData(events);
                            }
                            let eventName = "See https://cal.lib.virginia.edu/ for this date's schedule";
                            let lastDateWithEvents = getDateString(1);
                            //console.log("Springshare: "+lastDateWithEvents);
                            padDaysOut(springshareLocations,lastDateWithEvents,88,eventName);
                            eventName = "See Outlook calendar for this date's schedule";
                            lastDateWithEvents = getDateString(0);
                            //console.log("Outlook: "+lastDateWithEvents);
                            padDaysOut(outlookLocations,lastDateWithEvents,89,eventName);
                            //console.log(JSON.stringify(json_file));
                            // return JSON data for events for all EMS and LibCal spaced referenced.
                            callback(null, json_file);
                          })
                          .catch((err) => {
                            console.error(err);
                          });
            
                        })
                        .catch((err) => {
                          console.error(err);
                        });
                      })
                      .catch((err) => {
                        console.error(err);
                      });
                    })
                    .catch((err) => {
                      console.error(err);
                    });
                  })
                  .catch((err) => {
                    console.error(err);
                  });
                })
                .catch((err) => {
                  console.error(err);
                })
              })
              .catch((err) => {
                console.error(err);
              });
            })
            .catch((err) => {
              console.error(err);
            });
        });
    }).catch((err) => {
        console.error(err);
    });
};
