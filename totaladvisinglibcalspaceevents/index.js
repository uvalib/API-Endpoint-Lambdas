const ical = require('ical-generator');

const COMPANY_NAME = 'UVA Library';
const PRODUCT_NAME = 'AWS Lambda';
const RETRY_DELAY_MS = 1000;
const MAX_RETRIES = 3;

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function isRetryableError(err) {
  const msg = err?.message || '';

  return (
    err?.code === 'ETIMEDOUT' ||
    err?.code === 'ECONNRESET' ||
    err?.code === 'EAI_AGAIN' ||
    msg.includes('fetch failed')
  );
}

async function fetchWithRetry(url, options, description) {
  let lastError;

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    const start = Date.now();

    try {
      console.log(`${description}: attempt ${attempt}/${MAX_RETRIES}`);

      const response = await fetch(url, options);

      const elapsed = Date.now() - start;

      console.log(`${description}: completed in ${elapsed} ms`);

      if (response.status === 408 || response.status === 429 || response.status >= 500) {
        throw new Error(`${description}: HTTP ${response.status}`);
      }

      return response;
    } catch (err) {
      lastError = err;

      console.warn(`${description}: attempt ${attempt} failed`, {message: err.message, code: err.code});

      if (attempt === MAX_RETRIES || !isRetryableError(err)) {
        break;
      }

      const delay = RETRY_DELAY_MS * Math.pow(2, attempt - 1);

      console.log(`${description}: waiting ${delay} ms before retry`);

      await sleep(delay);
    }
  }

  throw lastError;
}

exports.handler = async (event) => {
  const spaceCategories = event?.query?.spaceCategories;

  if (!spaceCategories) {
    throw new Error("Missing 'query.spaceCategories' in event input");
  }

  console.log(`Fetching spaces for categories: ${spaceCategories}`);

  try {
    //
    // 1. Get OAuth Token
    //
    const tokenUrl = 'https://cal.lib.virginia.edu/1.1/oauth/token';

    const tokenBody = new URLSearchParams({
      client_id: process.env.client_id,
      client_secret: process.env.client_secret,
      grant_type: 'client_credentials'
    });

    const tokenResp = await fetchWithRetry(
      tokenUrl,
      {
        method: 'POST',
        headers: {
          'Content-Type':
            'application/x-www-form-urlencoded'
        },
        body: tokenBody
      },
      'OAuth token request'
    );

    if (!tokenResp.ok) {
      const msg = await tokenResp.text();

      throw new Error(`OAuth token request failed: ${tokenResp.status} ${msg}`);
    }

    const tokenJson = await tokenResp.json();

    //
    // 2. Get Spaces
    //
    const spacesUrl = `https://cal.lib.virginia.edu/1.1/space/nickname/${spaceCategories}`;

    console.log(`Fetching spaces from URL: ${spacesUrl}`);

    const spacesResp = await fetchWithRetry(
      spacesUrl,
      {
        method: 'GET',
        headers: {
          Authorization:
            `Bearer ${tokenJson.access_token}`
        }
      },
      'LibCal space request'
    );

    if (!spacesResp.ok) {
      const msg = await spacesResp.text();

      throw new Error(`Spaces request failed: ${spacesResp.status} ${msg}`);
    }

    const data = await spacesResp.json();

    const categories = data[0]?.categories || [];

    const space_ics_files = [];

    categories.forEach((category) => {
      const grp_name = category.name.substring(0, category.name.length - 1);

      category.spaces.forEach((space) => {
        let room_num = space.name.replace(/\D/g, '');

        if (!room_num) {
          room_num = space.name.replace(/ /g, '-');
        }

        const room_name = `${space.name} ${grp_name}`;

        const ics_file = ical({
          name: room_name,
          prodId: {
            company: COMPANY_NAME,
            product: PRODUCT_NAME
          },
          method: 'publish'
        });

        ics_file.ttl(60 * 30);

        space.bookings.forEach((evt) => {
          ics_file.createEvent({
            summary: evt.nickname,
            start: evt.start,
            end: evt.end,
            timestamp: evt.created,
            location: room_name
          });
        });

        space_ics_files.push({room: room_num, data: ics_file.toString()});
      });
    });

    return space_ics_files;
  } catch (err) {
    console.error('Lambda error:', err);
    throw err;
  }
};