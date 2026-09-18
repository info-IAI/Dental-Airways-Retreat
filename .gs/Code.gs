function onFormSubmit(e) {

  // Get form response data
  var responses = e.namedValues;
  var firstName = responses["First Name"] ? responses["First Name"][0] : "";
  var lastName = responses["Last Name"] ? responses["Last Name"][0] : "";
  var email = responses["Email Address"] ? responses["Email Address"][0] : "";
  var phone = responses["Phone Number"] ? responses["Phone Number"][0] : "";
  var practice = responses["Practice Name"] ? responses["Practice Name"][0] : "";
  var location = responses["Practice Location (City, State)"] ? responses["Practice Location (City, State)"][0] : "";
  var specialty = responses["Dental Specialty"] ? responses["Dental Specialty"][0] : "";
  var fullName = firstName + " " + lastName;

  // --- EMAIL TO ATTENDEE ---
  var attendeeSubject = "Thank you for your interest — Integrated Airway Institute Breathe Retreat";

  var attendeeBody = "Dear " + fullName + ",\n\n" +
    "Thank you for your interest in the Breathe Dental Airway Retreat. " +
    "We have received your registration and will be in touch within 24-48 hours " +
    "to confirm your seat and provide next steps.\n\n" +
    "Here is a summary of your submission:\n" +
    "  Name: " + fullName + "\n" +
    "  Practice: " + practice + "\n" +
    "  Location: " + location + "\n" +
    "  Specialty: " + specialty + "\n\n" +
    "To secure your seat, please complete your payment using the link below:\n" +
    "[PASTE YOUR HELCIM PAYMENT LINK HERE]\n\n" +
    "If you have any questions, please reply to this email or contact us at " +
    "info@integratedairwayinstitute.com\n\n" +
    "We look forward to welcoming you,\n" +
    "The Integrated Airway Institute Team\n" +
    "integratedairwayinstitute.com";

  MailApp.sendEmail({
    to: email,
    subject: attendeeSubject,
    body: attendeeBody,
    name: "Integrated Airway Institute",
    replyTo: "info@integratedairwayinstitute.com"
  });

  // --- EMAIL TO ADMIN ---
  var adminSubject = "New Retreat Registration — " + fullName;

  var adminBody = "A new registration has been submitted:\n\n" +
    "Name: " + fullName + "\n" +
    "Email: " + email + "\n" +
    "Phone: " + phone + "\n" +
    "Practice: " + practice + "\n" +
    "Location: " + location + "\n" +
    "Specialty: " + specialty + "\n\n" +
    "Next steps:\n" +
    "1. Review registration in Google Sheets\n" +
    "2. Confirm payment received in Helcim dashboard\n" +
    "3. Send seat confirmation email\n" +
    "View all registrations:\n" +
    "[PASTE YOUR GOOGLE SHEET LINK HERE]";

  MailApp.sendEmail({
    to: "info@integratedairwayinstitute.com",
    subject: adminSubject,
    body: adminBody
  });
}

// ─────────────────────────────────────────────────────────────────────────
// NEW: doPost() — added so the native registration form on the live site
// (the fetch() call in deploy-prep.js) has something to hit. This is a
// separate entry point from onFormSubmit above, which only fires for the
// old Google Form trigger. This function does not touch or depend on
// onFormSubmit in any way — it is safe to add without affecting the
// existing email automation.
//
// What it does when the site's registration form submits:
//   1. Parses the JSON the form sent
//   2. Appends a new row to the first sheet in this spreadsheet
//   3. Sends the same two emails (attendee + admin) as onFormSubmit does
//
// IMPORTANT — before you rely on this in production:
//   - Check that "sheet.getSheets()[0]" below is actually the tab you want
//     registrations recorded to. If your registrations should go to a
//     specific tab (e.g. "Form Responses 1"), change that line to:
//       var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('YOUR TAB NAME');
//   - Test it once with a real submission from the live site (or Postman)
//     before trusting it for real registrants, then check the Sheet and
//     both inboxes to confirm everything arrived correctly.
// ─────────────────────────────────────────────────────────────────────────
function doPost(e) {
  try {
    var data = JSON.parse(e.postData.contents);

    var firstName = data["First Name"] || "";
    var lastName = data["Last Name"] || "";
    var email = data["Email Address"] || "";
    var phone = data["Phone Number"] || "";
    var practice = data["Practice Name"] || "";
    var city = data["City"] || "";
    var state = data["State"] || "";
    var location = city + (state ? ", " + state : "");
    var specialty = data["Dental Specialty"] || "";
    var howHeard = data["How did you hear about us?"] || "";
    var questions = data["Questions or Comments"] || "";
    var fullName = firstName + " " + lastName;

    // 1. Record the registration in the Sheet
    var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheets()[0];
    sheet.appendRow([
      new Date(),
      firstName,
      lastName,
      email,
      phone,
      practice,
      city,
      state,
      specialty,
      howHeard,
      questions
    ]);

    // 2. Email to attendee
    var attendeeSubject = "Thank you for your interest — Integrated Airway Institute Breathe Retreat";
    var attendeeBody = "Dear " + fullName + ",\n\n" +
      "Thank you for your interest in the Breathe Dental Airway Retreat. " +
      "We have received your registration and will be in touch within 24-48 hours " +
      "to confirm your seat and provide next steps.\n\n" +
      "Here is a summary of your submission:\n" +
      "  Name: " + fullName + "\n" +
      "  Practice: " + practice + "\n" +
      "  Location: " + location + "\n" +
      "  Specialty: " + specialty + "\n\n" +
      "To secure your seat, please complete your payment using the link below:\n" +
      "[PASTE YOUR HELCIM PAYMENT LINK HERE]\n\n" +
      "If you have any questions, please reply to this email or contact us at " +
      "info@integratedairwayinstitute.com\n\n" +
      "We look forward to welcoming you,\n" +
      "The Integrated Airway Institute Team\n" +
      "integratedairwayinstitute.com";

    MailApp.sendEmail({
      to: email,
      subject: attendeeSubject,
      body: attendeeBody,
      name: "Integrated Airway Institute",
      replyTo: "info@integratedairwayinstitute.com"
    });

    // 3. Email to admin
    var adminSubject = "New Retreat Registration — " + fullName;
    var adminBody = "A new registration has been submitted through the website:\n\n" +
      "Name: " + fullName + "\n" +
      "Email: " + email + "\n" +
      "Phone: " + phone + "\n" +
      "Practice: " + practice + "\n" +
      "Location: " + location + "\n" +
      "Specialty: " + specialty + "\n" +
      "How they heard about us: " + howHeard + "\n" +
      "Questions/comments: " + questions + "\n\n" +
      "Next steps:\n" +
      "1. Review registration in Google Sheets\n" +
      "2. Confirm payment received in Helcim dashboard\n" +
      "3. Send seat confirmation email";

    MailApp.sendEmail({
      to: "info@integratedairwayinstitute.com",
      subject: adminSubject,
      body: adminBody
    });

    return ContentService
      .createTextOutput(JSON.stringify({ status: "success" }))
      .setMimeType(ContentService.MimeType.JSON);

  } catch (err) {
    return ContentService
      .createTextOutput(JSON.stringify({ status: "error", message: err.message }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}
