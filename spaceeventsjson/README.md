# Space Events JSON
This function is used by the Library API /spaceeventsjson endpoint. It takes no parameters. 
All space events are returned in a JSON format for use with our Visix Panels. JSON structure:

```
{
  "event": [
    {
      "name": "TEST 1234: Test Course / Library: Archives and Special Collections",
      "startTime": "2020-09-01 14:30",
      "endTime": "2020-09-01 17:30",
      "roomName": "Harrison/Small 318/318A",
      "status": "confirmed"
    },
    {
      "name": "TEST 5678: Writing 101",
      "startTime": "2020-09-02 12:00",
      "endTime": "2020-09-02 14:50",
      "roomName": "Clemons 407",
      "status": "confirmed"
    },
    {
      "name": "Student reservation",
      "startTime": "2020-09-05 13:00",
      "endTime": "2020-09-05 15:30",
      "roomName": "Clemons 202",
      "status": "confirmed"
    },
    ...
    ]
}
```

# Instructions for adding rooms to the JSON data
This script pulls data from EMS, Outlook, and LibCal and combines them into a single data file.

## Adding EMS Managed Room
1. Get the ID for the room from the appropriate EMS database table. It may be necessary to request this from someone else in LIT. 
1. Search for the ```roomIdArray``` variable in the index.js file and add the room's ID value to the array. 

## Adding Outlook Managed Room
1. Request that ITS provide read access to the application id (see exchange_api_client_id environment variable) associated with this script.
1. Get the email address associated with the Outlook room resource.
1. Search for the ```roomData``` variable in the index.js file and add the room's email address to the ```"schedules"``` array in the roomData object.

## Adding LibCal Managed Room
1. In LibCal's admin interface, identify the category ID the room is a member of.
1. Search for the ```spaceCategoryIDs``` variable in the index.js file and add the category ID to the array (if it is not already listed in it).

## Adjustment Needed For Room Resource Managed in Outlook and LibCal
Most likely the Outlook room name is not the same as the name in LibCal. To have them be the same in the Visix data change the Outlook data to use the LibCal name using the following steps:
1. Search for ```switch (schedules[i].scheduleId)``` code section in the index.js file.
1. Add a ```case``` section for the Outlook room's email address.
1. Set the ```roomName``` variable in this new section to have the value for the name of its corresponding LibCal room.


# Copying local Lambda function code up to the ASW Lambda web interface
Make sure that your system is configured to use the AWS CLI:
https://docs.aws.amazon.com/lambda/latest/dg/setup-awscli.html

For node modules to be available in the Lambda console you need to perform the following steps:
1. Make sure that you've performed `npm install` to get the required node modules installed.
2. Zip up the *contents* of this directory, `zip -r spaceeventsjson.zip .`
3. Use AWS CLI to upload the code to Lamdba web interface
`aws lambda update-function-code --function-name spaceEventsJson --zip-file fileb://./spaceeventsjson.zip`

Note: If this fails because of fileb setting, you may need to specify the full path to the zip file.

Note: If the upload fails due to the function not being found in Lamdba because of your default AWS configuration 
region then you may need to edit that or add a parameter to the aws CLI command.
