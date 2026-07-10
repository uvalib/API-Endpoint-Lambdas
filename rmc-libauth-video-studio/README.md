# RMC LibAuth Video Studio
This function is used by the Library API /libauth/rmc/video-studio.csv  endpoint. It takes no parameters. It returns a CSV/text file only containing computing IDs of those who have permission to reserve the Video Studio.

Several environment variables need to be defined in the AWS Lambda resource for this function to work:
- LibInsight API client ID: process.env.libinsight_client_id;
- LibInsight API client secret: process.env.libinsight_client_secret;
- LibInsight domain: process.env.libinsight_client_domain
- LibInsight Dataset ID for the Video Studio's allowed users: process.env.libinsight_video_studio_allow_list_dataset_id

