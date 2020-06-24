# fillHoldBarcodeReader
This function is used by the fillHoldBarcodeReader endpoint. It expects a barcode and returns hold and user info.

Below documents the local setup for pushing out node modules to the AWS Lambda function.

# Copying local Lambda function code up to the ASW Lambda web interface
Make sure that your system is configured to use the AWS CLI:
https://docs.aws.amazon.com/lambda/latest/dg/setup-awscli.html

For node modules to be available in the Lambda console you need to perform the following steps:
1. Make sure that you've performed `npm install` to get the required node modules installed.
2. Zip up the *contents* of this directory, `zip -r fillHoldBarcodeReader.zip .`
3. Use AWS CLI to upload the code to Lamdba web interface
`aws lambda update-function-code --function-name fillHoldBarcodeReader --zip-file fileb://./fillHoldBarcodeReader.zip`

Note: If this fails because of fileb setting, you may need to specify the full path to the zip file.

Note: If the upload fails due to the function not being found in Lamdba because of your default AWS configuration region then you may need to edit that or add a parameter to the aws CLI command.
