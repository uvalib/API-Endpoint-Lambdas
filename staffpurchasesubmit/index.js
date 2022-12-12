exports.handler = (event, context, callback) => {

  const formName = 'Staff Purchase Request';
  const nodeFetch = require('node-fetch');
  const stripHtml = require('string-strip-html');
  const headerObj = {'Content-Type': 'application/x-www-form-urlencoded'};

  // Environment variables configured for use with sending emails and saving data to LibInsight for forms.
  const emailSecret = process.env.email_secret;
  const apiUrl = process.env.staff_purch_req_api_url; 
  
  // Initialize email info and objects.
  const emailUrl = 'https://api.library.virginia.edu/mailer/mailer.js';
  let libraryOptions = { secret: emailSecret, from: '"UVA Library" <no-reply-library@Virginia.EDU>', replyTo: '',
      to: '', cc: '', bcc: '', subject: '', text: '', html: '', attach_type: 'attach', sourceFile: '', destFile: '',
      attach_type1: 'attach', sourceFile1: '', destFile1: ''
  };
  let patronOptions = { secret: emailSecret, from: '"UVA Library" <no-reply-library@Virginia.EDU>', replyTo: '"UVA Library" <NO-REPLY-LIBRARY@Virginia.EDU>',
      to: '', cc: '', bcc: '', subject: '', text: '', html: '', attach_type: 'attach', sourceFile: '', destFile: '',
      attach_type1: 'attach', sourceFile1: '', destFile1: ''
  };
  const now = new Date();

  // Identify the appropriate liaison email address to copy for a request depending on the department specified on the form.
  const getSubjectLiaisonEmail = function(dept) {
      let emailAddr;
      switch (dept) {
          case 'African-American and African Studies':
              emailAddr = 'lb-aaas-books@virginia.edu';
              break;
          case 'Anthropology':
              emailAddr = 'lib-anthropology-books@virginia.edu';
              break;
          case 'Archaeology':
              emailAddr = 'lib-archaeology-books@virginia.edu';
              break;
          case 'Architecture':
          case 'Architectural History':
          case 'Landscape Architecture':
              emailAddr = 'lib-architecture-books@virginia.edu';
              break;
          case 'Art':
              emailAddr = 'fal-purchase-req@virginia.edu';
              break;
          case 'Astronomy':
              emailAddr = 'lib-astronomy-books@virginia.edu';
              break;
          case 'Batten School':
              emailAddr = 'battenbooks@virginia.edu';
              break;
          case 'Biology':
              emailAddr = 'lib-biology-books@virginia.edu';
              break;
          case 'Biomedical Engineering':
              emailAddr = 'biomed-engineer-book@virginia.edu';
              break;
          case 'Chemical Engineering':
              emailAddr = 'chemical-engineer-book@virginia.edu';
              break;
          case 'Chemistry':
              emailAddr = 'lib-chemistry-books@virginia.edu';
              break;
          case 'Engineering Systems and Environment':
              emailAddr = 'lib-civil-envi-books@virginia.edu';
              break;
          case 'Classics':
              emailAddr = 'lib-classics-books@virginia.edu';
              break;
          case 'Commerce':
          case 'Economics':
              emailAddr = 'businessbooks@virginia.edu';
              break;
          case 'Computer Science':
              emailAddr = 'lib-comp-sci-books@virginia.edu';
              break;
          case 'Data Science':
              emailAddr = 'jah2ax@virginia.edu';
              break;
          case 'Drama':
              emailAddr = 'lib-drama-books@virginia.edu';
              break;
          case 'East Asian':
              emailAddr = 'lib-east-asian-books@virginia.edu';
              break;
          case 'Education':
              emailAddr = 'Education@virginia.edu';
              break;
          case 'Electrical and Computer Engineering':
              emailAddr = 'lib-elec-comp-books@virginia.edu';
              break;
          case 'English':
              emailAddr = 'lb-english@virginia.edu';
              break;
          case 'Environmental Sciences':
              emailAddr = 'lib-env-sci-books@virginia.edu';
              break;
          case 'French':
              emailAddr = 'lib-french-books@virginia.edu';
              break;
          case 'German':
              emailAddr = 'germanbooks@virginia.edu';
              break;
          case 'History':
              emailAddr = 'historybooks@virginia.edu';
              break;
          case 'Library':
              emailAddr = 'lib-library-requests@virginia.edu';
              break;
          case 'Materials Science and Engineering':
              emailAddr = 'material-sci-eng-books@virginia.edu';
              break;
          case 'Mathematics':
              emailAddr = 'lib-mathematics-books@virginia.edu';
              break;
          case 'Mechanical and Aerospace Engineering':
              emailAddr = 'lib-mech-aero-books@virginia.edu';
              break;
          case 'Media Studies':
              emailAddr = 'lb-media-studies-books@virginia.edu';
              break;
          case 'Middle Eastern and South Asian':
              emailAddr = 'mideast-southasia-book@virginia.edu';
              break;
          case 'Music':
              emailAddr = 'lb-mu-books@virginia.edu';
              break;
          case 'Other...':
              emailAddr = 'lib-collections@virginia.edu';
              break;
          case 'Philosophy':
              emailAddr = 'philosophybooks@virginia.edu';
              break;
          case 'Physics':
              emailAddr = 'lib-physics-books@virginia.edu';
              break;
          case 'Politics':
              emailAddr = 'politicsbooks@virginia.edu';
              break;
          case 'Psychology':
              emailAddr = 'lib-psychology-books@virginia.edu';
              break;
          case 'Religious Studies':
              emailAddr = 'relstudiesbooks@virginia.edu';
              break;
          case 'Science, Technology and Society':
              emailAddr = 'sci-tech-society-books@virginia.edu';
              break;
          case 'Slavic':
              emailAddr = 'slavicbooks@virginia.edu';
              break;
          case 'Sociology':
              emailAddr = 'lb-Sociology@virginia.edu';
              break;
          case 'Spanish, Italian, and Portuguese':
              emailAddr = 'span-ital-port-books@virginia.edu';
              break;
          case 'Statistics':
              emailAddr = 'lib-statistics-books@virginia.edu';
              break;
          case 'Systems and Information Engineering':
              emailAddr = 'lib-sys-info-books@virginia.edu';
              break;
          case 'Women, Gender, & Sexuality':
              emailAddr = 'lb-wgsbooks@virginia.edu';
              break;
          default:
              emailAddr = 'purchase-requests@virginia.libanswers.com';
      }
      return emailAddr;
  };

  // Format parameter data for passing on a URL.
  const paramsString = function(obj) {
      return Object.keys(obj).map(key => key + '=' + encodeURIComponent(obj[key])).join('&');
  };

  // Post the email objects to our server for sending and post the form data to LibInsight.
  const postEmailAndData = function(reqId, requestEmailOptions, confirmEmailOptions, formData) {
      let queryString = paramsString(requestEmailOptions);
      nodeFetch(emailUrl, { method: 'POST', body: queryString, headers: headerObj })
      .then(res => res.text())
      .then(body => {
          if (body && (body.search('Status: 201 Created') !== -1)) {
              console.log(`Library purchase request notification sent for ${reqId}: `+body);
              queryString = paramsString(confirmEmailOptions);
              return nodeFetch(emailUrl, { method: 'POST', body: queryString, headers: headerObj });
          } else {
              console.log(`Library request notification failed for ${reqId}: `+body);
              throw new Error(`Library request notification failed for ${reqId}: `+body);
          }
      })
      .then(res => res.text())
      .then(body => {
          if(body && (body.search('Status: 201 Created') !== -1)) {
              console.log(`Patron confirmation notification sent for ${reqId}: `+body);
              queryString = paramsString(formData);
              return nodeFetch(apiUrl, { method: 'POST', body: queryString, headers: headerObj });
          } else {
              console.log(`Patron confirmation notification failed for ${reqId}: `+body);
              throw new Error(`Patron confirmation notification failed for ${reqId}: `+body);
          }
      })
      .then(res => res.text())
      .then(body => {
          if (body) {
              const result = JSON.parse(body);
              if (result.response) {
                  console.log(`LibInsight data saved for ${reqId}: `+body);
              }
          } else {
              console.log(`Bad response from ${apiUrl}: `+body);
              throw new Error(`Bad response from ${apiUrl}: `+body);
          }
      })
      .catch(error => function(error) {
          console.log(`Error for request ${reqId}: `);
          console.log(error);
          return error;
      });
  };
  
  // Make sure the form submission POST data is a JSON object.
  const pData = event;

  // Verify that their field defined for the form before attempting to do anything
  if (pData.fields.length && (pData.fields.length > 0)) {
    // **STAFF PURCHASE REQUEST FORM BEGIN
    let msg = '';
    let subjPrefix = '';
    let otherPerson = '';
    let biblioInfo = '';
    let requestorInfo = '';
    let reqId = Object.hasOwn(pData,'timeStamp') ? pData.timeStamp : '';
    let data = { 'field_1525': reqId, 'ts_start': now };

    // Prepare email message body and LibInsight data parameters
    let purposeOfRequest = pData.fields.find(t=>t.field_id === 4530687) ? pData.fields.find(t=>t.field_id === 4530687).val : '';
    if (purposeOfRequest !== '') {
        msg += "<strong>What is the purpose of this request?:</strong> " + purposeOfRequest + "<br>\n";
        data['field_1482'] = purposeOfRequest;
    }
    let format = pData.fields.find(t=>t.field_id === 4530264) ? pData.fields.find(t=>t.field_id === 4530264).val : '';
    if (format !== '') {
        msg += "<strong>Format:</strong> " + format + "<br>\n";
        data['field_1491'] = format;
    }
    let electronicVersionPreferred;
    switch (format) {
        case 'Book':
            electronicVersionPreferred = pData.fields.find(t=>t.field_id === 4530675) ? pData.fields.find(t=>t.field_id === 4530675).val : '';
            electronicVersionPreferred = (electronicVersionPreferred === 'Yes') ? electronicVersionPreferred : 'No' ;
            break;
        case 'Dissertation or Thesis':
            electronicVersionPreferred = pData.fields.find(t=>t.field_id === 4530658) ? pData.fields.find(t=>t.field_id === 4530658).val : '';
            electronicVersionPreferred = (electronicVersionPreferred === 'Yes') ? electronicVersionPreferred : 'No' ;
            break;
        case 'Other':
            electronicVersionPreferred = pData.fields.find(t=>t.field_id === 4530297) ? pData.fields.find(t=>t.field_id === 4530297).val : '';
            electronicVersionPreferred = (electronicVersionPreferred === 'Yes') ? electronicVersionPreferred : 'No' ;
            break;
        default:
            electronicVersionPreferred = '';
    }
    if (electronicVersionPreferred !== '') {
        msg += "<strong>Electronic version preferred (when available):</strong> " + electronicVersionPreferred + "<br>\n";
        data['field_1522'] = electronicVersionPreferred;
    }

    let isRushRequest = pData.fields.find(t=>t.field_id === 4530688) ? pData.fields.find(t=>t.field_id === 4530688).val : '';
    if (isRushRequest !== '') {
        msg += "<strong>Is this a rush request?</strong> " + isRushRequest + "<br>\n";
        data['field_1481'] = isRushRequest;
        subjPrefix = (isRushRequest === "Yes") ? "Rush: " : "";
    }
    msg += "<br>\n";

    // Create requestor info output content and set appropriate LibInsight fields.
    requestorInfo += "\n<h3>Requested by</h3>\n\n<p>";
    let yourName = pData.fields.find(t=>t.field_id === 4530245) ? pData.fields.find(t=>t.field_id === 4530245).val : '';
    if (yourName !== '') {
        requestorInfo += "<strong>Your name:</strong> " + yourName + "<br>\n";
        data['field_1489'] = yourName;
    }
    let yourEmailAddress = pData.fields.find(t=>t.field_id === 4530241) ? pData.fields.find(t=>t.field_id === 4530241).val : '';
    if (yourEmailAddress !== '') {
        requestorInfo += "<strong>Your email address:</strong> " + yourEmailAddress + "<br>\n";
        data['field_1490'] = yourEmailAddress;
    }
    let id = yourEmailAddress.split('@');
    let computingId = (id.length > 0) ? id[0] : '';
    if (computingId !== '') {
        requestorInfo += "<strong>UVA Computing ID:</strong> " + computingId + "<br>\n";
        data['field_1488'] = computingId;
    }
    let onBehalfOfSomeone = pData.fields.find(t=>t.field_id === 4530686) ? pData.fields.find(t=>t.field_id === 4530686).val : '';
    if (onBehalfOfSomeone !== '') {
        otherPerson += "<strong>Are you making this request on behalf of someone else?</strong> " + onBehalfOfSomeone + "<br>\n";
        data['field_1483'] = onBehalfOfSomeone;
        if (onBehalfOfSomeone === "Yes") {
            let otherComputingId = pData.fields.find(t=>t.field_id === 4530690) ? pData.fields.find(t=>t.field_id === 4530690).val : '';
            if (otherComputingId !== '') {
                otherPerson += "<strong>Other person's computing ID:</strong> " + otherComputingId + "<br>\n";
                data['field_1484'] = otherComputingId;
            }
            let otherDepartment = pData.fields.find(t=>t.field_id === 4530691) ? pData.fields.find(t=>t.field_id === 4530691).val : '';
            if (otherDepartment !== '') {
                otherPerson += "<strong>Other person's department or school:</strong> " + otherDepartment + "<br>\n";
                data['field_1485'] = otherDepartment;
                // Using the Other option for a LibWizard selection list does not create an addition field for capturing the other option;
                // instead the value is captured in the select list value returned. So nothing to store in the this LibInsight field anymore.
                // data['field_1486'] = 'other department or school value returned in deparatment field';
            }
            let explainWhySubmitting = pData.fields.find(t=>t.field_id === 4530692) ? pData.fields.find(t=>t.field_id === 4530692).val : '';
            if (explainWhySubmitting !== '') {
                otherPerson += "<strong>Please explain why you are submitting on someone else's behalf:</strong><br>\n" + explainWhySubmitting + "<br>\n";
                data['field_1487'] = explainWhySubmitting;
            }
        }
    }
    requestorInfo += "</p><br>\n";

    // Create format's bibliographic info output and set appropriate LibInsight fields.
    biblioInfo += "\n<h3>Bibliographic Information</h3>\n\n<p>";
    let isbn;
    switch (format) {
        case 'Book':
            isbn = pData.fields.find(t=>t.field_id === 4530678) ? pData.fields.find(t=>t.field_id === 4530678).val : '';
            break;
        default:
            isbn = '';
    }
    if (isbn !== '') {
        biblioInfo += "<strong>ISBN:</strong> " + isbn + "<br>\n";
        data['field_1507'] = isbn;
    }
    let title;
    switch (format) {
        case 'Book':
            title = pData.fields.find(t=>t.field_id === 4530682) ? pData.fields.find(t=>t.field_id === 4530682).val : '';
            break;
        case 'Dissertation or Thesis':
            title = pData.fields.find(t=>t.field_id === 4530662) ? pData.fields.find(t=>t.field_id === 4530662).val : '';
            break;
        case 'Music Recording':
            title = pData.fields.find(t=>t.field_id === 4530384) ? pData.fields.find(t=>t.field_id === 4530384).val : '';
            break;
        case 'Music Score':
            title = pData.fields.find(t=>t.field_id === 4530375) ? pData.fields.find(t=>t.field_id === 4530375).val : '';
            break;
        case 'Video':
            title = pData.fields.find(t=>t.field_id === 4530325) ? pData.fields.find(t=>t.field_id === 4530325).val : '';
            break;
        default:
            title = '';
    }
    if (title !== '') {
        biblioInfo += "<strong>Title:</strong> " + title + "<br>\n";
        data['field_1492'] = title;
    }
    let nameTitle;
    switch (format) {
        case 'Database/Dataset':
            nameTitle = pData.fields.find(t=>t.field_id === 4530673) ? pData.fields.find(t=>t.field_id === 4530673).val : '';
            break;
        case 'Journal Subscription':
            nameTitle = pData.fields.find(t=>t.field_id === 4530400) ? pData.fields.find(t=>t.field_id === 4530400).val : '';
            break;
        case 'Trials':
            nameTitle = pData.fields.find(t=>t.field_id === 4530361) ? pData.fields.find(t=>t.field_id === 4530361).val : '';
            break;
        case 'Other':
            nameTitle = pData.fields.find(t=>t.field_id === 4530281) ? pData.fields.find(t=>t.field_id === 4530281).val : '';
            break;
        default:
            nameTitle = '';
    }
    if (nameTitle !== '') {
        biblioInfo += "<strong>Name/Title:</strong> " + nameTitle + "<br>\n";
        data['field_1493'] = nameTitle;
    }
    let authorEditor;
    switch (format) {
        case 'Book':
            authorEditor = pData.fields.find(t=>t.field_id === 4530681) ? pData.fields.find(t=>t.field_id === 4530681).val : '';
            break;
        default:
            authorEditor = '';
    }
    if (authorEditor !== '') {
        biblioInfo += "<strong>Author/Editor:</strong> " + authorEditor + "<br>\n";
        data['field_1494'] = authorEditor;
    }
    let author;
    switch (format) {
        case 'Dissertation or Thesis':
            author = pData.fields.find(t=>t.field_id === 4530661) ? pData.fields.find(t=>t.field_id === 4530661).val : '';
            break;
        default:
            author = '';
    }
    if (author !== '') {
        biblioInfo += "<strong>Author:</strong> " + author + "<br>\n";
        data['field_1495'] = author;
    }
    let director;
    switch (format) {
        case 'Video':
            director = pData.fields.find(t=>t.field_id === 4530322) ? pData.fields.find(t=>t.field_id === 4530322).val : '';
            break;
        default:
            director = '';
    }
    if (director) {
        biblioInfo += "<strong>Director:</strong> " + director + "<br>\n";
        data['field_1496'] = director;
    }
    let composers, performers;
    switch (format) {
        case 'Music Recording':
            composers = pData.fields.find(t=>t.field_id === 4530383) ? pData.fields.find(t=>t.field_id === 4530383).val : '';
            performers = pData.fields.find(t=>t.field_id === 4530382) ? pData.fields.find(t=>t.field_id === 4530382).val : '';
            break;
        default:
            composers = '';
            performers = '';
    }
    if (composers !== '') {
        biblioInfo += "<strong>Composer(s):</strong> " + composers + "<br>\n";
        data['field_1497'] = composers;
    }
    if (performers !== '') {
        biblioInfo += "<strong>Performer(s):</strong> " + performers + "<br>\n";
        data['field_1498'] = performers;
    }
    let composerEditor;
    switch (format) {
        case 'Music Score':
            composerEditor = pData.fields.find(t=>t.field_id === 4530374) ? pData.fields.find(t=>t.field_id === 4530374).val : '';
            break;
        default:
            composerEditor = '';
    }
    if (composerEditor !== '') {
        biblioInfo += "<strong>Composer/Editor:</strong> " + composerEditor + "<br>\n";
        data['field_1499'] = composerEditor;
    }
    let publisher;
    switch (format) {
        case 'Book':
            publisher = pData.fields.find(t=>t.field_id === 4530680) ? pData.fields.find(t=>t.field_id === 4530680).val : '';
            break;
        case 'Music Score':
            publisher = pData.fields.find(t=>t.field_id === 4530373) ? pData.fields.find(t=>t.field_id === 4530373).val : '';
            break;
        default:
            publisher = '';
    }
    if (publisher !== '') {
        biblioInfo += "<strong>Publisher:</strong> " + publisher + "<br>\n";
        data['field_1500'] = publisher;
    }
    let creatorPublisherVendor;
    switch (format) {
        case 'Database/Dataset':
            creatorPublisherVendor = pData.fields.find(t=>t.field_id === 4530672) ? pData.fields.find(t=>t.field_id === 4530672).val : '';
            break;
        case 'Trials':
            creatorPublisherVendor = pData.fields.find(t=>t.field_id === 4530360) ? pData.fields.find(t=>t.field_id === 4530360).val : '';
            break;
        default:
            creatorPublisherVendor = '';
    }
    if (creatorPublisherVendor !== '') {
        biblioInfo += "<strong>Creator/Publisher/Vendor:</strong> " + creatorPublisherVendor + "<br>\n";
        data['field_1501'] = creatorPublisherVendor;
    }
    let publisherVendor;
    switch (format) {
        case 'Journal Subscription':
            publisherVendor = pData.fields.find(t=>t.field_id === 4530399) ? pData.fields.find(t=>t.field_id === 4530399).val : '';
            break;
        default:
            publisherVendor = '';
    }
    if (publisherVendor !== '') {
        biblioInfo += "<strong>Publisher/Vendor:</strong> " + publisherVendor + "<br>\n";
        data['field_1502'] = publisherVendor;
    }
    let producerPublisherCreator;
    switch (format) {
        case 'Other':
            producerPublisherCreator = pData.fields.find(t=>t.field_id === 4530284) ? pData.fields.find(t=>t.field_id === 4530284).val : '';
            break;
        default:
            producerPublisherCreator = '';
    }
    if (producerPublisherCreator !== '') {
        biblioInfo += "<strong>Producer/Publisher/Creator:</strong> " + producerPublisherCreator + "<br>\n";
        data['field_1503'] = producerPublisherCreator;
    }
    let institutionGrantingDegree;
    switch (format) {
        case 'Dissertation or Thesis':
            institutionGrantingDegree = pData.fields.find(t=>t.field_id === 4530660) ? pData.fields.find(t=>t.field_id === 4530660).val : '';
            break;
        default:
            institutionGrantingDegree = '';
    }
    if (institutionGrantingDegree !== '') {
        biblioInfo += "<strong>Institution (granting degree):</strong> " + institutionGrantingDegree + "<br>\n";
        data['field_1504'] = institutionGrantingDegree;
    }
    let recordLabel;
    switch (format) {
        case 'Music Recording':
            recordLabel = pData.fields.find(t=>t.field_id === 4530381) ? pData.fields.find(t=>t.field_id === 4530381).val : '';
            break;
        default:
            recordLabel = '';
    }
    if (recordLabel !== '') {
        biblioInfo += "<strong>Record label:</strong> " + recordLabel + "<br>\n";
        data['field_1505'] = recordLabel;
    }
    let dateOfPublication;
    switch (format) {
        case 'Book':
            dateOfPublication = pData.fields.find(t=>t.field_id === 4530679) ? pData.fields.find(t=>t.field_id === 4530679).val : '';
            break;
        case 'Dissertation or Thesis':
            dateOfPublication = pData.fields.find(t=>t.field_id === 4530659) ? pData.fields.find(t=>t.field_id === 4530659).val : '';
            break;
        default:
            dateOfPublication = '';
    }
    if (dateOfPublication !== '') {
        biblioInfo += "<strong>Date of publication:</strong> " + dateOfPublication + "<br>\n";
        data['field_1506'] = dateOfPublication;
    }
    let releaseDate;
    switch (format) {
        case 'Music Recording':
            releaseDate = pData.fields.find(t=>t.field_id === 4530380) ? pData.fields.find(t=>t.field_id === 4530380).val : '';
            break;
        default:
            releaseDate = '';
    }
    if (releaseDate !== '') {
        biblioInfo += "<strong>Release date:</strong> " + releaseDate + "<br>\n";
        data['field_1508'] = releaseDate;
    }
    let yearOfPublication;
    switch (format) {
        case 'Music Score':
            yearOfPublication = pData.fields.find(t=>t.field_id === 4530370) ? pData.fields.find(t=>t.field_id === 4530370).val : '';
            break;
        default:
            yearOfPublication = '';
    }
    if (yearOfPublication) {
        biblioInfo += "<strong>Year of publication:</strong> " + yearOfPublication + "<br>\n";
        data['field_1509'] = yearOfPublication;
    }
    let productionDate;
    switch (format) {
        case 'Video':
            productionDate = pData.fields.find(t=>t.field_id === 4530320) ? pData.fields.find(t=>t.field_id === 4530320).val : '';
            break;
        default:
            productionDate = '';
    }
    if (productionDate !== '') {
        biblioInfo += "<strong>Production date:</strong> " + productionDate + "<br>\n";
        data['field_1510'] = productionDate;
    }
    let edition;
    switch (format) {
        case 'Book':
            edition = pData.fields.find(t=>t.field_id === 4530677) ? pData.fields.find(t=>t.field_id === 4530677).val : '';
            break;
        default:
            edition = '';
    }
    if (edition !== '') {
        biblioInfo += "<strong>Edition:</strong> " + edition + "<br>\n";
        data['field_1511'] = edition;
    }
    let editionVersion;
    switch (format) {
        case 'Music Score':
            editionVersion = pData.fields.find(t=>t.field_id === 4530368) ? pData.fields.find(t=>t.field_id === 4530368).val : '';
            break;
        case 'Video':
            editionVersion = pData.fields.find(t=>t.field_id === 4530318) ? pData.fields.find(t=>t.field_id === 4530318).val : '';
            break;
        default:
            editionVersion = '';
    }
    if (editionVersion !== '') {
        biblioInfo += "<strong>Edition/Version:</strong> " + editionVersion + "<br>\n";
        data['field_1512'] = editionVersion;
    }
    let versionInfo;
    switch (format) {
        case 'Music Recording':
            versionInfo = pData.fields.find(t=>t.field_id === 4530379) ? pData.fields.find(t=>t.field_id === 4530379).val : '';
            break;
        default:
            versionInfo = '';
    }
    if (versionInfo !== '') {
        biblioInfo += "<strong>Version info:</strong> " + versionInfo + "<br>\n";
        data['field_1513'] = versionInfo;
    }
    let whatDoesDatasetCover;
    switch (format) {
        case 'Database/Dataset':
            whatDoesDatasetCover = pData.fields.find(t=>t.field_id === 4530671) ? pData.fields.find(t=>t.field_id === 4530671).val : '';
            break;
        case 'Trials':
            whatDoesDatasetCover = pData.fields.find(t=>t.field_id === 4530359) ? pData.fields.find(t=>t.field_id === 4530359).val : '';
            break;
        default:
            whatDoesDatasetCover = '';
    }
    if (whatDoesDatasetCover !== '') {
        biblioInfo += "<strong>What does this cover that existing resources do not?:</strong> " + whatDoesDatasetCover + "<br>\n";
        data['field_1514'] = whatDoesDatasetCover;
    }
    let whatDoesSubscriptionCover;
    switch (format) {
        case 'Journal Subscription':
            whatDoesSubscriptionCover = pData.fields.find(t=>t.field_id === 4530398) ? pData.fields.find(t=>t.field_id === 4530398).val : '';
            break;
        default:
            whatDoesSubscriptionCover = '';
    }
    if (whatDoesSubscriptionCover !== '') {
        biblioInfo += "<strong>What does this cover that existing subscriptions do not?:</strong> " + whatDoesSubscriptionCover + "<br>\n";
        data['field_1515'] = whatDoesSubscriptionCover;
    }
    let whatClassesMightUseThis;
    switch (format) {
        case 'Database/Dataset':
            whatClassesMightUseThis = pData.fields.find(t=>t.field_id === 4530670) ? pData.fields.find(t=>t.field_id === 4530670).val : '';
            break;
        case 'Journal Subscription':
            whatClassesMightUseThis = pData.fields.find(t=>t.field_id === 4530397) ? pData.fields.find(t=>t.field_id === 4530397).val : '';
            break;
        case 'Trials':
            whatClassesMightUseThis = pData.fields.find(t=>t.field_id === 4530356) ? pData.fields.find(t=>t.field_id === 4530356).val : '';
            break;
        default:
            whatClassesMightUseThis = '';
    }
    if (whatClassesMightUseThis !== '') {
        biblioInfo += "<strong>What classes, labs, faculty, and/or students might use this resource?:</strong> " + whatClassesMightUseThis + "<br>\n";
        data['field_1516'] = whatClassesMightUseThis;
    }
    let supportLibraryCommitment;
    switch (format) {
        case 'Trials':
            supportLibraryCommitment = pData.fields.find(t=>t.field_id === 4530353) ? pData.fields.find(t=>t.field_id === 4530353).val : '';
            break;
        default:
            supportLibraryCommitment = '';
    }
    if (supportLibraryCommitment !== '') {
        biblioInfo += "<strong>How does this resource support the library's commitment to equity and inclusion in its collections?:</strong> " + supportLibraryCommitment + "<br>\n";
        data['field_1702'] = supportLibraryCommitment;
    }
    let pleaseDescribeContent;
    switch (format) {
        case 'Journal Subscription':
            pleaseDescribeContent = pData.fields.find(t=>t.field_id === 4530396) ? pData.fields.find(t=>t.field_id === 4530396).val : '';
            break;
        default:
            pleaseDescribeContent = '';
    }
    if (pleaseDescribeContent !== '') {
        biblioInfo += "<strong>How does this resource support the library's commitment to equity and inclusion in its collections?:</strong> " + pleaseDescribeContent + "<br>\n";
        data['field_1517'] = pleaseDescribeContent;
    }
    let proposeJournalCancel;
    switch (format) {
        case 'Journal Subscription':
            proposeJournalCancel = pData.fields.find(t=>t.field_id === 4530394) ? pData.fields.find(t=>t.field_id === 4530394).val : '';
            break;
        default:
            proposeJournalCancel = '';
    }
    if (proposeJournalCancel !== '') {
        biblioInfo += "<strong>Please propose a journal to cancel:</strong> " + proposeJournalCancel + "<br>\n";
        data['field_1518'] = proposeJournalCancel;
    }
    let howImportantIsResource;
    switch (format) {
        case 'Journal Subscription':
            howImportantIsResource = pData.fields.find(t=>t.field_id === 4530394) ? pData.fields.find(t=>t.field_id === 4530394).val : '';
            break;
        default:
            howImportantIsResource = '';
    }
    if (howImportantIsResource !== '') {
        biblioInfo += "<strong>How important is this resource on a scale of 1 to 5, with 1 being most important?:</strong> " + howImportantIsResource + "<br>\n";
        data['field_1519'] = howImportantIsResource;
    }
    let locationToPurchase;
    switch (format) {
        case 'Book':
            locationToPurchase = pData.fields.find(t=>t.field_id === 4530676) ? pData.fields.find(t=>t.field_id === 4530676).val : '';
            break;
        case 'Database/Datset':
            locationToPurchase = pData.fields.find(t=>t.field_id === 4530669) ? pData.fields.find(t=>t.field_id === 4530669).val : '';
            break;
        case 'Journal Subscription':
            locationToPurchase = pData.fields.find(t=>t.field_id === 4530390) ? pData.fields.find(t=>t.field_id === 4530390).val : '';
            break;
        case 'Music Recording':
            locationToPurchase = pData.fields.find(t=>t.field_id === 4530378) ? pData.fields.find(t=>t.field_id === 4530378).val : '';
            break;
        case 'Music Score':
            locationToPurchase = pData.fields.find(t=>t.field_id === 4530367) ? pData.fields.find(t=>t.field_id === 4530367).val : '';
            break;
        case 'Trials':
            locationToPurchase = pData.fields.find(t=>t.field_id === 4530352) ? pData.fields.find(t=>t.field_id === 4530352).val : '';
            break;
        case 'Video':
            locationToPurchase = pData.fields.find(t=>t.field_id === 4530316) ? pData.fields.find(t=>t.field_id === 4530316).val : '';
            break;
        case 'Other':
            locationToPurchase = pData.fields.find(t=>t.field_id === 4530286) ? pData.fields.find(t=>t.field_id === 4530286).val : '';
            break;
        default:
            locationToPurchase = '';
    }
    if (locationToPurchase !== '') {
        biblioInfo += "<strong>Location to purchase/URL:</strong> " + locationToPurchase + "<br>\n";
        data['field_1520'] = locationToPurchase;
    }
    let price;
    switch (format) {
        case 'Database/Dataset':
            price = pData.fields.find(t=>t.field_id === 4530668) ? pData.fields.find(t=>t.field_id === 4530668).val : '';
            break;
        case 'Journal Subscription':
            price = pData.fields.find(t=>t.field_id === 4530388) ? pData.fields.find(t=>t.field_id === 4530388).val : '';
            break;
        case 'Trials':
            price = pData.fields.find(t=>t.field_id === 4530351) ? pData.fields.find(t=>t.field_id === 4530351).val : '';
            break;
        case 'Video':
            price = pData.fields.find(t=>t.field_id === 4530314) ? pData.fields.find(t=>t.field_id === 4530314).val : '';
            break;
        case 'Other':
            price = pData.fields.find(t=>t.field_id === 4530294) ? pData.fields.find(t=>t.field_id === 4530294).val : '';
            break;
        default:
            price = '';
    }
    if (price !== '') {
        biblioInfo += "<strong>Price:</strong> " + price + "<br>\n";
        data['field_1521'] = price;
    }
    let additionalComments;
    switch (format) {
        case 'Book':
            additionalComments = pData.fields.find(t=>t.field_id === 4530674) ? pData.fields.find(t=>t.field_id === 4530674).val : '';
            break;
        case 'Database/Dataset':
            additionalComments = pData.fields.find(t=>t.field_id === 4530666) ? pData.fields.find(t=>t.field_id === 4530666).val : '';
            break;
        case 'Dissertation or Thesis':
            additionalComments = pData.fields.find(t=>t.field_id === 4530401) ? pData.fields.find(t=>t.field_id === 4530401).val : '';
            break;
        case 'Journal Subscription':
            additionalComments = pData.fields.find(t=>t.field_id === 4530387) ? pData.fields.find(t=>t.field_id === 4530387).val : '';
            break;
        case 'Music Recording':
            additionalComments = pData.fields.find(t=>t.field_id === 4530376) ? pData.fields.find(t=>t.field_id === 4530376).val : '';
            break;
        case 'Music Score':
            additionalComments = pData.fields.find(t=>t.field_id === 4530366) ? pData.fields.find(t=>t.field_id === 4530366).val : '';
            break;
        case 'Trials':
            additionalComments = pData.fields.find(t=>t.field_id === 4530350) ? pData.fields.find(t=>t.field_id === 4530350).val : '';
            break;
        case 'Video':
            additionalComments = pData.fields.find(t=>t.field_id === 4530313) ? pData.fields.find(t=>t.field_id === 4530313).val : '';
            break;
        default:
            additionalComments = '';
    }
    if (additionalComments !== '') {
        biblioInfo += "<strong>Additional comments:</strong> " + additionalComments + "<br>\n";
        data['field_1523'] = additionalComments;
    }
    let descriptionComments;
    switch (format) {
        case 'Other':
            descriptionComments = pData.fields.find(t=>t.field_id === 4530298) ? pData.fields.find(t=>t.field_id === 4530298).val : '';
            break;
        default:
            descriptionComments = '';
    }
    if (descriptionComments !== '') {
        biblioInfo += "<strong>Description/Comments:</strong> " + descriptionComments + "<br>\n";
        data['field_1524'] = descriptionComments;
    }
    biblioInfo += "</p><br>\n";

    // Prepare email content for Library staff
    libraryOptions.subject = subjPrefix + 'Staff Purchase Request';
    libraryOptions.from = '"' + frmData.sect_requestor_information.fields.fld_name.value + '" <' + frmData.sect_requestor_information.fields.fld_email_address.value + '>';
    libraryOptions.replyTo = frmData.sect_requestor_information.fields.fld_email_address.value;
    // Routing varies based on format
    if (frmData.sect_bibliographic_information.fields.fld_format.value === 'Video') {
        libraryOptions.to = 'Libselect_video@virginia.edu';
    } else if (frmData.sect_bibliographic_information.fields.fld_format.value === 'Music Recording') {
        libraryOptions.to = 'lb-mu-recordings@virginia.edu';
        if (frmData.fld_is_this_a_rush_request_.value === 'Yes') { // include Acquisitions for rush request
            libraryOptions.to += ',lib-orders@virginia.edu';
        }
    } else if ((frmData.sect_bibliographic_information.fields.fld_format.value === 'Book') ||
            (frmData.sect_bibliographic_information.fields.fld_format.value === 'Dissertation or Thesis')) {
        libraryOptions.to = 'lib-collections@virginia.edu,lib-orders@virginia.edu';
    } else {
        // All other formats (Database/Dataset, Journal Subscription, Music Score, Other) go to LibAnswers
        libraryOptions.to = 'purchase-requests@virginia.libanswers.com';
        // Music scores also go to those specialists
        if (frmData.sect_bibliographic_information.fields.fld_format.value === 'Music Score') {
            libraryOptions.to += ',lb-mu-scores@virginia.edu';
        }
    }
    
    let reqText = "<br>\n<br>\n<br>\n<strong>req #: </strong>" + reqId;
    libraryOptions.html = msg + biblioInfo + requestorInfo + otherPerson + reqText;
    libraryOptions.text = stripHtml(msg + biblioInfo + requestorInfo + otherPerson + reqText);

    // Prepare email confirmation content for staff
    patronOptions.subject = subjPrefix + 'Staff Purchase Request';
    patronOptions.to = frmData.sect_requestor_information.fields.fld_email_address.value;
    patronOptions.html = msg + biblioInfo + requestorInfo + otherPerson + reqText;
    patronOptions.text = stripHtml(msg + biblioInfo + requestorInfo + otherPerson + reqText);

    try {
        return postEmailAndData(reqId, libraryOptions, patronOptions, apiUrl, data);
    }
    catch (error) {
        console.log(`error: ${JSON.stringify(error)}`);
        return error;
    }
    // **STAFF PURCHASE REQUEST FORM BEGIN
 
  } else {
      console.log(`Warning: ${formName} form submission without any fields in it.`);
  }
};
