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
    if (!config || !config.surveyBaseUrl || !config.participantFieldName || !config.informationSheetBaseUrl) {
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

  function buildInformationSheetUrl() {
    const url = new URL(config.informationSheetBaseUrl);
    url.searchParams.set("id", participantId);
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

  function parseLocalDate(dateString, timeString = "00:00") {
    const [year, month, day] = dateString.split("-").map(Number);
    const [hour, minute] = timeString.split(":").map(Number);
    return new Date(year, month - 1, day, hour, minute, 0, 0);
  }

  function formatLocalDateTime(date) {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, "0");
    const d = String(date.getDate()).padStart(2, "0");
    const hh = String(date.getHours()).padStart(2, "0");
    const mm = String(date.getMinutes()).padStart(2, "0");
    const ss = String(date.getSeconds()).padStart(2, "0");
    return `${y}${m}${d}T${hh}${mm}${ss}`;
  }

  function inclusiveDayCount(startDate, endDate) {
    const start = parseLocalDate(startDate);
    const end = parseLocalDate(endDate);
    const days = Math.floor((end - start) / 86400000) + 1;
    if (!Number.isFinite(days) || days < 1) {
      throw new Error("The calendar end date must be on or after the start date.");
    }
    return days;
  }

  function utcStamp() {
    return new Date().toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z");
  }

  function timezoneComponent(timezone) {
    // This definition covers Europe/Paris, including daylight-saving transitions.
    // Other timezones are still accepted by many calendar apps through TZID, but
    // can be added here if stricter Outlook compatibility is required.
    if (timezone !== "Europe/Paris") return [];
    return [
      "BEGIN:VTIMEZONE",
      "TZID:Europe/Paris",
      "X-LIC-LOCATION:Europe/Paris",
      "BEGIN:DAYLIGHT",
      "TZOFFSETFROM:+0100",
      "TZOFFSETTO:+0200",
      "TZNAME:CEST",
      "DTSTART:19700329T020000",
      "RRULE:FREQ=YEARLY;BYMONTH=3;BYDAY=-1SU",
      "END:DAYLIGHT",
      "BEGIN:STANDARD",
      "TZOFFSETFROM:+0200",
      "TZOFFSETTO:+0100",
      "TZNAME:CET",
      "DTSTART:19701025T030000",
      "RRULE:FREQ=YEARLY;BYMONTH=10;BYDAY=-1SU",
      "END:STANDARD",
      "END:VTIMEZONE"
    ];
  }

  function buildIcs(surveyUrl) {
    const cal = config.calendar;
    const startDate = parseLocalDate(cal.startDate, cal.time);
    const endDate = new Date(startDate.getTime());
    endDate.setMinutes(endDate.getMinutes() + Number(cal.durationMinutes));
    const start = compactDate(cal.startDate, cal.time);
    const end = formatLocalDateTime(endDate);
    const count = inclusiveDayCount(cal.startDate, cal.endDate);
    const uidSafe = participantId.replace(/[^A-Za-z0-9._-]/g, "-");
    const description = `${cal.description}\n\n${surveyUrl}`;
    const timezone = cal.timezone || "Europe/Paris";

    return [
      "BEGIN:VCALENDAR",
      "VERSION:2.0",
      "CALSCALE:GREGORIAN",
      "METHOD:PUBLISH",
      "PRODID:-//Study Team//Daily Survey Reminder//EN",
      `X-WR-CALNAME:${escapeIcs(cal.title)}`,
      `X-WR-TIMEZONE:${escapeIcs(timezone)}`,
      ...timezoneComponent(timezone),
      "BEGIN:VEVENT",
      `UID:${uidSafe}-daily-survey@study.example.org`,
      `DTSTAMP:${utcStamp()}`,
      `DTSTART;TZID=${timezone}:${start}`,
      `DTEND;TZID=${timezone}:${end}`,
      `RRULE:FREQ=DAILY;COUNT=${count}`,
      `SUMMARY:${escapeIcs(cal.title)}`,
      `DESCRIPTION:${escapeIcs(description)}`,
      `URL:${escapeIcs(surveyUrl)}`,
      "STATUS:CONFIRMED",
      "TRANSP:TRANSPARENT",
      "SEQUENCE:0",
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
    a.rel = "noopener";
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(downloadUrl), 10000);
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
    const infoUrl = buildInformationSheetUrl();

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
