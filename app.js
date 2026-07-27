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

  function parseTime(timeString) {
    const match = String(timeString || "").trim().match(/^(\d{1,2}):(\d{2})$/);
    if (!match) {
      throw new Error("Calendar time must use H:MM or HH:MM format, for example 9:00 or 09:00.");
    }
    const hour = Number(match[1]);
    const minute = Number(match[2]);
    if (hour < 0 || hour > 23 || minute < 0 || minute > 59) {
      throw new Error("The calendar time is invalid.");
    }
    return { hour, minute };
  }

  function parseDateParts(dateString) {
    const match = String(dateString || "").trim().match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (!match) {
      throw new Error("Calendar dates must use YYYY-MM-DD format.");
    }
    const year = Number(match[1]);
    const month = Number(match[2]);
    const day = Number(match[3]);
    const date = new Date(year, month - 1, day);
    if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) {
      throw new Error("A calendar date is invalid.");
    }
    return { year, month, day };
  }

  function formatIcsLocal(year, month, day, hour, minute, second = 0) {
    return `${String(year).padStart(4, "0")}${String(month).padStart(2, "0")}${String(day).padStart(2, "0")}T${String(hour).padStart(2, "0")}${String(minute).padStart(2, "0")}${String(second).padStart(2, "0")}`;
  }

  function addMinutes(parts, minutesToAdd) {
    const date = new Date(parts.year, parts.month - 1, parts.day, parts.hour, parts.minute, 0, 0);
    date.setMinutes(date.getMinutes() + minutesToAdd);
    return {
      year: date.getFullYear(),
      month: date.getMonth() + 1,
      day: date.getDate(),
      hour: date.getHours(),
      minute: date.getMinutes()
    };
  }

  function inclusiveDayCount(startDate, endDate) {
    const startParts = parseDateParts(startDate);
    const endParts = parseDateParts(endDate);
    const start = Date.UTC(startParts.year, startParts.month - 1, startParts.day);
    const end = Date.UTC(endParts.year, endParts.month - 1, endParts.day);
    const days = Math.floor((end - start) / 86400000) + 1;
    if (!Number.isFinite(days) || days < 1) {
      throw new Error("The calendar end date must be on or after the start date.");
    }
    return days;
  }

  function utcStamp() {
    return new Date().toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z");
  }

  function buildIcs(surveyUrl) {
    const cal = config.calendar || {};
    const dateParts = parseDateParts(cal.startDate);
    const timeParts = parseTime(cal.time || "09:00");
    const duration = Number.isFinite(Number(cal.durationMinutes)) ? Number(cal.durationMinutes) : 10;
    const reminder = Number.isFinite(Number(cal.reminderMinutesBefore)) ? Number(cal.reminderMinutesBefore) : 10;
    if (duration <= 0) throw new Error("Calendar duration must be greater than zero.");
    if (reminder < 0) throw new Error("Reminder minutes cannot be negative.");

    const startParts = { ...dateParts, ...timeParts };
    const endParts = addMinutes(startParts, duration);
    const start = formatIcsLocal(startParts.year, startParts.month, startParts.day, startParts.hour, startParts.minute);
    const end = formatIcsLocal(endParts.year, endParts.month, endParts.day, endParts.hour, endParts.minute);
    const count = inclusiveDayCount(cal.startDate, cal.endDate);
    const uidSafe = participantId.replace(/[^A-Za-z0-9._-]/g, "-");
    const title = cal.title || "Complete today's survey";
    const description = `${cal.description || "Open your personal daily survey using the link below."}\n\n${surveyUrl}`;

    // Floating local times intentionally omit TZID. Each phone schedules the
    // reminder at the displayed local clock time, which imports more reliably
    // across Apple Calendar, Google Calendar, Outlook, and Samsung Calendar.
    return [
      "BEGIN:VCALENDAR",
      "VERSION:2.0",
      "CALSCALE:GREGORIAN",
      "METHOD:PUBLISH",
      "PRODID:-//CIMC Study//Daily Survey Reminder//EN",
      "BEGIN:VEVENT",
      `UID:${uidSafe}-daily-survey@cimc-study`,
      `DTSTAMP:${utcStamp()}`,
      `DTSTART:${start}`,
      `DTEND:${end}`,
      `RRULE:FREQ=DAILY;COUNT=${count}`,
      `SUMMARY:${escapeIcs(title)}`,
      `DESCRIPTION:${escapeIcs(description)}`,
      `URL:${escapeIcs(surveyUrl)}`,
      "STATUS:CONFIRMED",
      "TRANSP:TRANSPARENT",
      "SEQUENCE:0",
      "BEGIN:VALARM",
      `TRIGGER:-PT${reminder}M`,
      "ACTION:DISPLAY",
      `DESCRIPTION:${escapeIcs(title)}`,
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

  function renderQr(elementId, text, size = 184) {
    const node = document.getElementById(elementId);
    node.innerHTML = "";
    new QRCode(node, {
      text,
      width: size,
      height: size,
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
    document.getElementById("infoPanel").hidden = false;
    document.getElementById("calendarButton").addEventListener("click", () => downloadCalendar(surveyUrl));

    renderQr("surveyQr", surveyUrl);
    renderQr("calendarQr", calendarLandingUrl);
    renderQr("infoQr", infoUrl, 104);
    content.hidden = false;

    if (action === "calendar") {
      window.setTimeout(() => downloadCalendar(surveyUrl), 300);
    }
  } catch (error) {
    showError(error.message || "The page could not be loaded.");
  }
})();
