exports.handler = async (event, context, callback) => {
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

  try {
    // Authenticate with EMS API
    let emsAuth = {
      clientID: process.env.ems_api_id,
      secret: process.env.ems_api_secret
    };

    const emsAuthResponse = await axios.post(`${process.env.ems_api_url}/clientauthentication/`, emsAuth);
    const emsToken = emsAuthResponse.data.clientToken;

    const emsConfig = { headers: { 'x-ems-api-token': emsToken } };
    const today = DateTime.now().toISODate() + 'T00:00:00Z';

    const emsData = {
      userBookingsOnly: false,
      minReserveStartTime: today,
      roomIds: roomIdArray
    };

    const emsResponse = await axios.post(`${process.env.ems_api_url}/bookings/actions/search?pageSize=2000`, emsData, emsConfig);
    const emsResults = emsResponse.data.results;

    emsResults.forEach(result => {
      const eventInfo = `${result.eventName} / ${result.group.name}`;
      const startDt = DateTime.fromISO(result.eventStartTime);
      const endDt = DateTime.fromISO(result.eventEndTime);
      let startDate = formatDate(startDt);
      let endDate = formatDate(endDt);

      if (endDate.includes("24:00")) {
        endDate = `${startDt.toFormat("yyyy-MM-dd")} 23:59`;
      }

      json_file.event.push({
        name: eventInfo,
        startTime: startDate,
        endTime: endDate,
        roomName: result.room.description,
        status: "confirmed"
      });
    });

    // Authenticate with LibCal API
    const libCalAuth = {
      client_id: process.env.visix_libcal_client_id,
      client_secret: process.env.visix_libcal_client_secret,
      grant_type: 'client_credentials'
    };

    const libCalAuthResponse = await axios.post(`${process.env.springshare_libcal_api_url}/oauth/token`, libCalAuth);
    const libCalToken = libCalAuthResponse.data.access_token;

    const libCalConfig = {
      headers: { Authorization: `Bearer ${libCalToken}` }
    };

    // Fetch bookings for up to 14 days
    for (const categoryID of spaceCategoryIDs) {
      const libCalResponse = await axios.get(
        `${process.env.springshare_libcal_api_url}/space/bookings?days=14&limit=500&include_remote=1&include_cancel=0&include_tentative=0&cid=${categoryID}`,
        libCalConfig
      );

      if (libCalResponse.data.length > 0) {
        parseSpringshareBookingData(libCalResponse.data);
      }
    }

    callback(null, json_file);
  } catch (error) {
    console.error(error);
    callback(error);
  }
};