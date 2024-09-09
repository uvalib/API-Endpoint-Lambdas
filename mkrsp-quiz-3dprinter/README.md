# Makerspace LibWizard Quiz 3D printer
This function is used by the Library API /quizzes/makerspace/sl3dprinter endpoint. It takes quiz POST JSON submission data from LibWizard and writes it to the appropriate LibInsight dataset.

Several environment variables need to be defined in the AWS Lambda resource for this function to work:
- LibInsight API client ID: process.env.libinsight_client_id;
- LibInsight API client secret: process.env.libinsight_client_secret;
- LibInsight domain: process.env.libinsight.client_domain
- LibInsight Dataset ID for the printer's allowed users: process.env.libinsight_sl3d_printer_allow_list_dataset_id

