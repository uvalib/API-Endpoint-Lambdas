exports.handler = (event, context, callback) => {
  const axios = require('axios');
  const json_file = { event: [] };
  const { DateTime } = require("luxon");
  
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
                      '2198,2196,44970', // rmc dml video studio and audio studio, and clemons 112
                      '2177,11625,2197', // fine arts
                      '2188', // music
                      '7390,42287,42319', // scholars lab 
                      '3780,3781', // total advising
                      '42077' // staff outlook spaces
                  ];
    
  // All Springshare and Outlook reservable space names listed to use for padding out future dates to refer patrons to the LibCal website
  let springshareLocations = [
      "Brown 145", "Brown 147", "Brown 148", "Brown 152", "Brown 155", "Brown 156", "Brown G-046",
      "RMC Audio Studio", "Video Studio",
      "Fine Arts Conference Room", "Fine Arts Materials Collection", "Fine Arts R Lab",
      "L013 - Music Library Group Study Room", "L016 - Music Library Group Study Room",
      "Common Room (Rm 308)", "308B (Fellows Conference Room)", "308K (Consultation Room)",
      "318 C", "318 D", "318 F", "318 G", "318 H", "318 I", "318 K", "318 L", "134 - Conference Room", "Shannon 321 (Taylor Room)"
    ];
  let outlookLocations = [
    "Harrison/Small 311", "Main 323", "Main 421", "Main 508 C", "Main 515", "Main 521", "Main 522",
    "RBS234-Tanenbaum", "RBS-236-Seminar C", "RBS238-Belanger", "RBS240-Printing Office"
];
    
  // get a date string for the number of days out in the future from today
  function getFutureDateString(numDaysOut) {
      let theDate = DateTime.now();
      return theDate.plus({days: numDaysOut}).toFormat("yyyy-MM-dd");
  }
  
  function formatDate(date) {
    return date.setZone('America/New_York').toFormat("yyyy-MM-dd HH:mm");
  }
  // parse the data returned from the Springshare space/bookings API call and push it onto the global json_file object
  function parseSpringshareBookingData(events) {
    events.forEach(evt => {
      if (evt.nickname) {
        let location = evt.item_name;
        // adjust location and event names for Scholars Lab common 308 spaces
        if (evt.item_name.includes('Common Room') || evt.item_name.includes('Presentation Space') || evt.item_name.includes('Training Workstations') || evt.item_name.includes('VR Space')) {
          location = 'Common Room (Rm 308)';
          if (evt.item_name.includes('Common Room')) {
            evt.nickname += ' (located in entire Common Room 308)';
          } else {
            evt.nickname += ' (located in ' + evt.item_name + ')';
          }
        }

        const startDt = DateTime.fromISO(evt.fromDate);
        const endDt = DateTime.fromISO(evt.toDate);
        let startDate = formatDate(startDt);
        let endDate = formatDate(endDt);

        // LibCal for reserving after midnight in location that is open from mid-day overnight to next morning.
        if (startDate.includes("24:")) {
          startDate = startDate.replace("24:", "00:");
          if (endDate.includes("24:")) {
            endDate = endDate.replace("24:", "00:");
          }
          json_file.event.push({ name: evt.nickname, startTime: startDate, endTime: endDate, roomName: location, status: "confirmed" });
        // for an event that ends at midnight
        } else if (endDate.includes("24:00")) {
          let endDate1 = startDt.setZone('America/New_York').toFormat("yyyy-MM-dd") + ' 23:59';
          json_file.event.push({ name: evt.nickname, startTime: startDate, endTime: endDate1, roomName: location, status: "confirmed" });
        // for an event that runs past midnight two events need to be created as Visix doesn't support events spanning a day
        } else if (endDate.includes("24:") || (endDt.toISODate() !== startDt.toISODate())) {
          let endDate1 = startDt.setZone('America/New_York').toFormat("yyyy-MM-dd") + ' 23:59';
          let startDate2 = endDt.setZone('America/New_York').toFormat("yyyy-MM-dd") + ' 00:00';
          let endDate2 = endDate.replace("24:", "00:");
          json_file.event.push({ name: evt.nickname, startTime: startDate, endTime: endDate1, roomName: location, status: "confirmed" });
          if (startDate2 !== endDate2) {
            json_file.event.push({ name: evt.nickname, startTime: startDate2, endTime: endDate2, roomName: location, status: "confirmed" });
          }
        } else {
          json_file.event.push({ name: evt.nickname, startTime: startDate, endTime: endDate, roomName: location, status: "confirmed" });
        }
      }
    });
  }
    
  // creates all day events in the future that point folks to look at LibCal
  function padDaysOut(locations, theDate, numDays, eventName) {
      for (let j=0; j < locations.length; j++) {
        for (let k=0; k < numDays; k++) {
          // create future dates for LibCal spaces
          let nextDay = DateTime.fromISO(theDate).plus({days: k});
          let tomorrowStart = nextDay.toFormat("yyyy-MM-dd") + ' 00:00';
          let tomorrowEnd = nextDay.toFormat("yyyy-MM-dd") + ' 23:59';
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
          let data = res.data;
          let results = data.results;
          // Loop through each room ID to get its events from the results.
          for (let i = 0; i < roomIdArray.length; i++) {
              // loop through the results to retrieve all the events for all EMS rooms
              for (let j = 0; j < results.length; j++) {
                  if (roomIdArray[i] == results[j].room.id) {
                      let eventInfo = results[j].eventName + ' / ' + results[j].group.name;
                      let startDt = DateTime.fromISO(results[j].eventStartTime);
                      let startDate = startDt.setZone('America/New_York').toFormat("yyyy-MM-dd HH:mm");
                      let endDt = DateTime.fromISO(results[j].eventEndTime);
                      let endDate = endDt.setZone('America/New_York').toFormat("yyyy-MM-dd HH:mm");
                      // for an event that ends at midnight
                      if (endDate.includes("24:00")) {
                          let endDate1 = startDt.setZone('America/New_York').toFormat("yyyy-MM-dd") + ' 23:59';
                          json_file.event.push({ name: eventInfo, startTime: startDate, endTime: endDate1, roomName: results[j].room.description, status: "confirmed" });
                      // for an event that runs past midnight two events need to be created as Visix doesn't support events spanning a day
                      } else if (endDate.includes("24:") || (endDt.toISODate() !== startDt.toISODate())) {
                          let endDate1 = startDt.setZone('America/New_York').toFormat("yyyy-MM-dd") + ' 23:59';
                          let startDate2 = endDt.setZone('America/New_York').toFormat("yyyy-MM-dd") + ' 00:00';
                          let endDate2 = endDate.replace("24:", "00:");
                          json_file.event.push({ name: eventInfo, startTime: startDate, endTime: endDate1, roomName: results[j].room.description, status: "confirmed" });
                          if (startDate2 !== endDate2) {
                              json_file.event.push({ name: eventInfo, startTime: startDate2, endTime: endDate2, roomName: results[j].room.description, status: "confirmed" });
                          }
                      } else {
                          json_file.event.push({ name: eventInfo, startTime: startDate, endTime: endDate, roomName: results[j].room.description, status: "confirmed" });
                      }
                  }
              } // for j
          } // for i
      })    
      .then(function() {
          // oAuth for LibCal API
          axios.post('https://cal.lib.virginia.edu/1.1/oauth/token', springshareAuth)
          .then((res) => {
            let access_token = res.data.access_token;
            const config = {
              headers: {
                Authorization: `Bearer ${access_token}`
              }
            }
            // get today for brown
            axios.get('https://cal.lib.virginia.edu/1.1/space/bookings?days=1&limit=500&include_remote=1&include_cancel=0&include_tentative=0&cid='+spaceCategoryIDs[0], config)
            .then((res) => {
              //console.log('brown');
              let events = res.data;
              if (events.length > 0) {
                parseSpringshareBookingData(events);
              }
              // get today for main
              axios.get('https://cal.lib.virginia.edu/1.1/space/bookings?days=1&limit=500&include_remote=1&include_cancel=0&include_tentative=0&cid='+spaceCategoryIDs[1], config)
              .then((res) => {
                //console.log('main');
                let events = res.data;
                if (events.length > 0) {
                  parseSpringshareBookingData(events);
                }
                // get today for rmc/dml
                axios.get('https://cal.lib.virginia.edu/1.1/space/bookings?days=1&limit=500&include_remote=1&include_cancel=0&include_tentative=0&cid='+spaceCategoryIDs[2], config)
                .then((res) => {
                  //console.log('rmc/dml');
                  let events = res.data;
                  if (events.length > 0) {
                    parseSpringshareBookingData(events);
                  }
                  // get today for fine arts
                  axios.get('https://cal.lib.virginia.edu/1.1/space/bookings?days=1&limit=500&include_remote=1&include_cancel=0&include_tentative=0&cid='+spaceCategoryIDs[3], config)
                  .then((res) => {
                    //console.log('fine arts');
                    let events = res.data;
                    if (events.length > 0) {
                      parseSpringshareBookingData(events);
                    }
                    // get today for music
                    axios.get('https://cal.lib.virginia.edu/1.1/space/bookings?days=1&limit=500&include_remote=1&include_cancel=0&include_tentative=0&cid='+spaceCategoryIDs[4], config)
                    .then((res) => {
                      //console.log('music');
                      let events = res.data;
                      if (events.length > 0) {
                        parseSpringshareBookingData(events);
                      }
                      // get today for scholars lab
                      axios.get('https://cal.lib.virginia.edu/1.1/space/bookings?days=1&limit=500&include_remote=1&include_tentative=1&include_cancel=0&cid='+spaceCategoryIDs[5], config)
                      .then((res) => {
                        //console.log('scholars lab');
                        let events = res.data;
                        if (events.length > 0) {
                          parseSpringshareBookingData(events);
                        }
                        // get today for staff outlook spaces
                        axios.get('https://cal.lib.virginia.edu/1.1/space/bookings?limit=500&include_remote=1&include_tentative=1&include_cancel=0&cid='+spaceCategoryIDs[7], config)
                        .then((res) => {
                          //console.log('staff outlook');
                          let events = res.data;
                          if (events.length > 0) {
                            parseSpringshareBookingData(events);
                          }
                          let eventName = "See https://cal.lib.virginia.edu/ for this date's schedule";
                          let lastDateWithEvents = getFutureDateString(2);
                          //console.log("Springshare: "+lastDateWithEvents);
                          padDaysOut(springshareLocations,lastDateWithEvents,88,eventName);
                          eventName = "See Outlook calendar for this date's schedule";
                          lastDateWithEvents = getFutureDateString(1);
                          //console.log("Outlook: "+lastDateWithEvents);
                          padDaysOut(outlookLocations,lastDateWithEvents,89,eventName);
                          //console.log(JSON.stringify(json_file));
                          // return JSON data for events for all EMS and LibCal spaced referenced.
                          callback(null, json_file);
                        })
                        .catch((err) => {
                          console.error(err);
                        }); // end staff outlook spaces
                      })
                      .catch((err) => {
                        console.error(err);
                      }); // end scholars lab spaces
                    })
                    .catch((err) => {
                      console.error(err);
                    }); // end music spaces
                  })
                  .catch((err) => {
                    console.error(err);
                  }); // end fine arts spaces
                })
                .catch((err) => {
                  console.error(err);
                }); // end main spaces
              })
              .catch((err) => {
                console.error(err);
              }) // end brown spaces
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
