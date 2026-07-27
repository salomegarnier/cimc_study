# Kobo participant landing page

A static GitHub Pages site that reads a participant ID from the URL and creates:

- a personalized Kobo daily-survey link;
- a downloadable recurring `.ics` calendar reminder containing that link;
- a personalized link to the participant information sheet;
- QR codes for all three items.

The information-sheet link is generated as:

`https://salomegarnier.github.io/cimc_study/?id=PARTICIPANT_ID`

The participant ID is processed in the browser. The site does not send it to a QR-code generation service.

## 1. Configure the site

Edit `config.js`:

- Replace `surveyBaseUrl` with the deployed Kobo web-form URL.
- Set `participantFieldName` to the name of the ID field in the daily survey.
- Set `informationSheetBaseUrl` to the participant information-sheet page. The landing page automatically appends the participant ID as `?id=...`.
- Set the calendar dates, time, duration, reminder time, and timezone.

The ID field in the daily survey can be hidden and is prefilled using Kobo's `d[field_name]` URL parameter.

## 2. Publish with GitHub Pages

1. Create a new public or private GitHub repository, according to the Pages options available to your organization.
2. Upload all files in this folder to the repository root.
3. In GitHub, open **Settings > Pages**.
4. Under **Build and deployment**, choose **Deploy from a branch**.
5. Select the `main` branch and `/ (root)` folder, then save.
6. GitHub will provide a URL such as:

   `https://YOUR-USERNAME.github.io/YOUR-REPOSITORY/`

Test the page with:

`https://YOUR-USERNAME.github.io/YOUR-REPOSITORY/?id=TEST123`

## 3. Link to it from the Kobo enrollment form

Create a calculate question in the enrollment XLSForm:

```text
concat('https://YOUR-USERNAME.github.io/YOUR-REPOSITORY/?id=', encode-for-uri(${participant_id}))
```

For example:

| type | name | label | calculation |
|---|---|---|---|
| text | participant_id | Participant ID | |
| calculate | participant_page_url | | `concat('https://YOUR-USERNAME.github.io/YOUR-REPOSITORY/?id=', encode-for-uri(${participant_id}))` |
| note | participant_links | Open your personal study page: [Study links](${participant_page_url}) | |

Depending on the form renderer, test whether `encode-for-uri()` is supported. If participant IDs contain only letters, numbers, hyphens, and underscores, a direct `concat()` is sufficient.

## Calendar QR-code behavior

A QR code cannot contain the temporary browser-generated `.ics` file itself. The calendar QR therefore points to the landing page with `action=calendar`. When scanned, the page regenerates and downloads the personalized calendar file on the participant's phone.

## Privacy and security

- Use a random, non-identifying participant token.
- Do not include names, health information, or meaningful identifiers in the URL.
- Anyone with the personal link may be able to submit using that participant ID unless the survey includes additional safeguards.
- Use neutral calendar titles because reminders may appear on a lock screen.
- Host the information sheet at a stable public HTTPS URL.

## QR library

This template loads QRCode.js from cdnjs. The QR contents are generated locally in the browser; the participant URLs are not sent to the CDN. To remove the external dependency, download `qrcode.min.js`, place it beside `app.js`, and change the script source in `index.html` to `qrcode.min.js`.

## Calendar compatibility note

The calendar file uses an inclusive daily `COUNT` recurrence rather than an `UNTIL` value. This avoids a common import failure caused by mixing a local timezone start with a non-UTC `UNTIL` date. A `VTIMEZONE` definition is included for `Europe/Paris` for stronger Apple Calendar and Outlook compatibility.

On iPhone, participants may need to tap **Open in Calendar** after downloading. On some Android phones, the downloaded file opens through the phone's calendar or file manager rather than directly inside the Google Calendar app.
