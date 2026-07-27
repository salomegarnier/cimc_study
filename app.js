(() => {
  "use strict";

  const config = window.STUDY_CONFIG;
  const params = new URLSearchParams(window.location.search);
  const idParam = config.landingPageIdParameter || "id";
  const participantId = (params.get(idParam) || "").trim();
  const action = params.get("action");

  const errorBox = document.getElementById("errorBox");
  const content = document.getElementById("content");

  function showError(message) {
    errorBox.textContent = message;
    errorBox.hidden = false;
    content.hidden = true;
  }

  function validateConfig() {
    if (!config || !config.surveyBaseUrl || !config.participantFieldName || !config.informationSheetUrl) {
      throw new Error("The landing page configuration is incomplete.");
    }
    if (config.surveyBaseUrl.includes("REPLACE_WITH_FORM_ID")) {
      throw new Error("Replace the placeholder Kobo form URL in config.js before publishing this page.");
    }
  }

  function buildSurveyUrl() {
    const url = new URL(config.surveyBaseUrl);
    url.searchParams.set(`d[${config.participantFieldName}]`, participantId);
    return url.toString();
  }

  function buildCalendarLandingUrl() {
    const url = new URL(window.location.href);
    url.search = "";
    url.searchParams.set(idParam, participantId);
    url.searchParams.set("action", "calendar");
    return url.toString();
  }

  function escapeIcs(value) {
    return String(value)
      .replace(/\\/g, "\\\\")
      .replace(/\r?\n/g, "\\n")
      .replace(/,/g, "\\,")
      .replace(/;/g, "\\;");
  }

  function compactDate(dateString, timeString) {
    return `${dateString.replaceAll("-", "")}T${timeString.replace(":", "")}00`;
  }

  function endDateTime(dateString, timeString, durationMinutes) {
    const date = new Date(`${dateString}T${timeString}:00`);
    date.setMinutes(date.getMinutes() + durationMinutes);
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, "0");
    const d = String(date.getDate()).padStart(2, "0");
    const hh = String(date.getHours()).padStart(2, "0");
    const mm = String(date.getMinutes()).padStart(2, "0");
    return `${y}${m}${d}T${hh}${mm}00`;
  }

  function utcStamp() {
    return new Date().toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z");
  }

  function buildIcs(surveyUrl) {
    const cal = config.calendar;
    const start = compactDate(cal.startDate, cal.time);
    const end = endDateTime(cal.startDate, cal.time, cal.durationMinutes);
    const until = `${cal.endDate.replaceAll("-", "")}T235959`;
    const uidSafe = participantId.replace(/[^A-Za-z0-9._-]/g, "-");
    const description = `${cal.description}\n\n${surveyUrl}`;

    return [
      "BEGIN:VCALENDAR",
      "VERSION:2.0",
      "CALSCALE:GREGORIAN",
      "METHOD:PUBLISH",
      "PRODID:-//Study Team//Daily Survey Reminder//EN",
      "BEGIN:VEVENT",
      `UID:${uidSafe}-daily-survey@study`,
      `DTSTAMP:${utcStamp()}`,
      `DTSTART;TZID=${cal.timezone}:${start}`,
      `DTEND;TZID=${cal.timezone}:${end}`,
      `RRULE:FREQ=DAILY;UNTIL=${until}`,
      `SUMMARY:${escapeIcs(cal.title)}`,
      `DESCRIPTION:${escapeIcs(description)}`,
      `URL:${escapeIcs(surveyUrl)}`,
      "BEGIN:VALARM",
      `TRIGGER:-PT${Number(cal.reminderMinutesBefore)}M`,
      "ACTION:DISPLAY",
      `DESCRIPTION:${escapeIcs(cal.title)}`,
      "END:VALARM",
      "END:VEVENT",
      "END:VCALENDAR",
      ""
    ].join("\r\n");
  }

  function downloadCalendar(surveyUrl) {
    const blob = new Blob([buildIcs(surveyUrl)], { type: "text/calendar;charset=utf-8" });
    const downloadUrl = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = downloadUrl;
    a.download = "daily-survey-reminders.ics";
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(downloadUrl), 1000);
  }

  function renderQr(elementId, text) {
    const node = document.getElementById(elementId);
    node.innerHTML = "";
    new QRCode(node, {
      text,
      width: 184,
      height: 184,
      correctLevel: QRCode.CorrectLevel.M
    });
  }

  try {
    validateConfig();
    if (!participantId) {
      showError(`This page needs a participant ID. Open it using a link ending in ?${idParam}=YOUR_ID.`);
      return;
    }

    const surveyUrl = buildSurveyUrl();
    const calendarLandingUrl = buildCalendarLandingUrl();
    const infoUrl = config.informationSheetUrl;

    document.getElementById("surveyButton").href = surveyUrl;
    document.getElementById("surveyLinkText").textContent = surveyUrl;
    document.getElementById("calendarLinkText").textContent = calendarLandingUrl;
    document.getElementById("infoButton").href = infoUrl;
    document.getElementById("infoLinkText").textContent = infoUrl;
    document.getElementById("calendarButton").addEventListener("click", () => downloadCalendar(surveyUrl));

    renderQr("surveyQr", surveyUrl);
    renderQr("calendarQr", calendarLandingUrl);
    renderQr("infoQr", infoUrl);
    content.hidden = false;

    if (action === "calendar") {
      window.setTimeout(() => downloadCalendar(surveyUrl), 300);
    }
  } catch (error) {
    showError(error.message || "The page could not be loaded.");
  }
})();
