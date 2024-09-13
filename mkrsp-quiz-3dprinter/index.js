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
        const response = await fetch(tokenUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            },
            body: data.toString()
        });

        if (!response.ok) {
            const errorData = await response.text();
            console.error('Error obtaining token:', errorData);
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const responseData = await response.json();
        const token = responseData.access_token;
        return token;
    } catch (error) {
        console.error('Error obtaining token:', error);
        throw error; // Throw error after logging
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
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(records)
        });

        if (!response.ok) {
            const errorData = await response.text();
            console.error('Error posting data:', errorData);
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const responseData = await response.json();
        return responseData;
    } catch (error) {
        console.error('Error posting data:', error);
        throw error; // Throw error after logging
    }
}

function getCurrentTimeInTimeZone(timeZone) {
    const date = new Date();
    const options = {
        timeZone,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
    };

    const formatter = new Intl.DateTimeFormat('default', options);
    const parts = formatter.formatToParts(date);

    const dateParts = {};
    for (const part of parts) {
        dateParts[part.type] = part.value;
    }

    const formattedDate = `${dateParts.year}-${dateParts.month}-${dateParts.day} ${dateParts.hour}:${dateParts.minute}`;

    return formattedDate;
}

exports.handler = async (event, context, callback) => {
    // Make sure the form submission POST data is a JSON object.
    const pData = event;

    // Verify that their field defined for the form before attempting to do anything
    if (pData.fields.length && (pData.fields.length > 0)) {
        // Get email address so we can strip out the computing id expected by NetBadge
        let emailField = pData.fields.find(t => t.label === "<p>Email</p>");
        let email = emailField ? emailField.val : '';
        if (email !== '') {
            const parts = email.split("@"); // computing id will be parts[0]

            let affiliationField = pData.fields.find(t => t.label === "<p>University Affiliation</p>");
            let affiliation = affiliationField ? affiliationField.val : '';
            if (affiliation !== '') {
                const records = [
                    {
                        ts_start: getCurrentTimeInTimeZone('America/New_York'),
                        field_1940: parts[0],
                        field_1941: affiliation
                    }
                ];

                try {
                    await postDataToCustomDataset(clientId, clientSecret, datasetId, datasetType, records);
                } catch (error) {
                    console.error('Error in postDataToCustomDataset:', error);
                }
            }
        }
    }
};
