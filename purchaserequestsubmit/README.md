# purchaserequestsubmit
This function is used by the Library API /purchaserequestsubmit endpoint. It expects a LibWizard 
Purchase Recommendation form submission JSON object. The JSON object is used to create an appropriate 
LibInsight object for the Purchase Recommendations dataset. In addition the script will create an 
email object to hand off to the api.library.virginia.edu server so that the request appears to come
from the person making the request in addition to sending email to lib-collections as well as liaisons.

Below documents the local setup for pushing out node modules to the AWS Lambda function.

# Copying local Lambda function code up to the ASW Lambda web interface
Make sure that your system is configured to use the AWS CLI:
https://docs.aws.amazon.com/lambda/latest/dg/setup-awscli.html

For node modules to be available in the Lambda console you need to perform the following steps:
1. Make sure that you've performed `npm install` to get the required node modules installed.
2. Zip up the *contents* of this directory, `zip -r purchaserequestsubmit.zip .`
3. Use AWS CLI to upload the code to Lamdba web interface
`aws lambda update-function-code --function-name purchaserequestsubmit --zip-file fileb://./purhaserequestsubmit.zip`

Note: If this fails because of fileb setting, you may need to specify the full path to the zip file.

Note: If the upload fails due to the function not being found in Lamdba because of your default AWS configuration region then you may need to edit that or add a parameter to the aws CLI command.
