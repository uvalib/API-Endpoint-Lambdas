exports.handler = async (event, context, callback) => {

  const formName = 'SC Class Visit and Instruction';
  const nodeFetch = require('node-fetch');
  const headerObj = {'Content-Type': 'application/x-www-form-urlencoded'};

  // Environment variables configured for use with LibInsight API.
  const apiUrl = process.env.sc_class_instruction_api_url;
  const tokenUrl = process.env.sc_class_instruction_token_url;
  const clientId = process.env.sc_class_instruction_client_id;
  const clientSecret = process.env.sc_class_instruction_client_secret;

  // Initialize objects.
  const now = new Date();

  // Format parameter data for passing on a URL.
  const paramsString = function(obj) {
      return Object.keys(obj).map(key => key + '=' + encodeURIComponent(obj[key])).join('&');
  };

  // format session info for field in LibInsight
  const sessionLengthAndChoicesToString = function(sessNum, length, choice1, choice2, choice3) {
    let str = "Session " + sessNum + "\n\n";
    str += "Session length (minutes)\n" + length + "\n\n";
    str += "1st Choice\n" + choice1 + "\n";
    if (choice2 !== '') {
        str += "2nd Choice\n" + choice2 + "\n";
    }
    if (choice3 !== '') {
        str += "3rd Choice\n" + choice3 + "\n";
    }
    return str;
  }

  // Get OAuth2 token.
  const getAuthToken = async () => {
    const tokenResponse = await nodeFetch(tokenUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: paramsString({
        grant_type: 'client_credentials',
        client_id: clientId,
        client_secret: clientSecret
      })
    });

    if (!tokenResponse.ok) {
      throw new Error(`Failed to fetch token: ${tokenResponse.statusText}`);
    }

    const tokenData = await tokenResponse.json();
    return tokenData.access_token;
  };

  // Post the form data to LibInsight.
  const postData = async (reqId, formData) => {
    try {
      const token = await getAuthToken();
      const queryString = paramsString(formData);

      const response = await nodeFetch(apiUrl, {
        method: 'POST',
        body: JSON.stringify([formData]),
        headers: {
          ...headerObj,
          Authorization: `Bearer ${token}` 
        }
      });

      const body = await response.text();
      if (response.ok) {
        const result = JSON.parse(body);
        if (result.response) {
          console.log(`LibInsight data saved for ${reqId}: ` + body);
        }
      } else {
        console.log(`Bad response from ${apiUrl}: ` + body);
        throw new Error(`Bad response from ${apiUrl}: ` + body);
      }
    } catch (error) {
      console.log(`Error for request ${reqId}: `);
      console.log(error);
      return error;
    }
  };

  // Make sure the form submission POST data is a JSON object.
  const pData = event;

  // Verify that their field defined for the form before attempting to do anything
  if (pData.fields.length && (pData.fields.length > 0)) {
    // **CLASS VISIT AND INSTRUCTION FORM BEGIN
    let reqId = "SCV-"+ new Date().toISOString();
    let data = { 'field_874': reqId, 'ts_start': now };


    // Create contact info output content and set appropriate LibInsight fields.
    let name = pData.fields.find(t=>t.field_id === 4523504) ? pData.fields.find(t=>t.field_id === 4523504).val : '';
    if (name !== '') {
        data['field_877'] = name;
    }
    let emailAddress = pData.fields.find(t=>t.field_id === 4523505) ? pData.fields.find(t=>t.field_id === 4523505).val : '';
    if (emailAddress !== '') {
        data['field_878'] = emailAddress;
    }
    let phoneNumber = pData.fields.find(t=>t.field_id === 4523507) ? pData.fields.find(t=>t.field_id === 4523507).val : '';
    if (phoneNumber !== '') {
        data['field_879'] = phoneNumber;
    }
    let department = pData.fields.find(t=>t.field_id === 4523508) ? pData.fields.find(t=>t.field_id === 4523508).val : '';
    if (department !== '') {
        data['field_880'] = department;
    }
    let affiliation = pData.fields.find(t=>t.field_id === 4523511) ? pData.fields.find(t=>t.field_id === 4523511).val : '';
    if (affiliation !== '') {
        data['field_1880'] = affiliation.replaceAll('|' , ', ');
    }

    // Create course info output content and set appropriate LibInsight fields.
    let term = pData.fields.find(t=>t.field_id === 4523515) ? pData.fields.find(t=>t.field_id === 4523515).val : '';
    if (term !== '') {
        data['field_883'] = term;
    }
    let course = pData.fields.find(t=>t.field_id === 4523517) ? pData.fields.find(t=>t.field_id === 4523517).val : '';
    if (course !== '') {
        data['field_884'] = course;
    }
    let courseSection = pData.fields.find(t=>t.field_id === 4523518) ? pData.fields.find(t=>t.field_id === 4523518).val : '';
    if (courseSection !== '') {
        data['field_885'] = courseSection;
    }
    let courseTitle = pData.fields.find(t=>t.field_id === 4523519) ? pData.fields.find(t=>t.field_id === 4523519).val : '';
    if (courseTitle !== '') {
        data['field_886'] = courseTitle;
    }
    data['field_887'] = ''; // old enrollment field just being filled as empty.
    // Course syllabus is file field (an array of objects in LibWizard). Single file upload so will only have one entry.
    // CURRENTLY THIS FIELD IS NOT POPULATED VIA THE POST FEATURE IN LIBWIZARD
    let syllabus = pData.fields.find(t=>t.field_id === 4523522) ? pData.fields.find(t=>t.field_id === 4523522).val : '';
    if (typeof syllabus === "object") {
        data['field_941'] = 'Please consult the LibWizard Reports feature for the syllabus associated with this request.';
    }
    // Materials to cover/include is file field (an array of objects in LibWizard). Single file upload so will only have one entry.
    // CURRENTLY THIS FIELD IS NOT POPULATED VIA THE POST FEATURE IN LIBWIZARD
    let materials = pData.fields.find(t=>t.field_id === 4530988) ? pData.fields.find(t=>t.field_id === 4530988).val : '';
    if (typeof materials === "object") {
        data['field_1553'] = 'Please consult the LibWizard Reports feature for the materials associated with this request.';
    }
    // Additional info about course assignment is file field (an array of objects in LibWizard). Single file upload so will only have one entry.
    // CURRENTLY THIS FIELD IS NOT POPULATED VIA THE POST FEATURE IN LIBWIZARD
    let assignment = pData.fields.find(t=>t.field_id === 4530989) ? pData.fields.find(t=>t.field_id === 4530989).val : '';
    if (typeof assignment === "object") {
        data['field_1881'] = 'Please consult the LibWizard Reports feature for the course assignment(s) associated with this request.';
    }

    // Create session info output content and set appropriate LibInsight fields.
    data['field_1552'] = ''; // Session format not in LibWizard version of form.
    let whatKindInstruction = pData.fields.find(t=>t.field_id === 4523525) ? pData.fields.find(t=>t.field_id === 4523525).val : '';
    if (whatKindInstruction !== '') {
        data['field_888'] = whatKindInstruction.replaceAll('|' , ', ');
        if (data['field_888'].includes('Course-related instruction')) {
            let courseRelatedInstruction = pData.fields.find(t=>t.field_id === 4523614) ? pData.fields.find(t=>t.field_id === 4523614).val : '';
            data['field_889'] = courseRelatedInstruction;
        }
    }
    let numParticipants = pData.fields.find(t=>t.field_id === 4523526) ? pData.fields.find(t=>t.field_id === 4523526).val : '';
    if (numParticipants !== '') {
        data['field_890'] = numParticipants;
    }
    let participantLevels = pData.fields.find(t=>t.field_id === 4523527) ? pData.fields.find(t=>t.field_id === 4523527).val : '';
    if (participantLevels !== '') {
        data['field_891'] = participantLevels.replaceAll('|' , ', ');
        data['field_892'] = data['field_891']; // LibWizard adds other participant level to string of known ones so populate both with same values.
    }
    let explanation = pData.fields.find(t=>t.field_id === 4523566) ? pData.fields.find(t=>t.field_id === 4523566).val : '';
    if (explanation !== '') {
        data['field_893'] = explanation;
    }
    let goals = pData.fields.find(t=>t.field_id === 4523567) ? pData.fields.find(t=>t.field_id === 4523567).val : '';
    if (goals !== '') {
        data['field_894'] = goals;
    }
    let additionalInfo = pData.fields.find(t=>t.field_id === 4523568) ? pData.fields.find(t=>t.field_id === 4523568).val : '';
    data['field_895'] = additionalInfo.includes('want to cover specific materials') ? 'Yes' : 'No'; // cover specific materials field
    data['field_896'] = additionalInfo.includes('will need audiovisual support') ? 'Yes' : 'No'; // need audio-visual support field

    // Create session info output content and set appropriate LibInsight fields.
    // first session info
    let sess1Len = pData.fields.find(t=>t.field_id === 4523585) ? pData.fields.find(t=>t.field_id === 4523585).val : '';
    let sess1Choice1 = pData.fields.find(t=>t.field_id === 4523589) ? pData.fields.find(t=>t.field_id === 4523589).val : '';
    let sess1Choice2 = pData.fields.find(t=>t.field_id === 4523590) ? pData.fields.find(t=>t.field_id === 4523590).val : '';
    let sess1Choice3 = pData.fields.find(t=>t.field_id === 4523591) ? pData.fields.find(t=>t.field_id === 4523591).val : '';
    data['field_898'] = sessionLengthAndChoicesToString(1, sess1Len, sess1Choice1, sess1Choice2, sess1Choice3);
    let numSessions = 1; // at least one session is required to be submit the form
    // second session info
    let isSession2 = pData.fields.find(t=>t.field_id === 4523595) ? pData.fields.find(t=>t.field_id === 4523595).val : '';
    if (isSession2.includes('Yes')) {
        let sess2Len = pData.fields.find(t=>t.field_id === 4523598) ? pData.fields.find(t=>t.field_id === 4523598).val : '';
        let sess2Choice1 = pData.fields.find(t=>t.field_id === 4523599) ? pData.fields.find(t=>t.field_id === 4523599).val : '';
        let sess2Choice2 = pData.fields.find(t=>t.field_id === 4523600) ? pData.fields.find(t=>t.field_id === 4523600).val : '';
        let sess2Choice3 = pData.fields.find(t=>t.field_id === 4523601) ? pData.fields.find(t=>t.field_id === 4523601).val : '';
        data['field_899'] = sessionLengthAndChoicesToString(2, sess2Len, sess2Choice1, sess2Choice2, sess2Choice3);
        numSessions++;
    }
    // third session info
    let isSession3 = pData.fields.find(t=>t.field_id === 4523602) ? pData.fields.find(t=>t.field_id === 4523602).val : '';
    if (isSession3.includes('Yes')) {
        let sess3Len = pData.fields.find(t=>t.field_id === 4523604) ? pData.fields.find(t=>t.field_id === 4523604).val : '';
        let sess3Choice1 = pData.fields.find(t=>t.field_id === 4523605) ? pData.fields.find(t=>t.field_id === 4523605).val : '';
        let sess3Choice2 = pData.fields.find(t=>t.field_id === 4523606) ? pData.fields.find(t=>t.field_id === 4523606).val : '';
        let sess3Choice3 = pData.fields.find(t=>t.field_id === 4523607) ? pData.fields.find(t=>t.field_id === 4523607).val : '';
        data['field_900'] = sessionLengthAndChoicesToString(3, sess3Len, sess3Choice1, sess3Choice2, sess3Choice3);
        numSessions++;
    }
    data['field_897'] = numSessions;

    // Create comment info output if there is any.
    let comments = pData.fields.find(t=>t.field_id === 4523609) ? pData.fields.find(t=>t.field_id === 4523609).val : '';
    if (comments !== '') {
        data['field_904'] = comments;
    }

    try {
        return await postData(reqId, data);
    }
    catch (error) {
        console.log(`error: ${JSON.stringify(error)}`);
        return error;
    }
    // **CLASS VISIT AND INSTRUCTION FORM END
  } else {
      console.log(`Warning: ${formName} form submission without any fields in it.`);
  }
};