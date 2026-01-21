
/* eslint-disable no-console */
exports.handler = async (event, context) => {
  // --- Imports ---
  const { DateTime } = require("luxon");

  // Retrieve maximum of 500 bookings for the next 14 days from LibCal API
  // and maximum of 2000 bookings from EMS API for specified room IDs.
  // Combine into single JSON object for Visix consumption.
  const EMS_MAX_BOOKINGS = 2000; // maximum of 2000 allowed by EMS API
  const LIBCAL_MAX_BOOKINGS = 500; // maximum of 500 per page allowed by LibCal API
  const LIBCAL_DAYS_AHEAD = 14; // maximum of 365 days allowed by LibCal API
  const LIBCAL_MAX_PAGES = 6; // safety limit to avoid infinite loops and exceeding rate limits

  // --- Data structures ---
  const json_file = { event: [] };

  // EMS Spaces mapping (IDs only used in calls)
  const roomIdArray = [6, 16, 17, 19, 40, 46, 47, 48, 49, 50];

  // LibCal space category identifiers
  const spaceCategoryIDs = [
    "2181", // brown sel group study rooms
    "41529", // shannon group study rooms
    "2198", // rmc dml video studio
    "2196", // rmc dml audio studio
    "44970", // clemons 112
    "2177", // fine arts conference room
    "11625", // fine arts materials collection
    "2197", // fine arts R lab
    "2188", // music group study rooms
    "7390", // scholars lab mediated spaces/common room
    "42287", // scholars lab public spaces/308K
    "42319", // scholars lab private spaces/308B
    "42077", // shannon staff outlook spaces (includes Harrison/Small 311 and RBS rooms)
  ];

  // --- Date helpers ---
  function formatDate(date) {
    return date.setZone("America/New_York").toFormat("yyyy-MM-dd HH:mm");
  }
  
  // --- Helpers ---
  /**
   * Make a fetch call and return JSON. Throws with detailed error if not OK.
   * @param {string} url
   * @param {object} options - { method, headers, body }
   * @returns {Promise<any>}
   */
  async function fetchJson(url, options = {}) {
    const defaultHeaders = {
      "Content-Type": "application/json",
      ...(options.headers || {}),
    };

    const response = await fetch(url, {
      method: options.method || "GET",
      headers: defaultHeaders,
      body: options.body ? JSON.stringify(options.body) : undefined,
    });

    const text = await response.text(); // read once
    let data;
    try {
      data = text ? JSON.parse(text) : null;
    } catch (e) {
      // Non-JSON response; keep raw text for diagnostics
      data = { raw: text };
    }

    if (!response.ok) {
      const err = new Error(
        `Fetch failed: ${response.status} ${response.statusText} for ${url}`
      );
      err.response = {
        status: response.status,
        statusText: response.statusText,
        data,
      };
      throw err;
    }
    return data;
  }

  /**
   * Fetch all bookings for a given LibCal space category, paging until < LIBCAL_MAX_BOOKINGS.
   * Falls back safely if the endpoint doesn't support `page` (see notes).
   * @param {string|number} categoryID
   * @param {object} headers - Authorization header { Authorization: `Bearer ...` }
   * @returns {Promise<number>} total items appended
   */
  async function fetchAllLibCalBookingsForCategory(categoryID, headers) {
    const baseUrl = process.env.springshare_libcal_api_url;
    const limit = LIBCAL_MAX_BOOKINGS;
    const days = LIBCAL_DAYS_AHEAD;

    let page = 1;
    let total = 0;

    while (page <= LIBCAL_MAX_PAGES) {
      const url =
        `${baseUrl}/space/bookings` +
        `?days=${days}` +
        `&limit=${limit}` +
        `&include_remote=1` +
        `&include_cancel=0` +
        `&include_tentative=1` +
        `&cid=${categoryID}` +
        `&page=${page}`;

      const response = await fetch(url, { method: "GET", headers });
      if (!response.ok) {
        const errText = await response.text();
        const error = new Error(`LibCal fetch failed: ${response.status} ${response.statusText}`);
        error.response = { status: response.status, statusText: response.statusText, data: errText };
        throw error;
      }

      const data = await response.json();
      const count = Array.isArray(data) ? data.length : 0;

      console.log(`LibCal category ${categoryID}, page ${page}: ${count} items`);

      if (count > 0) {
        parseSpringshareBookingData(data);
        total += count;
      }

      // Stop when the API returns fewer than the limit (last page)
      if (count < limit) break;

      page += 1;

      // Springshare LibCal API has a rate limit of 25 requests per second.
      // Respect a 15 req/sec rate limit using value 66.
      await new Promise((res) => setTimeout(res, 66));
    }

    if (page > LIBCAL_MAX_PAGES) {
      console.warn(`Stopped after ${LIBCAL_MAX_PAGES} pages for category ${categoryID}; check API pagination support.`);
    }

    return total;
  }

  // Parse Springshare bookings and push into json_file.event
  function parseSpringshareBookingData(events) {
    events.forEach((evt) => {
      if (evt.nickname) {
        let location = evt.item_name;

        // Adjust location and event names for Scholars Lab common 308 spaces
        if (
          evt.item_name.includes("Common Room") ||
          evt.item_name.includes("Presentation Space") ||
          evt.item_name.includes("Training Workstations") ||
          evt.item_name.includes("VR Space")
        ) {
          location = "Common Room (Rm 308)";
          if (evt.item_name.includes("Common Room")) {
            evt.nickname += " (located in entire Common Room 308)";
          } else {
            evt.nickname += ` (located in ${evt.item_name})`;
          }
        }

        const startDt = DateTime.fromISO(evt.fromDate);
        const endDt = DateTime.fromISO(evt.toDate);
        let startDate = formatDate(startDt);
        let endDate = formatDate(endDt);

        // LibCal reserves after midnight in locations open mid-day -> overnight
        if (startDate.includes("24:")) {
          startDate = startDate.replace("24:", "00:");
          if (endDate.includes("24:")) {
            endDate = endDate.replace("24:", "00:");
          }
          json_file.event.push({
            name: evt.nickname,
            startTime: startDate,
            endTime: endDate,
            roomName: location,
            status: "confirmed",
          });

          // Event that ends at midnight
        } else if (endDate.includes("24:00")) {
          let endDate1 =
            startDt.setZone("America/New_York").toFormat("yyyy-MM-dd") +
            " 23:59";
          json_file.event.push({
            name: evt.nickname,
            startTime: startDate,
            endTime: endDate1,
            roomName: location,
            status: "confirmed",
          });

          // Event spans past midnight: split into two events (Visix doesn't support spanning days)
        } else if (endDate.includes("24:") || endDt.toISODate() !== startDt.toISODate()) {
          let endDate1 =
            startDt.setZone("America/New_York").toFormat("yyyy-MM-dd") +
            " 23:59";
          let startDate2 =
            endDt.setZone("America/New_York").toFormat("yyyy-MM-dd") + " 00:00";
          let endDate2 = endDate.replace("24:", "00:");

          json_file.event.push({
            name: evt.nickname,
            startTime: startDate,
            endTime: endDate1,
            roomName: location,
            status: "confirmed",
          });

          if (startDate2 !== endDate2) {
            json_file.event.push({
              name: evt.nickname,
              startTime: startDate2,
              endTime: endDate2,
              roomName: location,
              status: "confirmed",
            });
          }
        } else {
          json_file.event.push({
            name: evt.nickname,
            startTime: startDate,
            endTime: endDate,
            roomName: location,
            status: "confirmed",
          });
        }
      }
    });
  }

  try {
    // -------------------------------
    // Authenticate with EMS API
    // -------------------------------
    const emsAuth = {
      clientID: process.env.ems_api_id,
      secret: process.env.ems_api_secret,
    };

    const emsAuthUrl = `${process.env.ems_api_url}/clientauthentication/`;
    const emsAuthResponse = await fetchJson(emsAuthUrl, {
      method: "POST",
      body: emsAuth,
    });

    const emsToken = emsAuthResponse.clientToken;
    const today = DateTime.now().toISODate() + "T00:00:00Z";

    const emsData = {
      userBookingsOnly: false,
      minReserveStartTime: today,
      roomIds: roomIdArray,
    };

    const emsSearchUrl = `${process.env.ems_api_url}/bookings/actions/search?pageSize=${EMS_MAX_BOOKINGS}`;
    const emsResponse = await fetchJson(emsSearchUrl, {
      method: "POST",
      headers: { "x-ems-api-token": emsToken },
      body: emsData,
    });

    const emsResults = emsResponse.results || [];

    emsResults.forEach((result) => {
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
        status: "confirmed",
      });
    });

    // -------------------------------
    // Authenticate with LibCal API
    // -------------------------------
    const libCalAuth = {
      client_id: process.env.visix_libcal_client_id,
      client_secret: process.env.visix_libcal_client_secret,
      grant_type: "client_credentials",
    };

    const libCalAuthUrl = `${process.env.springshare_libcal_api_url}/oauth/token`;
    const libCalAuthResponse = await fetchJson(libCalAuthUrl, {
      method: "POST",
      body: libCalAuth,
    });

    const libCalToken = libCalAuthResponse.access_token;
    const libCalHeaders = { Authorization: `Bearer ${libCalToken}` };

    // Fetch bookings for up to LIBCAL_DAYS_AHEAD  across category groups, paging until < limit (see function above)
    for (const categoryID of spaceCategoryIDs) {
      const appended = await fetchAllLibCalBookingsForCategory(categoryID, libCalHeaders);
      console.log(`Category ${categoryID}: appended ${appended} bookings`);
    }

    console.log(`Total events fetched: ${json_file.event.length}`);
    //console.log(JSON.stringify(json_file));
    return json_file;
  } catch (error) {
    // Normalize error for consistent Lambda responses
    const statusCode =
      error?.response?.status ??
      (error?.response?.statusCode ?? 500);

    const errorBody = {
      message: error.message,
      ...(error?.response?.data ? { data: error.response.data } : {}),
    };

    const errorResponse = {
      statusCode,
      body: JSON.stringify(errorBody),
    };

    console.error(errorResponse);
    return errorResponse;
  }
};