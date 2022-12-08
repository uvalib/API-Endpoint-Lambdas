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
  const pData = event.body;

  // Verify that their field defined for the form before attempting to do anything
  if (pData.fields.length && (pData.fields.length > 0)) {
      // @TODO Modify this section of the Lambda function to reflect that of the appropriate LibWizard form JSON object structure
  
  
      try {
          return postEmailAndData(reqId, libraryOptions, patronOptions, data);
      }
      catch (error) {
          console.log(`error: ${JSON.stringify(error)}`);
          return error;
      }
  
  } else {
      console.log(`Warning: ${formName} form submission without any fields in it.`);
  }
};
