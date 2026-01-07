exports.handler = (event, context, callback) => {

    const formName = 'Purchase Recommendation';
    const nodeFetch = require('node-fetch');
    const nodeMailer = require("nodemailer");
    const stripHtml = require('string-strip-html');
    const headerObj = {'Content-Type': 'application/x-www-form-urlencoded'};

    // Environment variables configured for use with sending emails and saving data to LibInsight for forms.
    const apiUrl = process.env.purchase_rec_api_url; 
    
    // SMTP mail server settings
    const smtpServer = {
        host: 'smtp.mail.virginia.edu',
        port: 465,
        secure: true      
    }
    const mailTransporter = nodeMailer.createTransport(smtpServer);

    // Initialize email info and objects.
    let libraryOptions = { from: '"UVA Library" <no-reply-library@Virginia.EDU>', replyTo: '',
        to: '', cc: '', bcc: '', subject: '', text: '', html: ''
    };
    let patronOptions = { from: '"UVA Library" <no-reply-library@Virginia.EDU>', replyTo: '"UVA Library" <NO-REPLY-LIBRARY@Virginia.EDU>',
        to: '', cc: '', bcc: '', subject: '', text: '', html: ''
    };
    const now = new Date();

    // Identify the appropriate liaison email address to copy for a request depending on the department specified on the form.
    const getSubjectLiaisonEmail = function(dept) {
        let emailAddr;
        switch (dept) {
            case 'African-American and African Studies':
                emailAddr = 'lb-aaas-books@virginia.edu';
                break;
            case 'American Studies':
                emailAddr = 'cjr2q@virginia.edu';
                break;
            case 'Anthropology':
                emailAddr = 'lib-anthropology-books@virginia.edu';
                break;
            case 'Archaeology':
                emailAddr = 'lib-archaeology-books@virginia.edu';
                break;
            case 'Architecture':
            case 'Architectural History':
            case 'Landscape Architecture':
            case 'Urban and Environmental Planning':
                emailAddr = 'lib-architecture-books@virginia.edu';
                break;
            case 'Art':
                emailAddr = 'fal-purchase-req@virginia.edu';
                break;
            case 'Astronomy':
                emailAddr = 'lib-astronomy-books@virginia.edu';
                break;
            case 'Batten School':
                emailAddr = 'battenbooks@virginia.edu';
                break;
            case 'Biology':
                emailAddr = 'lib-biology-books@virginia.edu';
                break;
            case 'Biomedical Engineering':
                emailAddr = 'biomed-engineer-book@virginia.edu';
                break;
            case 'Chemical Engineering':
                emailAddr = 'chemical-engineer-book@virginia.edu';
                break;
            case 'Chemistry':
                emailAddr = 'lib-chemistry-books@virginia.edu';
                break;
            case 'Engineering Systems and Environment':
                emailAddr = 'lib-civil-envi-books@virginia.edu';
                break;
            case 'Classics':
                emailAddr = 'lib-classics-books@virginia.edu';
                break;
            case 'Commerce':
                emailAddr = 'lib-commerce-books@virginia.edu';
                break;
            case 'Economics':
                emailAddr = 'lib-econ-books@virginia.edu';
                break;
            case 'Computer Science':
                emailAddr = 'lib-comp-sci-books@virginia.edu';
                break;
            case 'Data Science':
                emailAddr = 'jah2ax@virginia.edu';
                break;
            case 'Drama':
                emailAddr = 'lib-drama-books@virginia.edu';
                break;
            case 'East Asian':
                emailAddr = 'lib-east-asian-books@virginia.edu';
                break;
            case 'Education':
                emailAddr = 'Education@virginia.edu';
                break;
            case 'Electrical and Computer Engineering':
                emailAddr = 'lib-elec-comp-books@virginia.edu';
                break;
            case 'English':
                emailAddr = 'lb-english@virginia.edu';
                break;
            case 'Environmental Sciences':
                emailAddr = 'lib-env-sci-books@virginia.edu';
                break;
            case 'French':
                emailAddr = 'lib-french-books@virginia.edu';
                break;
            case 'German':
                emailAddr = 'germanbooks@virginia.edu';
                break;
            case 'History':
                emailAddr = 'historybooks@virginia.edu';
                break;
            case 'Library':
                emailAddr = 'lib-library-requests@virginia.edu';
                break;
            case 'Materials Science and Engineering':
                emailAddr = 'material-sci-eng-books@virginia.edu';
                break;
            case 'Mathematics':
                emailAddr = 'lib-mathematics-books@virginia.edu';
                break;
            case 'Mechanical and Aerospace Engineering':
                emailAddr = 'lib-mech-aero-books@virginia.edu';
                break;
            case 'Media Studies':
                emailAddr = 'lb-media-studies-books@virginia.edu';
                break;
            case 'Middle Eastern and South Asian':
                emailAddr = 'mideast-southasia-book@virginia.edu';
                break;
            case 'Music':
                emailAddr = 'lb-mu-books@virginia.edu';
                break;
            case 'Other...':
                emailAddr = 'lib-collections@virginia.edu';
                break;
            case 'Philosophy':
                emailAddr = 'philosophybooks@virginia.edu';
                break;
            case 'Physics':
                emailAddr = 'lib-physics-books@virginia.edu';
                break;
            case 'Politics':
                emailAddr = 'politicsbooks@virginia.edu';
                break;
            case 'Psychology':
                emailAddr = 'lib-psychology-books@virginia.edu';
                break;
            case 'Religious Studies':
                emailAddr = 'relstudiesbooks@virginia.edu';
                break;
            case 'STS - Engineering and Society':
                emailAddr = 'sci-tech-society-books@virginia.edu';
                break;
            case 'Slavic':
                emailAddr = 'slavicbooks@virginia.edu';
                break;
            case 'Sociology':
                emailAddr = 'lb-Sociology@virginia.edu';
                break;
            case 'Spanish, Italian, and Portuguese':
                emailAddr = 'span-ital-port-books@virginia.edu';
                break;
            case 'Statistics':
                emailAddr = 'lib-statistics-books@virginia.edu';
                break;
            case 'Systems and Information Engineering':
                emailAddr = 'lib-sys-info-books@virginia.edu';
                break;
            case 'Women, Gender, & Sexuality':
                emailAddr = 'lb-wgsbooks@virginia.edu';
                break;
            default:
                emailAddr = 'purchase-requests@virginia.libanswers.com';
        }
        return emailAddr;
    };

    // Format parameter data for passing on a URL.
    const paramsString = function(obj) {
        return Object.keys(obj).map(key => key + '=' + encodeURIComponent(obj[key])).join('&');
    };

    const postEmailAndData = function (reqId, requestEmailOptions, confirmEmailOptions, formData) {
        // Use promise interface for verify and sendMail (no callback → returns Promise)
        return mailTransporter.verify()
        .then(() => {
            return mailTransporter.sendMail(requestEmailOptions);
        })
        .then(info => {
            console.log('request email sent, id=' + info.messageId);
            return mailTransporter.sendMail(confirmEmailOptions);
        })
        .then(info => {
            console.log('confirmation email sent, id=' + info.messageId);
            // OAuth token request (URL-encoded body is correct for client_credentials)
            return fetch(tokenUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                body: tokenBody // URLSearchParams instance
            });
        })
        .then(tokenResp => {
            if (!tokenResp.ok) {
                return tokenResp.text().then(msg => {
                throw new Error(`OAuth token request failed: ${tokenResp.status} ${msg}`);
                });
            }
            return tokenResp.json();
        })
        .then(tokenJson => {
            const access_token = tokenJson.access_token;
            const apiUrl = `${process.env.springshare_libinsight_api_url}/custom-dataset/15512/save`;
            // IMPORTANT: send JSON with application/json
            return fetch(apiUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${access_token}` },
                body: JSON.stringify([formData])
            });
        })
        .then(apiResp => {
            if (!apiResp.ok) {
                return apiResp.text().then(msg => {
                console.log(`LibInsight data save request failed for ${reqId}: ${apiResp.status} ${msg}`);
                throw new Error(`LibInsight data save request failed: ${apiResp.status} ${msg}`);
                });
            }
            console.log(`LibInsight data saved for ${reqId}`);
            return apiResp.json();
        })
        .catch(err => {
            // One catch to log any error in the chain (SMTP or HTTP)
            console.error(`postEmailAndData failed for ${reqId}:`, err);
            throw err; // rethrow so Lambda sees a failed invocation
        });
    };
        
    // Make sure the form submission POST data is a JSON object.
    const pData = event;

    // Verify that their field defined for the form before attempting to do anything
    if (pData.fields.length && (pData.fields.length > 0)) {
        // **PURCHASE RECOMMENDATION FORM BEGIN
        let adminMsg = '';
        let courseInfo = '';
        let courseTerm = '';
        let biblioInfo = '';
        let requestorInfo = '';
        let patronMsg = "<p>A copy of your purchase recommendation is shown below.</p><br>\n\n";
        let reqId = "PR-"+ new Date().toISOString();
        let data = { 'field_642': reqId, 'ts_start': now };
    
        // Prepare email message body and LibInsight data parameters
        // The admin message has a few fields out of order placed at the top.
        // Fund Code and library location are internal fields defined for use in routing to Acquisitions and Collections Mgmt.
        // Fund code value depends on if the item is for reserve and what format the item is.
        // Library location depends on if the item is for reserve and which library location was specified.
        // Since fund code and library location are for admin purposes, they will not get saved to LibInsight data.
        let msg = '';
        let fundCode = '';
        let libraryLocation = '';
        let format = pData.fields.find(t=>t.field_id === 4512446) ? pData.fields.find(t=>t.field_id === 4512446).val : 'Unknown';
        let forCourseReserves = pData.fields.find(t=>t.field_id === 4512610) ? pData.fields.find(t=>t.field_id === 4512610).val : '';
        forCourseReserves = (forCourseReserves === 'Yes') ? forCourseReserves : 'No' ;
        if (forCourseReserves === "Yes") {
            if ((format === "Other") || (format === "Book") || (format === "eBook") || (format === "Dissertation or Thesis") || (format === "Music Recording")) {
                fundCode = "UL-RESERVES";
                libraryLocation = "LC CLASS"; // library where typical call number gets housed
            }
        } else {
            if ((format === "Book") || (format === "eBook") || (format === "Music Recording") || (format === "Music Score")) {
                fundCode = "UL-REQUESTS";
                libraryLocation = (format !== "Music Recording") ? "LC CLASS" : "Music";
            }
            libraryLocation = (format !== "Music Recording") ? "LC CLASS" : "Music";
        }
        libraryLocation = (format === "Music Score") ? "Music" : libraryLocation;
        adminMsg += "<strong>Fund code:</strong> " + fundCode + "<br>\n";
        adminMsg += "<strong>Library location:</strong> " + libraryLocation + "<br>\n";
    
        msg = "<strong>Format:</strong> " + format + "<br>\n";
        adminMsg += msg;
        patronMsg += msg;
        data['field_645'] = format;

        // Electronic version preferred when available field occurs multiple times in LibWizard form; need to use format value to capture correct value
        let electronicVersionPreferred;
        switch (format) {
            case 'Book':
                electronicVersionPreferred = pData.fields.find(t=>t.field_id === 4513058) ? pData.fields.find(t=>t.field_id === 4513058).val : '';
                electronicVersionPreferred = (electronicVersionPreferred === 'Yes') ? electronicVersionPreferred : 'No' ;
                break;
            case 'Dissertation or Thesis':
                electronicVersionPreferred = pData.fields.find(t=>t.field_id === 4512988) ? pData.fields.find(t=>t.field_id === 4512988).val : '';
                electronicVersionPreferred = (electronicVersionPreferred === 'Yes') ? electronicVersionPreferred : 'No' ;
                break;
            case 'Other':
                electronicVersionPreferred = pData.fields.find(t=>t.field_id === 4512775) ? pData.fields.find(t=>t.field_id === 4512775).val : '';
                electronicVersionPreferred = (electronicVersionPreferred === 'Yes') ? electronicVersionPreferred : 'No' ;
                break;
            default:
                electronicVersionPreferred = '';
        }
        if (electronicVersionPreferred !== '') {
            msg = "<strong>Electronic version preferred:</strong> " + electronicVersionPreferred + "<br>\n";
            adminMsg += msg;
            patronMsg += msg;
            data['field_683'] = electronicVersionPreferred;
        }

        // type of request field removed in December 2024 (was required and available for book and ebook)
        let typeOfRequest = 'Non-rush';
        data['field_646'] = typeOfRequest;

        if (forCourseReserves === "Yes") {
            adminMsg += "<strong>Is this for course reserves? </strong> " + forCourseReserves + "<br>\n";
        }
        data['field_647'] = forCourseReserves;
        // Build course information output section and set appropriate LibInsight fields.
        if (forCourseReserves === "Yes") {
            courseInfo += "\n<h3>Course Information</h3>\n\n<p>";
            // Currently no library location field exists on the purchase form so this field doesn't need to get populated since not required in LibInsight
            // data['field_655'] = 'library location value goes here';
            let courseTerm = pData.fields.find(t=>t.field_id === 4512624).val;
            courseInfo += "<strong>Term:</strong> " + courseTerm + "<br>\n";
            data['field_648'] = courseTerm;
            let course = pData.fields.find(t=>t.field_id === 4512628) ? pData.fields.find(t=>t.field_id === 4512628).val : '';
            courseInfo += "<strong>Course:</strong> " + course + "<br>\n";
            data['field_649'] = course;
            let courseSection = pData.fields.find(t=>t.field_id === 4512627) ? pData.fields.find(t=>t.field_id === 4512627).val : '';
            if (courseSection !== '') {
                courseInfo += "<strong>Section:</strong> " + courseSection + "<br>\n";
                data['field_650'] = courseSection;
            }
            let altCourse = pData.fields.find(t=>t.field_id === 4512631) ? pData.fields.find(t=>t.field_id === 4512631).val : '';
            if (altCourse !== '') {
                courseInfo += "<strong>Alternate course:</strong> " + altCourse + "<br>\n";
                data['field_651'] = altCourse;
            }
            let altSection = pData.fields.find(t=>t.field_id === 4512634) ? pData.fields.find(t=>t.field_id === 4512634).val : '';
            if (altSection !== '') {
                courseInfo += "<strong>Alternate course section:</strong> " + altSection + "<br>\n";
                data['field_652'] = altSection;
            }
            let courseTitle = pData.fields.find(t=>t.field_id === 4512638) ? pData.fields.find(t=>t.field_id === 4512638).val : '';
            if (courseTitle !== '') {
                courseInfo += "<strong>Title:</strong> " + courseTitle + "<br>\n";
                data['field_653'] = courseTitle;
            }
            let courseEnrollment = pData.fields.find(t=>t.field_id === 4512640) ? pData.fields.find(t=>t.field_id === 4512640).val : '';
            if (courseEnrollment) {
                courseInfo += "<strong>Enrollment:</strong> " + courseEnrollment + "<br>\n";
                data['field_654'] = courseEnrollment;
            }
            let courseLMS = pData.fields.find(t=>t.field_id === 4600292) ? pData.fields.find(t=>t.field_id === 4600292).val : '';
            if (courseLMS !== '') {
                courseInfo += "<strong>Learning Management System:</strong> " + courseLMS + "<br>\n";
                data['field_1787'] = courseLMS;
            }
            if (courseLMS == 'Other...') {
                let otherLMS = pData.fields.find(t=>t.field_id === 4600299) ? pData.fields.find(t=>t.field_id === 4600299).val : '';
                if (otherLMS !== '') {
                    courseInfo += "<strong>Other LMS:</strong> " + otherLMS + "<br>\n";
                    data['field_1788'] = otherLMS;
                }
            }
            // Asking if submitting the request on behalf of the instructor is no longer supported due to privacy/security reasons.
            // data['field_1820'] = 'indicating if requesting on behalf of the instructor would go here if still allowed/captured';
            // data['field_1821'] = 'course instructor name would go here if still allowed/captured';
            courseInfo += "</p><br>\n";
        }

        // Create requestor info output content and set appropriate LibInsight fields.
        requestorInfo += "\n<h3>";
        requestorInfo += (forCourseReserves === "Yes") ? "Requested" : "Suggested";
        requestorInfo += " by</h3>\n\n<p>";
        let name = pData.fields.find(t=>t.field_id === 4512399) ? pData.fields.find(t=>t.field_id === 4512399).val : 'unknown';
        requestorInfo += "<strong>Name:</strong> " + name + "<br>\n";
        data['field_687'] = name;
        let emailAddress = pData.fields.find(t=>t.field_id === 4512400) ? pData.fields.find(t=>t.field_id === 4512400).val : 'unknown';
        requestorInfo += "<strong>Email address:</strong> " + emailAddress + "<br>\n";
        data['field_688'] = emailAddress;
        let id = emailAddress.split('@');
        let computingId = (id.length > 0) ? id[0] : '';
        if (computingId !== '') {
            requestorInfo += "<strong>UVA Computing ID:</strong> " + computingId + "<br>\n";
            data['field_686'] = computingId;
        }
        let phoneNumber = pData.fields.find(t=>t.field_id === 4512426) ? pData.fields.find(t=>t.field_id === 4512426).val : '';
        if (phoneNumber !== '') {
            requestorInfo += "<strong>Phone number:</strong> " + phoneNumber + "<br>\n";
            data['field_689'] = phoneNumber;
        }
        let affiliation = pData.fields.find(t=>t.field_id === 4512402) ? pData.fields.find(t=>t.field_id === 4512402).val : '';
        requestorInfo += "<strong>University affiliation:</strong> " + affiliation + "<br>\n";
        data['field_690'] = affiliation;
        let department = pData.fields.find(t=>t.field_id === 4512419) ? pData.fields.find(t=>t.field_id === 4512419).val : '';
        if (department !== '') {
            requestorInfo += "<strong>University department or school:</strong> " + department + "<br>\n";
            data['field_691'] = department;
            // Using the Other option for a LibWizard selection list does not create an addition field for capturing the other option;
            // instead the value is captured in the select list value returned. So nothing to store in the this LibInsight field anymore.
            // data['field_751'] = 'other department or school value returned in deparatment field';
        }
        // The primary dept/school from LDAP is not available via LibWizard form so we cannot capture this anymore.
        // data['field_750'] = '';

        // Create format's bibliographic info output and set appropriate LibInsight fields.
        biblioInfo += "\n<h3>Bibliographic Information</h3>\n\n<p>";
        let isbn;
        switch (format) {
            case 'Book':
                isbn = pData.fields.find(t=>t.field_id === 4513063) ? pData.fields.find(t=>t.field_id === 4513063).val : '';
                break;
            case 'eBook':
                isbn = pData.fields.find(t=>t.field_id === 4513042) ? pData.fields.find(t=>t.field_id === 4513042).val : '';
                break;
            default:
                isbn = '';
        }
        if (isbn !== '') {
            biblioInfo += "<strong>ISBN:</strong> " + isbn + "<br>\n";
            data['field_671'] = isbn;
        }
        let title;
        switch (format) {
            case 'Book':
                title = pData.fields.find(t=>t.field_id === 4513057) ? pData.fields.find(t=>t.field_id === 4513057).val : '';
                break;
            case 'eBook':
                title = pData.fields.find(t=>t.field_id === 4513037) ? pData.fields.find(t=>t.field_id === 4513037).val : '';
                break;
            case 'Dissertation or Thesis':
                title = pData.fields.find(t=>t.field_id === 4512986) ? pData.fields.find(t=>t.field_id === 4512986).val : '';
                break;
            case 'Music Recording':
                title = pData.fields.find(t=>t.field_id === 4512952) ? pData.fields.find(t=>t.field_id === 4512952).val : '';
                break;
            case 'Music Score':
                title = pData.fields.find(t=>t.field_id === 4512897) ? pData.fields.find(t=>t.field_id === 4512897).val : '';
                break;
            case 'Video':
                title = pData.fields.find(t=>t.field_id === 4512850) ? pData.fields.find(t=>t.field_id === 4512850).val : '';
                break;
            default:
                title = '';
        }
        if (title !== '') {
            biblioInfo += "<strong>Title:</strong> " + title + "<br>\n";
            data['field_656'] = title;
        }
        let nameTitle;
        switch (format) {
            case 'Database':
                nameTitle = pData.fields.find(t=>t.field_id === 4513023) ? pData.fields.find(t=>t.field_id === 4513023).val : '';
                break;
            case 'Dataset':
                nameTitle = pData.fields.find(t=>t.field_id === 4513011) ? pData.fields.find(t=>t.field_id === 4513011).val : '';
                break;
            case 'Journal Subscription':
                nameTitle = pData.fields.find(t=>t.field_id === 4512965) ? pData.fields.find(t=>t.field_id === 4512965).val : '';
                break;
            case 'Other':
                nameTitle = pData.fields.find(t=>t.field_id === 4512768) ? pData.fields.find(t=>t.field_id === 4512768).val : '';
                break;
            default:
                nameTitle = '';
        }
        if (nameTitle !== '') {
            biblioInfo += "<strong>Name/Title:</strong> " + nameTitle + "<br>\n";
            data['field_657'] = nameTitle;
        }
        let authorEditor;
        switch (format) {
            case 'Book':
                authorEditor = pData.fields.find(t=>t.field_id === 4513059) ? pData.fields.find(t=>t.field_id === 4513059).val : '';
                break;
            case 'eBook':
                authorEditor = pData.fields.find(t=>t.field_id === 4513038) ? pData.fields.find(t=>t.field_id === 4513038).val : '';
                break;
            default:
                authorEditor = '';
        }
        if (authorEditor !== '') {
            biblioInfo += "<strong>Author/Editor:</strong> " + authorEditor + "<br>\n";
            data['field_658'] = authorEditor;
        }
        let author;
        switch (format) {
            case 'Dissertation or Thesis':
                author = pData.fields.find(t=>t.field_id === 4512993) ? pData.fields.find(t=>t.field_id === 4512993).val : '';
                break;
            default:
                author = '';
        }
        if (author !== '') {
            biblioInfo += "<strong>Author:</strong> " + author + "<br>\n";
            data['field_659'] = author;
        }
        let director;
        switch (format) {
            case 'Video':
                director = pData.fields.find(t=>t.field_id === 4512852) ? pData.fields.find(t=>t.field_id === 4512852).val : '';
                break;
            default:
                director = '';
        }
        if (director) {
            biblioInfo += "<strong>Director:</strong> " + director + "<br>\n";
            data['field_660'] = director;
        }
        let composers, performers;
        switch (format) {
            case 'Music Recording':
                composers = pData.fields.find(t=>t.field_id === 4512953) ? pData.fields.find(t=>t.field_id === 4512953).val : '';
                performers = pData.fields.find(t=>t.field_id === 4512954) ? pData.fields.find(t=>t.field_id === 4512954).val : '';
                break;
            default:
                composers = '';
                performers = '';
        }
        if (composers !== '') {
            biblioInfo += "<strong>Composer(s):</strong> " + composers + "<br>\n";
            data['field_661'] = composers;
        }
        if (performers !== '') {
            biblioInfo += "<strong>Performer(s):</strong> " + performers + "<br>\n";
            data['field_662'] = performers;
        }
        let composerEditor;
        switch (format) {
            case 'Music Score':
                composerEditor = pData.fields.find(t=>t.field_id === 4512899) ? pData.fields.find(t=>t.field_id === 4512899).val : '';
                break;
            default:
                composerEditor = '';
        }
        if (composerEditor !== '') {
            biblioInfo += "<strong>Composer/Editor:</strong> " + composerEditor + "<br>\n";
            data['field_663'] = composerEditor;
        }
        let publisher;
        switch (format) {
            case 'Book':
                publisher = pData.fields.find(t=>t.field_id === 4513060) ? pData.fields.find(t=>t.field_id === 4513060).val : '';
                break;
            case 'eBook':
                publisher = pData.fields.find(t=>t.field_id === 4513039) ? pData.fields.find(t=>t.field_id === 4513039).val : '';
                break;
            case 'Music Score':
                publisher = pData.fields.find(t=>t.field_id === 4512900) ? pData.fields.find(t=>t.field_id === 4512900).val : '';
                break;
            default:
                publisher = '';
        }
        if (publisher !== '') {
            biblioInfo += "<strong>Publisher:</strong> " + publisher + "<br>\n";
            data['field_664'] = publisher;
        }
        let creatorPublisherVendor;
        switch (format) {
            case 'Database':
                creatorPublisherVendor = pData.fields.find(t=>t.field_id === 4513024) ? pData.fields.find(t=>t.field_id === 4513024).val : '';
                break;
            case 'Dataset':
                creatorPublisherVendor = pData.fields.find(t=>t.field_id === 4513012) ? pData.fields.find(t=>t.field_id === 4513012).val : '';
                break;
            default:
                creatorPublisherVendor = '';
        }
        if (creatorPublisherVendor !== '') {
            biblioInfo += "<strong>Creator/Publisher/Vendor:</strong> " + creatorPublisherVendor + "<br>\n";
            data['field_665'] = creatorPublisherVendor;
        }
        let publisherVendor;
        switch (format) {
            case 'Journal Subscription':
                publisherVendor = pData.fields.find(t=>t.field_id === 4512967) ? pData.fields.find(t=>t.field_id === 4512967).val : '';
                break;
            default:
                publisherVendor = '';
        }
        if (publisherVendor !== '') {
            biblioInfo += "<strong>Publisher/Vendor:</strong> " + publisherVendor + "<br>\n";
            data['field_666'] = publisherVendor;
        }
        let producerPublisherCreator;
        switch (format) {
            case 'Other':
                producerPublisherCreator = pData.fields.find(t=>t.field_id === 4512777) ? pData.fields.find(t=>t.field_id === 4512777).val : '';
                break;
            default:
                producerPublisherCreator = '';
        }
        if (producerPublisherCreator !== '') {
            biblioInfo += "<strong>Producer/Publisher/Creator:</strong> " + producerPublisherCreator + "<br>\n";
            data['field_667'] = producerPublisherCreator;
        }
        let institutionGrantingDegree;
        switch (format) {
            case 'Dissertation or Thesis':
                institutionGrantingDegree = pData.fields.find(t=>t.field_id === 4513001) ? pData.fields.find(t=>t.field_id === 4513001).val : '';
                break;
            default:
                institutionGrantingDegree = '';
        }
        if (institutionGrantingDegree !== '') {
            biblioInfo += "<strong>Institution (granting degree):</strong> " + institutionGrantingDegree + "<br>\n";
            data['field_668'] = institutionGrantingDegree;
        }
        let recordLabel;
        switch (format) {
            case 'Music Recording':
                recordLabel = pData.fields.find(t=>t.field_id === 4512955) ? pData.fields.find(t=>t.field_id === 4512955).val : '';
                break;
            default:
                recordLabel = '';
        }
        if (recordLabel !== '') {
            biblioInfo += "<strong>Record label:</strong> " + recordLabel + "<br>\n";
            data['field_669'] = recordLabel;
        }
        let dateOfPublication;
        switch (format) {
            case 'Book':
                dateOfPublication = pData.fields.find(t=>t.field_id === 4513062) ? pData.fields.find(t=>t.field_id === 4513062).val : '';
                break;
            case 'eBook':
                dateOfPublication = pData.fields.find(t=>t.field_id === 4513041) ? pData.fields.find(t=>t.field_id === 4513041).val : '';
                break;
            case 'Dissertation or Thesis':
                dateOfPublication = pData.fields.find(t=>t.field_id === 4513003) ? pData.fields.find(t=>t.field_id === 4513003).val : '';
                break;
            default:
                dateOfPublication = '';
        }
        if (dateOfPublication !== '') {
            biblioInfo += "<strong>Date of publication:</strong> " + dateOfPublication + "<br>\n";
            data['field_670'] = dateOfPublication;
        }
        let releaseDate;
        switch (format) {
            case 'Music Recording':
                releaseDate = pData.fields.find(t=>t.field_id === 4512956) ? pData.fields.find(t=>t.field_id === 4512956).val : '';
                break;
            default:
                releaseDate = '';
        }
        if (releaseDate !== '') {
            biblioInfo += "<strong>Release date:</strong> " + releaseDate + "<br>\n";
            data['field_672'] = releaseDate;
        }
        let yearOfPublication;
        switch (format) {
            case 'Music Score':
                yearOfPublication = pData.fields.find(t=>t.field_id === 4512901) ? pData.fields.find(t=>t.field_id === 4512901).val : '';
                break;
            default:
                yearOfPublication = '';
        }
        if (yearOfPublication) {
            biblioInfo += "<strong>Year of publication:</strong> " + yearOfPublication + "<br>\n";
            data['field_673'] = yearOfPublication;
        }
        let productionDate;
        switch (format) {
            case 'Video':
                productionDate = pData.fields.find(t=>t.field_id === 4512853) ? pData.fields.find(t=>t.field_id === 4512853).val : '';
                break;
            default:
                productionDate = '';
        }
        if (productionDate !== '') {
            biblioInfo += "<strong>Production date:</strong> " + productionDate + "<br>\n";
            data['field_674'] = productionDate;
        }
        let edition;
        switch (format) {
            case 'Book':
                edition = pData.fields.find(t=>t.field_id === 4513064) ? pData.fields.find(t=>t.field_id === 4513064).val : '';
                break;
            case 'eBook':
                edition = pData.fields.find(t=>t.field_id === 4513043) ? pData.fields.find(t=>t.field_id === 4513043).val : '';
                break;
            default:
                edition = '';
        }
        if (edition !== '') {
            biblioInfo += "<strong>Edition:</strong> " + edition + "<br>\n";
            data['field_675'] = edition;
        }
        let editionVersion;
        switch (format) {
            case 'Music Score':
                editionVersion = pData.fields.find(t=>t.field_id === 4512902) ? pData.fields.find(t=>t.field_id === 4512902).val : '';
                break;
            case 'Video':
                editionVersion = pData.fields.find(t=>t.field_id === 4512869) ? pData.fields.find(t=>t.field_id === 4512869).val : '';
                break;
            default:
                editionVersion = '';
        }
        if (editionVersion !== '') {
            biblioInfo += "<strong>Edition/Version:</strong> " + editionVersion + "<br>\n";
            data['field_676'] = editionVersion;
        }
        let preferredAudioLanguage;
        switch (format) {
            case 'Video':
                preferredAudioLanguage = pData.fields.find(t=>t.field_id === 4600329) ? pData.fields.find(t=>t.field_id === 4600329).val : '';
                break;
            default:
                preferredAudioLanguage = '';
        }
        if (preferredAudioLanguage !== '') {
            biblioInfo += "<strong>Preferred audio language:</strong> " + preferredAudioLanguage + "<br>\n";
            data['field_1882'] = preferredAudioLanguage;
        }
        let includeSubtitles;
        switch (format) {
            case 'Video':
                includeSubtitles = pData.fields.find(t=>t.field_id === 4600330) ? pData.fields.find(t=>t.field_id === 4600330).val : '';
                break;
            default:
                includeSubtitles = '';
        }
        if (includeSubtitles !== '') {
            biblioInfo += "<strong>Include subtitles?:</strong> " + includeSubtitles + "<br>\n";
            data['field_1883'] = includeSubtitles;
        }
        let subtitlesLanguage;
        switch (format) {
            case 'Video':
                subtitlesLanguage = pData.fields.find(t=>t.field_id === 4605238) ? pData.fields.find(t=>t.field_id === 4605238).val : '';
                break;
            default:
                subtitlesLanguage = '';
        }
        if (includeSubtitles === 'Yes') {
            biblioInfo += "<strong>Subtitles language:</strong> " + subtitlesLanguage + "<br>\n";
            data['field_1884'] = subtitlesLanguage;
        }
        let versionInfo;
        switch (format) {
            case 'Music Recording':
                versionInfo = pData.fields.find(t=>t.field_id === 4512958) ? pData.fields.find(t=>t.field_id === 4512958).val : '';
                break;
            default:
                versionInfo = '';
        }
        if (versionInfo !== '') {
            biblioInfo += "<strong>Version info:</strong> " + versionInfo + "<br>\n";
            data['field_677'] = versionInfo;
        }
        let whatDoesDatasetCover;
        switch (format) {
            case 'Dataset':
                whatDoesDatasetCover = pData.fields.find(t=>t.field_id === 4513013) ? pData.fields.find(t=>t.field_id === 4513013).val : '';
                break;
            default:
                whatDoesDatasetCover = '';
        }
        if (whatDoesDatasetCover !== '') {
            biblioInfo += "<strong>What does this cover that existing resources do not?:</strong> " + whatDoesDatasetCover + "<br>\n";
            data['field_678'] = whatDoesDatasetCover;
        }
        let whatDoesSubscriptionCover;
        switch (format) {
            case 'Journal Subscription':
                whatDoesSubscriptionCover = pData.fields.find(t=>t.field_id === 4512969) ? pData.fields.find(t=>t.field_id === 4512969).val : '';
                break;
            default:
                whatDoesSubscriptionCover = '';
        }
        if (whatDoesSubscriptionCover !== '') {
            biblioInfo += "<strong>What does this cover that existing subscriptions do not?:</strong> " + whatDoesSubscriptionCover + "<br>\n";
            data['field_679'] = whatDoesSubscriptionCover;
        }
        let whatClassesMightUseThis;
        switch (format) {
            case 'Database':
                whatClassesMightUseThis = pData.fields.find(t=>t.field_id === 4513026) ? pData.fields.find(t=>t.field_id === 4513026).val : '';
                break;
            case 'Dataset':
                whatClassesMightUseThis = pData.fields.find(t=>t.field_id === 4513015) ? pData.fields.find(t=>t.field_id === 4513015).val : '';
                break;
            case 'Journal Subscription':
                whatClassesMightUseThis = pData.fields.find(t=>t.field_id === 4512970) ? pData.fields.find(t=>t.field_id === 4512970).val : '';
                break;
            default:
                whatClassesMightUseThis = '';
        }
        if (whatClassesMightUseThis !== '') {
            biblioInfo += "<strong>What classes, labs, faculty, and/or students might use this resource?:</strong> " + whatClassesMightUseThis + "<br>\n";
            data['field_680'] = whatClassesMightUseThis;
        }
        let locationToPurchase;
        switch (format) {
            case 'Book':
                locationToPurchase = pData.fields.find(t=>t.field_id === 4513065) ? pData.fields.find(t=>t.field_id === 4513065).val : '';
                break;
            case 'eBook':
                locationToPurchase = pData.fields.find(t=>t.field_id === 4513044) ? pData.fields.find(t=>t.field_id === 4513044).val : '';
                break;
            case 'Database':
                locationToPurchase = pData.fields.find(t=>t.field_id === 4513029) ? pData.fields.find(t=>t.field_id === 4513029).val : '';
                break;
            case 'Dataset':
                locationToPurchase = pData.fields.find(t=>t.field_id === 4513016) ? pData.fields.find(t=>t.field_id === 4513016).val : '';
                break;
            case 'Journal Subscription':
                locationToPurchase = pData.fields.find(t=>t.field_id === 4512971) ? pData.fields.find(t=>t.field_id === 4512971).val : '';
                break;
            case 'Music Recording':
                locationToPurchase = pData.fields.find(t=>t.field_id === 4512959) ? pData.fields.find(t=>t.field_id === 4512959).val : '';
                break;
            case 'Music Score':
                locationToPurchase = pData.fields.find(t=>t.field_id === 4512903) ? pData.fields.find(t=>t.field_id === 4512903).val : '';
                break;
            case 'Video':
                locationToPurchase = pData.fields.find(t=>t.field_id === 4512872) ? pData.fields.find(t=>t.field_id === 4512872).val : '';
                break;
            case 'Other':
                locationToPurchase = pData.fields.find(t=>t.field_id === 4512782) ? pData.fields.find(t=>t.field_id === 4512782).val : '';
                break;
            default:
                locationToPurchase = '';
        }
        if (locationToPurchase !== '') {
            biblioInfo += "<strong>Location to purchase/URL:</strong> " + locationToPurchase + "<br>\n";
            data['field_681'] = locationToPurchase;
        }
        let price;
        switch (format) {
            case 'Database':
                price = pData.fields.find(t=>t.field_id === 4513030) ? pData.fields.find(t=>t.field_id === 4513030).val : '';
                break;
            case 'Dataset':
                price = pData.fields.find(t=>t.field_id === 4513017) ? pData.fields.find(t=>t.field_id === 4513017).val : '';
                break;
            case 'Journal Subscription':
                price = pData.fields.find(t=>t.field_id === 4512973) ? pData.fields.find(t=>t.field_id === 4512973).val : '';
                break;
            case 'Video':
                price = pData.fields.find(t=>t.field_id === 4512873) ? pData.fields.find(t=>t.field_id === 4512873).val : '';
                break;
            case 'Other':
                price = pData.fields.find(t=>t.field_id === 4512789) ? pData.fields.find(t=>t.field_id === 4512789).val : '';
                break;
            default:
                price = '';
        }
        if (price !== '') {
            biblioInfo += "<strong>Price:</strong> " + price + "<br>\n";
            data['field_682'] = price;
        }
        let additionalComments;
        switch (format) {
            case 'Book':
                additionalComments = pData.fields.find(t=>t.field_id === 4513066) ? pData.fields.find(t=>t.field_id === 4513066).val : '';
                break;
            case 'eBook':
                additionalComments = pData.fields.find(t=>t.field_id === 4513045) ? pData.fields.find(t=>t.field_id === 4513045).val : '';
                break;
            case 'Database':
                additionalComments = pData.fields.find(t=>t.field_id === 4513031) ? pData.fields.find(t=>t.field_id === 4513031).val : '';
                break;
            case 'Dataset':
                additionalComments = pData.fields.find(t=>t.field_id === 4513019) ? pData.fields.find(t=>t.field_id === 4513019).val : '';
                break;
            case 'Dissertation or Thesis':
                additionalComments = pData.fields.find(t=>t.field_id === 4513005) ? pData.fields.find(t=>t.field_id === 4513005).val : '';
                break;
            case 'Journal Subscription':
                additionalComments = pData.fields.find(t=>t.field_id === 4512974) ? pData.fields.find(t=>t.field_id === 4512974).val : '';
                break;
            case 'Music Recording':
                additionalComments = pData.fields.find(t=>t.field_id === 4512960) ? pData.fields.find(t=>t.field_id === 4512960).val : '';
                break;
            case 'Music Score':
                additionalComments = pData.fields.find(t=>t.field_id === 4512904) ? pData.fields.find(t=>t.field_id === 4512904).val : '';
                break;
            case 'Video':
                additionalComments = pData.fields.find(t=>t.field_id === 4512876) ? pData.fields.find(t=>t.field_id === 4512876).val : '';
                break;
            default:
                additionalComments = '';
        }
        if (additionalComments !== '') {
            biblioInfo += "<strong>Additional comments:</strong> " + additionalComments + "<br>\n";
            data['field_684'] = additionalComments;
        }
        let descriptionComments;
        switch (format) {
            case 'Other':
                descriptionComments = pData.fields.find(t=>t.field_id === 4512798) ? pData.fields.find(t=>t.field_id === 4512798).val : '';
                break;
            default:
                descriptionComments = '';
        }
        if (descriptionComments !== '') {
            biblioInfo += "<strong>Description/Comments:</strong> " + descriptionComments + "<br>\n";
            data['field_685'] = descriptionComments;
        }
    
        // Prepare email content for Library staff
        libraryOptions.subject = (forCourseReserves && (forCourseReserves === "Yes")) ? courseTerm + ' Reserve ' : '';
        libraryOptions.subject += 'Purchase Recommendation ';
        libraryOptions.from = '"' + name + '" <' + emailAddress + '>';
        libraryOptions.replyTo = emailAddress;
        // Routing varies based on format and if for reserves...
        if (forCourseReserves === 'Yes') {
            // course reserve purchases for music and video do not go to acquisitions.
            // book and dissertation requests go to acquisitions.
            if (format === 'Video') {
                libraryOptions.to = 'lib-reserves@virginia.edu';
                libraryOptions.bcc = 'Libselect_video@virginia.edu';
                libraryOptions.subject += ' to Reserves Librarian';
            } else {
                libraryOptions.to = 'lib-collections@virginia.edu';
                if (department && (department !== '')) {
                    // Determine the routing based on the user department. Identify the subject librarian.
                    libraryOptions.to += ','+getSubjectLiaisonEmail(department);
                } else {
                    libraryOptions.to = 'purchase-requests@virginia.libanswers.com';
                    libraryOptions.subject += 'to Collection Librarians';
                }
                libraryOptions.subject += 'to Collection Librarians';
            }
        } else {
            // not going on course reserve so gets routed...
            if (format === 'Music Score') {
                libraryOptions.to = 'purchase-requests@virginia.libanswers.com,lb-mu-scores@virginia.edu';
                libraryOptions.subject += 'to Collection Librarians';
            } else if (format === 'Music Recording') {
                libraryOptions.to = 'lb-mu-recordings@virginia.edu,lib-orders@virginia.edu';
                libraryOptions.subject += 'to Acquisitions';
            } else if (format === 'Video') {
                libraryOptions.to = 'Libselect_video@virginia.edu';
                libraryOptions.subject += 'to Subject Librarian';
            } else if ((format === 'Database') || (format === 'Dataset')) {
                libraryOptions.to = 'purchase-requests@virginia.libanswers.com,data@virginia.edu';
                libraryOptions.subject += 'to Collection Librarians';
            } else {
                if (department && (department !== '')) {
                    // Determine the routing based on the user department. Identify the subject librarian.
                    libraryOptions.to = getSubjectLiaisonEmail(department);
                    if (department !== '') {
                        if ((format === 'Book') || (format === "eBook")) {
                            libraryOptions.to += ',lib-orders@virginia.edu,lib-collections@virginia.edu';
                            libraryOptions.subject += 'to Acquisitions';
                        } else if (format === 'Dissertation or Thesis') {
                            libraryOptions.to += ',lib-collections@virginia.edu';
                            libraryOptions.subject += 'to Collection Librarians';
                        } else {
                            libraryOptions.subject += 'to Collection Librarians';
                            libraryOptions.to += ',purchase-requests@virginia.libanswers.com';
                        }
                    } else {
                        libraryOptions.subject += 'to Collection Librarians';
                    }
                } else {
                    libraryOptions.to = 'purchase-requests@virginia.libanswers.com';
                    libraryOptions.subject += 'to Collection Librarians';
                }
            }
        }
        let reqText = "<br>\n<br>\n<br>\n<strong>req #: </strong>" + reqId;
        libraryOptions.html = adminMsg + biblioInfo + requestorInfo + courseInfo + reqText;
        libraryOptions.text = stripHtml(adminMsg + biblioInfo + requestorInfo + courseInfo + reqText);
    
        // Prepare email confirmation content for patron
        patronOptions.subject = (forCourseReserves && (forCourseReserves === "Yes")) ? 'Reserve ' : '';
        patronOptions.subject += 'Purchase Recommendation';
        patronOptions.to = emailAddress;
        patronOptions.html = patronMsg + biblioInfo + requestorInfo + courseInfo + reqText;
        patronOptions.text = stripHtml(patronMsg + biblioInfo + requestorInfo + courseInfo + reqText);
    
        try {
            return postEmailAndData(reqId, libraryOptions, patronOptions, data);
        }
        catch (error) {
            console.log(`error: ${JSON.stringify(error)}`);
            return error;
        }
        // **PURCHASE RECOMMENDATION FORM END
    } else {
        console.log(`Warning: ${FORMNAME} form submission without any fields in it.`);
        return Promise.resolve({ success: false, message: 'No form fields found' });
    }
};
