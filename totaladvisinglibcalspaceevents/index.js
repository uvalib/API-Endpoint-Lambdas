
const ical = require('ical-generator');

const COMPANY_NAME = 'UVA Library';
const PRODUCT_NAME = 'AWS Lambda';

exports.handler = (event) => {
  const spaceCategories = event?.query?.spaceCategories;
  if (!spaceCategories) {
    return Promise.reject(new Error("Missing 'query.spaceCategories' in event input"));
  }
  console.log(`Fetching spaces for categories: ${spaceCategories}`);
  // === 1) Get OAuth token ===
  const tokenUrl = 'https://cal.lib.virginia.edu/1.1/oauth/token';
  const tokenBody = new URLSearchParams({
    client_id: process.env.client_id,
    client_secret: process.env.client_secret,
    grant_type: 'client_credentials'
  });

  return fetch(tokenUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: tokenBody
  })
    .then((tokenResp) => {
      if (!tokenResp.ok) {
        return tokenResp.text().then((msg) => {
          throw new Error(`OAuth token request failed: ${tokenResp.status} ${msg}`);
        });
      }
      return tokenResp.json();
    })
    .then((tokenJson) => {
      const access_token = tokenJson.access_token;

      // === 2) Fetch Spaces data ===
      const spacesUrl = `https://cal.lib.virginia.edu/1.1/space/nickname/${spaceCategories}`;
      console.log(`Fetching spaces from URL: ${spacesUrl}`);
      return fetch(spacesUrl, {
        method: 'GET',
        headers: { Authorization: `Bearer ${access_token}` }
      });
    })
    .then((spacesResp) => {
      if (!spacesResp.ok) {
        return spacesResp.text().then((msg) => {
          throw new Error(`Spaces request failed: ${spacesResp.status} ${msg}`);
        });
      }
      return spacesResp.json();
    })
    .then((data) => {
      const categories = data[0]?.categories || [];
      const space_ics_files = [];

      categories.forEach((category) => {
        const grp_name = category.name.substring(0, category.name.length - 1);

        category.spaces.forEach((space) => {
          let room_num = space.name.replace(/\D/g, '');
          room_num = room_num !== '' ? room_num : space.name.replace(/ /g, '-');

          const room_name = `${space.name} ${grp_name}`;
          const ics_file = ical({
            name: room_name,
            prodId: { company: COMPANY_NAME, product: PRODUCT_NAME },
            method: 'publish'
          });

          ics_file.ttl(60 * 30); // 30 min TTL

          space.bookings.forEach((evt) => {
            ics_file.createEvent({
              summary: evt.nickname,
              start: evt.start,
              end: evt.end,
              timestamp: evt.created,
              location: room_name
            });
          });

          space_ics_files.push({ room: room_num, data: ics_file.toString() });
        });
      });
      //console.log(space_ics_files);
      return space_ics_files;
    })
    .catch((err) => {
      console.error('Lambda error:', err);
      throw err; // Propagate error for Lambda to mark invocation as failed
    });
};
