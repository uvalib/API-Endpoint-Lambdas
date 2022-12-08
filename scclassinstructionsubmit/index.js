exports.handler = (event, context, callback) => {

  const formName = 'SC Class Visit and Instruction';
  const nodeFetch = require('node-fetch');
  const stripHtml = require('string-strip-html');
  const headerObj = {'Content-Type': 'application/x-www-form-urlencoded'};

  // Environment variables configured for use with sending emails and saving data to LibInsight for forms.
  const emailSecret = process.env.email_secret;
  const apiUrl = process.env.sc_class_instruction_api_url; 
  
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

  // Format parameter data for passing on a URL.
  const paramsString = function(obj) {
      return Object.keys(obj).map(key => key + '=' + encodeURIComponent(obj[key])).join('&');
  };

  // @TODO Modify the function below to only write data to LibInsight.  
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
