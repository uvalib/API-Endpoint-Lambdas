# RMC LibAuth Wireless Lav
This function is used by the Library API /libauth/rmc/wireless-lav.csv  endpoint. It takes no parameters. It returns a CSV/text file only containing computing IDs of those who have permission to reserve the Wireless Lav.

Several environment variables need to be defined in the AWS Lambda resource for this function to work:
- LibInsight API client ID: process.env.libinsight_client_id;
- LibInsight API client secret: process.env.libinsight_client_secret;
- LibInsight domain: process.env.libinsight_client_domain
- LibInsight Dataset ID for the Wireless Lav's allowed users: process.env.libinsight_wireless_lav_allow_list_dataset_id

