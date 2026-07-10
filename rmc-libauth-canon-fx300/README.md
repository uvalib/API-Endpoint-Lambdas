# RMC LibAuth Canon FX300
This function is used by the Library API /libauth/rmc/canon-fx300.csv  endpoint. It takes no parameters. It returns a CSV/text file only containing computing IDs of those who have permission to reserve the Canon FX300.

Several environment variables need to be defined in the AWS Lambda resource for this function to work:
- LibInsight API client ID: process.env.libinsight_client_id;
- LibInsight API client secret: process.env.libinsight_client_secret;
- LibInsight domain: process.env.libinsight_client_domain
- LibInsight Dataset ID for the Canon FX300's allowed users: process.env.libinsight_canon_fx300_allow_list_dataset_id

