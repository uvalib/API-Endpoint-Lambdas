const axios = require('axios');
const clientDomain = process.env.libinsight_client_domain;
const clientId = process.env.libinsight_client_id;
const clientSecret = process.env.libinsight_client_secret;
const datasetId = process.env.libinsight_sl3d_printer_allow_list_dataset_id;
const datasetType = 1; // 1 for Custom

async function getAuthToken(clientId, clientSecret) {
    const tokenUrl = `https://${clientDomain}/v1.0/oauth/token`;
    const data = new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        grant_type: 'client_credentials'
    });

    try {
        const response = await axios.post(tokenUrl, data, {
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            }
        });

        const token = response.data.access_token;
        console.log('Access Token:', token);
        return token;
    } catch (error) {
        console.error('Error obtaining token:', error.response ? error.response.data : error.message);
    }
}

async function postDataToCustomDataset(clientId, clientSecret, datasetId, datasetType, records) {
    const token = await getAuthToken(clientId, clientSecret);
    if (!token) {
        console.error('Failed to obtain access token');
        return;
    }

    const url = `https://${clientDomain}/post/v1.0/custom/${datasetId}/type/${datasetType}/save`;

    try {
        const response = await axios.post(url, records, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        console.log('Response:', response.data);
        return response.data;
    } catch (error) {
        console.error('Error posting data:', error.response ? error.response.data : error.message);
    }
}

function todayDateTimeFormatted() {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');

    return `${year}-${month}-${day} ${hours}:${minutes}`;
}

exports.handler = async (event) => {
  // Make sure the form submission POST data is a JSON object.
  const pData = event;

  // Verify that their field defined for the form before attempting to do anything
  if (pData.fields.length && (pData.fields.length > 0)) {
    // Get email address so we can strip out the computing id expected by NetBadge
    let email = pData.fields.find(t=>t.label === "<p>Email</p>") ? pData.fields.find(t=>t.label === "<p>Email</p>").val : '';
    if (email !== '') {
        const parts = email.split("@"); // computing id will be parts[0]

        let affiliation = pData.fields.find(t=>t.label === "<p>University Affiliation</p>") ? pData.fields.find(t=>t.label === "<p>University Affiliation</p>").val : '';
        if (affiliation !== '') {
            const records = [
                {
                    ts_start: todayDateTimeFormatted(),
                    field_1940: parts[0],
                    field_1941: affiliation
                }
            ];
            
            postDataToCustomDataset(clientId, clientSecret, datasetId, datasetType, records);    
        }
    }
  } 
}
