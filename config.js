window.STUDY_CONFIG = {
  // Kobo web-form URL, without query parameters.
  surveyBaseUrl: "https://ee.kobotoolbox.org/x/REPLACE_WITH_FORM_ID",

  // Name of the field to prefill in the daily survey.
  participantFieldName: "participant_id",

  // Public URL of the participant information sheet (PDF or webpage).
  informationSheetUrl: "https://example.org/participant-information-sheet.pdf",

  // Calendar event settings. Use local study time.
  calendar: {
    title: "Complete today's survey",
    description: "Open your personal daily survey using the link below.",
    startDate: "2026-08-01",
    endDate: "2026-08-14",
    time: "19:00",
    durationMinutes: 10,
    reminderMinutesBefore: 10,
    timezone: "Europe/Paris"
  },

  // Query-string parameter used by this landing page.
  landingPageIdParameter: "id"
};
