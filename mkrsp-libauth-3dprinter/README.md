# Makerspace LibAuth 3D printer
This function is used by the Library API /libauth/makerspace/sl3dprinter.csv  endpoint. It takes no parameters. It returns a CSV/text file only containing computing IDs of those who have permission to reserve the 3D printers.

Several environment variables need to be defined in the AWS Lambda resource for this function to work:
- LibInsight API client ID: process.env.libinsight_client_id;
- LibInsight API client secret: process.env.libinsight_client_secret;
- LibInsight domain: process.env.libinsight_client_domain
- LibInsight Dataset ID for the printer's allowed users: process.env.libinsight_sl3d_printer_allow_list_dataset_id

