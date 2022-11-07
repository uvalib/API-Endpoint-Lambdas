exports.handler = (event, context, callback) => {
    // this represents an example of a JSON object response when a LibWizard form uses the POST URL feature
    const exampleLibWizardResponse = {
        "iid": "9999",
        "formId": "12345",
        "ownerId": "67890",
        "accessRights": "",
        "name": "Post Results Example",
        "description": "",
        "owner_name": "",
        "instance_id": 3578008,
        "fields": [
            {
                "field_id": 2934881,
                "label": "Text field",
                "val": "Hello world"
            },
            {
                "field_id": 2934884,
                "label": "Numeric field",
                "val": 1234
            },
            {
                "field_id": 2934883,
                "label": "Date field",
                "val": "May 08, 2019 12: 00 AM"
            },
            {
                "field_id": 2934885,
                "label": "Radio buttons",
                "val": "Radio 1"
            },
            {
                "field_id": 2934887,
                "label": "Checkboxes",
                "val": "Check 1|Check 2"
            },
            {
                "field_id": 2934886,
                "label": "Grid",
                "val": "|Row 1|Col 1||Row 2|Col 2||Row 3|Col 3|"
            }
        ]
    };
    
    // @TODO read the JSON data posted to the AWS API endpoint

    // @TODO parse the form submission to generate an Email object to send to api.library.virginia.edu server

    // @TODO parse the form submission to generate a dataset object to send to LibInsight
    
    // @TODO if an error occurs report an error???

};
