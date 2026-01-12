
const clientDomain = process.env.libinsight_client_domain;
const datasetId = process.env.libinsight_sl3d_printer_allow_list_dataset_id;
const startDate = '2024-08-01'; // creation/initial use of the quiz
const maxRetries = 3; // Maximum number of retries for a failed fetch request; Springshare has a 5 request limit per second

// --- Rate limit: 1 fetch per second ---
let lastFetchTimeMs = 0;
const RATE_LIMIT_INTERVAL_MS = 1000;

/**
 * Waits long enough so that we never perform more than one fetch per second.
 */
async function waitIfNeeded() {
  const now = Date.now();
  const elapsed = now - lastFetchTimeMs;
  if (elapsed < RATE_LIMIT_INTERVAL_MS) {
    await new Promise((resolve) => setTimeout(resolve, RATE_LIMIT_INTERVAL_MS - elapsed));
  }
  lastFetchTimeMs = Date.now();
}

// Function to get the access token
const getAccessToken = async () => {
    const tokenUrl = `https://${clientDomain}/v1.0/oauth/token`;

    const response = await fetch(tokenUrl, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: new URLSearchParams({
            client_id: process.env.libinsight_client_id,
            client_secret: process.env.libinsight_client_secret,
            grant_type: 'client_credentials'
        })
    });

    if (!response.ok) {
        throw new Error(`Failed to get access token: ${response.statusText}`);
    }

    const data = await response.json();
    return data.access_token;
};

// Function to get records for a specific page and date range
const getRecords = async (accessToken, fromDate, toDate, page) => {
    // Enforce the 1 req/sec rate limit  
    await waitIfNeeded();
    const recordsUrl = `https://${clientDomain}/v1.0/custom-dataset/${datasetId}/data-grid`;

    const response = await fetch(`${recordsUrl}?from=${fromDate}&to=${toDate}&page=${page}`, {
        headers: {
            'Authorization': `Bearer ${accessToken}`
        }
    });
    
    if (!response.ok) {
        //console.log('Response url:', response.url);
        //console.log('Response body:', response.body);
        throw new Error(`Failed to fetch records: ${response.status} - ${response.statusText}`);
    } else {
        console.log(`Fetched page ${page} for date range ${fromDate} to ${toDate}`);
    }

    return await response.json();
};

// Function to split date range into yearly intervals
const splitDateRange = (start, end) => {
    const startDate = new Date(start);
    const endDate = new Date(end);
    const dates = [];

    while (startDate <= endDate) {
        const yearEnd = new Date(startDate);
        yearEnd.setFullYear(startDate.getFullYear() + 1);
        yearEnd.setDate(yearEnd.getDate() - 1);

        if (yearEnd > endDate) {
            yearEnd.setTime(endDate.getTime());
        }

        dates.push({
            from: startDate.toISOString().split('T')[0],
            to: yearEnd.toISOString().split('T')[0]
        });

        startDate.setFullYear(startDate.getFullYear() + 1);
        startDate.setDate(1);
    }

    return dates;
};

// Function to fetch records with retry mechanism
const fetchRecordsWithRetry = async (accessToken, fromDate, toDate, page) => {
    let retries = 0;
    while (retries < maxRetries) {
        try {
            return await getRecords(accessToken, fromDate, toDate, page);
        } catch (error) {
            retries++;
            console.log(`Retrying (${retries}/${maxRetries})...`);
            console.error(`Error fetching page ${page} for date range ${fromDate} to ${toDate}: ${error.message}`);
            if (retries >= maxRetries) {
                throw error;
            }
        }
    }
};

function todayFormatted() {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');

    return `${year}-${month}-${day}`;
}

exports.handler = async (event, context) => {
    try {
        let allRecords = [];
        const endDate = todayFormatted();
        const dateRanges = splitDateRange(startDate, endDate);
        console.log('Date Ranges:', dateRanges);

        const accessToken = await getAccessToken();
        for (const range of dateRanges) {
            let page = 1;
            let records;

            do {
                records = await fetchRecordsWithRetry(accessToken, range.from, range.to, page);
                allRecords = allRecords.concat(records.payload.records);
                page++;
            } while (page <= records.payload.records.total_pages);
        }

        // Generate the CSV data as a string with proper newlines
        let csvData = allRecords.map(obj => obj.computing_id).join('\r\n');

        // Return the CSV data with correct headers
        const response = {
            statusCode: 200,
            headers: {
                'Content-Type': 'text/csv',
                'Content-Disposition': 'attachment; filename="records.csv"',
            },
            body: csvData,
            isBase64Encoded: false  // This ensures that the body is treated as plain text
        };
        return response;
    } catch (error) {
        const errorResponse = {
            statusCode: error.response ? error.response.status : 500,
            body: JSON.stringify({ message: error.message }),
        };
        return errorResponse;
    }
};