window.STUDY_CONFIG = {
  // Kobo web-form URL, without query parameters.
  surveyBaseUrl: "https://ee.kobotoolbox.org/x/qhhvo3WA",

  // Name of the field to prefill in the daily survey.
  participantFieldName: "uniqueid",

  // Participant information-sheet page. The participant ID is added as ?id=...
  informationSheetBaseUrl: "https://salomegarnier.github.io/cimc_study/",

  // Calendar event settings. Use local study time.
  calendar: {
    title: "Complete today's survey",
    description: "Open your personal daily survey using the link below.",
    startDate: "2026-08-01",
    endDate: "2026-08-14",
    time: "9:00",
    durationMinutes: 10,
    reminderMinutesBefore: 10,
    timezone: "Europe/Paris"
  },

  // Query-string parameter used by this landing page.
  landingPageIdParameter: "id"
};
