const nodeMailer = require("nodemailer");
const { stripHtml } = require('string-strip-html');

const FORMNAME = 'Video Clip Request';

exports.handler = (event) => {

    const headerObj = {'Content-Type': 'application/x-www-form-urlencoded'};

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

    const postEmail = function (reqId, requestEmailOptions, confirmEmailOptions) {
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
            return { success: true, message: `Emails sent for ${reqId}` };
        })
        .catch(err => {
            // One catch to log any error in the chain (SMTP or HTTP)
            console.error(`postEmail failed for ${reqId}:`, err);
            throw err; // rethrow so Lambda sees a failed invocation
        });
    };
        
    // Make sure the form submission POST data is a JSON object.
    const pData = event;

    // Verify that their field defined for the form before attempting to do anything
    if (pData.fields.length && (pData.fields.length > 0)) {
        console.log(`Processing submission for form: ${pData.name} (ID: ${pData.formId})`);
        // **VIDEO CLIP REQUEST FORM BEGIN
        let requestorInfo = '';
        let courseInfo = '';
        let videoInfo = '';
        let clipInfo = '';
        let adminMsg = "<p>A new video clip request has been submitted. Details are shown below.</p><br>\n\n";
        let patronMsg = "<p>A copy of your video clip request is shown below.</p><br>\n\n";
        let reqId = "VCR-"+ new Date().toISOString();
    
        // Create requestor/instructor info output content.
        let makingRequestForInstructor = pData.fields.find(t=>t.field_id === 3872314) ? pData.fields.find(t=>t.field_id === 3872314).val : 'No';
        let yourName = '';
        let yourEmailAddress = '';
        if (makingRequestForInstructor === 'Yes') {
            requestorInfo += "\n<h3>Requested by</h3>\n\n<p>";
            yourName = pData.fields.find(t=>t.field_id === 3872315) ? pData.fields.find(t=>t.field_id === 3872315).val : '';
            requestorInfo += "<strong>Your name:</strong> " + yourName + "<br>\n";
            yourEmailAddress = pData.fields.find(t=>t.field_id === 3872319) ? pData.fields.find(t=>t.field_id === 3872319).val : '';
            requestorInfo += "<strong>Your email address:</strong> " + yourEmailAddress + "<br>\n";
        }
        requestorInfo += "\n<h3>Instructor Information</h3>\n\n<p>";
        let emailAddress = pData.fields.find(t=>t.field_id === 3882508) ? pData.fields.find(t=>t.field_id === 3882508).val : '';
        requestorInfo += "<strong>Email:</strong> " + emailAddress + "<br>\n";
        let name = pData.fields.find(t=>t.field_id === 3872325) ? pData.fields.find(t=>t.field_id === 3872325).val : '';
        requestorInfo += "<strong>Name:</strong> " + name + "<br>\n";
        let affiliation = pData.fields.find(t=>t.field_id === 3872326) ? pData.fields.find(t=>t.field_id === 3872326).val : '';
        requestorInfo += "<strong>University affiliation:</strong> " + affiliation + "<br>\n";
        let department = pData.fields.find(t=>t.field_id === 3872866) ? pData.fields.find(t=>t.field_id === 3872866).val : '';
        if (department !== '') {
            requestorInfo += "<strong>University department or school:</strong> " + department + "<br>\n";
        }
        let phoneNumber = pData.fields.find(t=>t.field_id === 3872366) ? pData.fields.find(t=>t.field_id === 3872366).val : '';
        if (phoneNumber !== '') {
            requestorInfo += "<strong>Phone number:</strong> " + phoneNumber + "<br>\n";
        }
        let messengerMail = pData.fields.find(t=>t.field_id === 3872382) ? pData.fields.find(t=>t.field_id === 3872382).val : '';
        if (messengerMail !== '') {
            requestorInfo += "<strong>Specify your Messenger Mail or LEO delivery address:</strong><br>\n" + messengerMail + "<br>\n";
        }
        requestorInfo += "</p><br>\n";

        // Build course information output section and set appropriate LibInsight fields.
        courseInfo += "\n<h3>Course Information</h3>\n\n<p>";
        let courseTerm = pData.fields.find(t=>t.field_id === 3872386) ? pData.fields.find(t=>t.field_id === 3872386).val : 'Make a selection';
        courseInfo += "<strong>Term:</strong> " + courseTerm + "<br>\n";
        let course = pData.fields.find(t=>t.field_id === 3872384) ? pData.fields.find(t=>t.field_id === 3872384).val : '';
        courseInfo += "<strong>Course:</strong> " + course + "<br>\n";
        let courseSection = pData.fields.find(t=>t.field_id === 3872385) ? pData.fields.find(t=>t.field_id === 3872385).val : '';
        if (courseSection !== '') {
            courseInfo += "<strong>Section:</strong> " + courseSection + "<br>\n";
        }
        let courseLMS = pData.fields.find(t=>t.field_id === 3872390) ? pData.fields.find(t=>t.field_id === 3872390).val : '';
        if (courseLMS !== '') {
            courseInfo += "<strong>Learning Management System:</strong> " + courseLMS + "<br>\n";
        }
        courseInfo += "</p><br>\n";

        // Create video info output.
        videoInfo += "\n<h3>Video Information</h3>\n\n<p>";
        let title = pData.fields.find(t=>t.field_id === 3877024) ? pData.fields.find(t=>t.field_id === 3877024).val : '';
        if (title !== '') {
            videoInfo += "<strong>Title:</strong> " + title + "<br>\n";
        }
        let personalCopy = pData.fields.find(t=>t.field_id === 3877027) ? pData.fields.find(t=>t.field_id === 3877027).val : '';
        if (personalCopy !== '') {
            videoInfo += "<strong>" + personalCopy + "</strong><br>\n";
        } else {
            let callNumber = pData.fields.find(t=>t.field_id === 3877026) ? pData.fields.find(t=>t.field_id === 3877026).val : '';
            if (callNumber !== '') {
                videoInfo += "<strong>Call number:</strong> " + callNumber + "<br>\n";
            }
            let edition = pData.fields.find(t=>t.field_id === 3877030) ? pData.fields.find(t=>t.field_id === 3877030).val : '';
            if (edition !== '') {
                videoInfo += "<strong>Edition:</strong> " + edition + "<br>\n";
            }
        }
        let preferredAudioLanguage = pData.fields.find(t=>t.field_id === 4596919) ? pData.fields.find(t=>t.field_id === 4596919).val : '';
        if (preferredAudioLanguage !== '') {
            videoInfo += "<strong>Preferred audio language:</strong> " + preferredAudioLanguage + "<br>\n";
        }
        let includeSubtitles = pData.fields.find(t=>t.field_id === 4596920) ? pData.fields.find(t=>t.field_id === 4596920).val : '';
        if (includeSubtitles !== '') {
            videoInfo += "<strong>Include subtitles:</strong> " + includeSubtitles + "<br>\n";
            if (includeSubtitles === 'Yes') {
                let subtitlesLanguage = pData.fields.find(t=>t.field_id === 4605122) ? pData.fields.find(t=>t.field_id === 4605122).val : '';
                videoInfo += "<strong>Subtitles language:</strong> " + subtitlesLanguage + "<br>\n";
            }
        }

        // Create clip segment info output.
        clipInfo += "\n<h3>Clip Information</h3>\n\n<p>";
        clipInfo += "\n<h4>Clip </h4>\n<p>";
        let clipStartTime = pData.fields.find(t=>t.field_id === 3868429) ? pData.fields.find(t=>t.field_id === 3868429).val : '';
        if (clipStartTime !== '') {
            clipInfo += "<strong>Start time:</strong> " + clipStartTime + "<br>\n";
        }
        let clipStartDescription = pData.fields.find(t=>t.field_id === 3868430) ? pData.fields.find(t=>t.field_id === 3868430).val : '';
        if (clipStartDescription !== '') {
            clipInfo += "<strong>Start description:</strong> " + clipStartDescription + "<br>\n";
        }
        let clipEndTime = pData.fields.find(t=>t.field_id === 3868431) ? pData.fields.find(t=>t.field_id === 3868431).val : '';
        if (clipEndTime !== '') {
            clipInfo += "<strong>End time:</strong> " + clipEndTime + "<br>\n";
        }
        let clipEndDescription = pData.fields.find(t=>t.field_id === 3868432) ? pData.fields.find(t=>t.field_id === 3868432).val : '';
        if (clipEndDescription !== '') {
            clipInfo += "<strong>End description:</strong> " + clipEndDescription + "<br>\n";
        }
        let isSecondClip = pData.fields.find(t=>t.field_id === 3868442) ? pData.fields.find(t=>t.field_id === 3868442).val : '';
        if (isSecondClip === 'Yes, please show me more fields') {
            clipInfo += "\n<h4>Clip 2</h4>\n<p>";
            let clip2StartTime = pData.fields.find(t=>t.field_id === 3868446) ? pData.fields.find(t=>t.field_id === 3868446).val : '';
            if (clip2StartTime !== '') {
                clipInfo += "<strong>Start time:</strong> " + clip2StartTime + "<br>\n";
            }
            let clip2StartDescription = pData.fields.find(t=>t.field_id === 3868448) ? pData.fields.find(t=>t.field_id === 3868448).val : '';
            if (clip2StartDescription !== '') {
                clipInfo += "<strong>Start description:</strong> " + clip2StartDescription + "<br>\n";
            }
            let clip2EndTime = pData.fields.find(t=>t.field_id === 3872304) ? pData.fields.find(t=>t.field_id === 3872304).val : '';
            if (clip2EndTime !== '') {
                clipInfo += "<strong>End time:</strong> " + clip2EndTime + "<br>\n";
            }
            let clip2EndDescription = pData.fields.find(t=>t.field_id === 3872303) ? pData.fields.find(t=>t.field_id === 3872303).val : '';
            if (clip2EndDescription !== '') {
                clipInfo += "<strong>End description:</strong> " + clip2EndDescription + "<br>\n";
            }
        }
        let isThirdClip = pData.fields.find(t=>t.field_id === 3868466) ? pData.fields.find(t=>t.field_id === 3868466).val : '';
        if (isThirdClip === 'Yes, please show me more fields') {
            clipInfo += "\n<h4>Clip 3</h4>\n<p>";
            let clip3StartTime = pData.fields.find(t=>t.field_id === 3868468) ? pData.fields.find(t=>t.field_id === 3868468).val : '';
            if (clip3StartTime !== '') {
                clipInfo += "<strong>Start time:</strong> " + clip3StartTime + "<br>\n";
            }
            let clip3StartDescription = pData.fields.find(t=>t.field_id === 3868469) ? pData.fields.find(t=>t.field_id === 3868469).val : '';
            if (clip3StartDescription !== '') {
                clipInfo += "<strong>Start description:</strong> " + clip3StartDescription + "<br>\n";
            }
            let clip3EndTime = pData.fields.find(t=>t.field_id === 3872305) ? pData.fields.find(t=>t.field_id === 3872305).val : '';
            if (clip3EndTime !== '') {
                clipInfo += "<strong>End time:</strong> " + clip3EndTime + "<br>\n";
            }
            let clip3EndDescription = pData.fields.find(t=>t.field_id === 3872306) ? pData.fields.find(t=>t.field_id === 3872306).val : '';
            if (clip3EndDescription !== '') {
                clipInfo += "<strong>End description:</strong> " + clip3EndDescription + "<br>\n";
            }
        }
        // Create comments output.
        let comments = pData.fields.find(t=>t.field_id === 3877039) ? pData.fields.find(t=>t.field_id === 3877039).val : '';
        if (comments !== '') {
            clipInfo += "<strong>Comments and additional information, if needed:</strong><br>\n" + comments + "<br>\n";
        }
        clipInfo += "</p><br>\n";
    
        // Prepare email content for Library staff
        libraryOptions.subject = (courseTerm && (courseTerm !== "Make a selection")) ? courseTerm + ' - ' : '';
        libraryOptions.subject += 'CLIPPING';
        libraryOptions.from = '"' + name + '" <' + emailAddress + '>';
        if (yourName && (yourName !== '') && yourEmailAddress && (yourEmailAddress !== '')) {
            libraryOptions.cc = '"' + yourName + '" <' + yourEmailAddress + '>';
        }
        libraryOptions.replyTo = emailAddress;
        libraryOptions.to = 'lib-reserves@virginia.edu';
        let reqText = "<br>\n<br>\n<br>\n<strong>req #: </strong>" + reqId;
        libraryOptions.html = adminMsg + requestorInfo + courseInfo + videoInfo +clipInfo + reqText;
        libraryOptions.text = stripHtml(adminMsg + requestorInfo + courseInfo + videoInfo +clipInfo + reqText).result;
    
        // Prepare email confirmation content for patron
        patronOptions.subject = (courseTerm && (courseTerm !== "Make a selection")) ? courseTerm + ' - ' : '';
        patronOptions.subject += 'CLIPPING';
        patronOptions.to = emailAddress;
        patronOptions.html = patronMsg + requestorInfo + courseInfo + videoInfo +clipInfo + reqText;
        patronOptions.text = stripHtml(patronMsg + requestorInfo + courseInfo + videoInfo +clipInfo + reqText).result;
    
        try {
            console.log(`Prepared email options for request ID: ${reqId}`);
            console.log(JSON.stringify(libraryOptions));
            console.log('---');
            console.log(JSON.stringify(patronOptions));
            return postEmail(reqId, libraryOptions, patronOptions);
        }
        catch (error) {
            console.log(`error: ${JSON.stringify(error)}`);
            return error;
        }
        // **VIDEO CLIP REQUEST FORM END
    } else {
        console.log(`Warning: ${FORMNAME} form submission without any fields in it.`);
        return Promise.resolve({ success: false, message: 'No form fields found' });
    }
};