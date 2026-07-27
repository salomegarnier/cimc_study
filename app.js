(() => {
  "use strict";

  const config = window.STUDY_CONFIG;
  const params = new URLSearchParams(window.location.search);
  const idParam = config.landingPageIdParameter || "id";
  const participantId = (params.get(idParam) || "").trim();
  const action = params.get("action");

  const errorBox = document.getElementById("errorBox");
  const content = document.getElementById("content");


  const browserOptions = {
    ios: [
      { value: "safari-ios", label: "Safari" },
      { value: "chrome-ios", label: "Chrome" },
      { value: "firefox-ios", label: "Firefox" }
    ],
    android: [
      { value: "chrome-android", label: "Chrome" },
      { value: "edge-android", label: "Edge" },
      { value: "firefox-android", label: "Firefox" },
      { value: "samsung-android", label: "Samsung Internet" },
      { value: "opera-android", label: "Opera" }
    ]
  };

  const homeScreenInstructions = {
    "safari-ios": [
      "Tap the three dots in the bottom-right corner to open the browser menu.",
      "Tap the Share icon.",
      "Tap Add to Home Screen."
    ],
    "chrome-ios": [
      "Tap the Share icon in the top corner of the screen.",
      "Tap View more.",
      "Tap Add to Home Screen."
    ],
    "firefox-ios": [
      "Tap the Share icon in the bottom corner of the screen.",
      "Tap View more.",
      "Tap Add to Home Screen."
    ],
    "chrome-android": [
      "Tap the three vertical dots in the top-right corner to open the browser menu.",
      "Tap Install and create shortcut."
    ],
    "edge-android": [
      "Tap the three stacked lines in the top-right corner to open the browser menu.",
      "Tap Add to phone."
    ],
    "firefox-android": [
      "Tap the three vertical dots in the top-right corner to open the browser menu.",
      "Tap More.",
      "Tap Add to Home Screen."
    ],
    "samsung-android": [
      "Tap the three vertical dots in the top-right corner to open the browser menu.",
      "Tap Add page to.",
      "Select Home screen."
    ],
    "opera-android": [
      "Tap the three vertical dots in the top-right corner to open the browser menu.",
      "Tap Add to… .",
      "Select Home screen."
    ]
  };

  function setupHomeScreenInstructions(dailySurveyUrl, monthlySurveyUrl) {
    const deviceSelect = document.getElementById("deviceSelect");
    const browserSelect = document.getElementById("browserSelect");
    const instructionsBox = document.getElementById("homeScreenInstructions");

    function hideInstructions() {
      instructionsBox.hidden = true;
      instructionsBox.replaceChildren();
    }

    function updateBrowserOptions() {
      const device = deviceSelect.value;
      browserSelect.replaceChildren();
      hideInstructions();

      const placeholder = document.createElement("option");
      placeholder.value = "";
      placeholder.textContent = device ? "Select a browser" : "Select a device first";
      browserSelect.appendChild(placeholder);

      for (const option of browserOptions[device] || []) {
        const element = document.createElement("option");
        element.value = option.value;
        element.textContent = option.label;
        browserSelect.appendChild(element);
      }

      browserSelect.disabled = !device;
    }

    function showInstructions() {
      const browserSteps = homeScreenInstructions[browserSelect.value];
      hideInstructions();
      if (!browserSteps) return;

      const intro = document.createElement("p");
      intro.textContent = "To save the questionnaires to your phone for easy access:";

      const list = document.createElement("ol");

      const dailyItem = document.createElement("li");
      dailyItem.append("Open the daily form in your browser. ");
      const dailyLink = document.createElement("a");
      dailyLink.href = dailySurveyUrl;
      dailyLink.textContent = "Add this";
      dailyLink.target = "_blank";
      dailyLink.rel = "noopener";
      dailyItem.appendChild(dailyLink);
      list.appendChild(dailyItem);

      for (const step of browserSteps) {
        const item = document.createElement("li");
        item.textContent = step;
        list.appendChild(item);
      }

      const monthlyItem = document.createElement("li");
      monthlyItem.append("Repeat these steps with the ");
      const monthlyLink = document.createElement("a");
      monthlyLink.href = monthlySurveyUrl;
      monthlyLink.textContent = "monthly form";
      monthlyLink.target = "_blank";
      monthlyLink.rel = "noopener";
      monthlyItem.append(monthlyLink, ".");
      list.appendChild(monthlyItem);

      instructionsBox.append(intro, list);
      instructionsBox.hidden = false;
    }

    deviceSelect.addEventListener("change", updateBrowserOptions);
    browserSelect.addEventListener("change", showInstructions);
  }

  function showError(message) {
    errorBox.textContent = message;
    errorBox.hidden = false;
    content.hidden = true;
  }

  function validateConfig() {
    if (!config || !config.surveyBaseUrl || !config.monthlySurveyBaseUrl || !config.participantFieldName || !config.informationSheetBaseUrl) {
      throw new Error("The landing page configuration is incomplete.");
    }
    if (config.surveyBaseUrl.includes("REPLACE_WITH_FORM_ID")) {
      throw new Error("Replace the placeholder Kobo form URL in config.js before publishing this page.");
    }
  }

  function buildPersonalizedSurveyUrl(baseUrl) {
    const url = new URL(baseUrl);
    url.searchParams.set(`d[${config.participantFieldName}]`, participantId);
    return url.toString();
  }

  function buildSurveyUrl() {
    return buildPersonalizedSurveyUrl(config.surveyBaseUrl);
  }

  function buildMonthlySurveyUrl() {
    return buildPersonalizedSurveyUrl(config.monthlySurveyBaseUrl);
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

  function buildEvent({ eventType, surveyUrl, recurrence, calendarConfig }) {
    const cal = calendarConfig || {};
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
    const uidSafe = participantId.replace(/[^A-Za-z0-9._-]/g, "-");
    const title = cal.title || (eventType === "monthly" ? "Complete this month's survey" : "Complete today's survey");
    const description = `${cal.description || "Open your personal survey using the link below."}\n\n${surveyUrl}`;

    return [
      "BEGIN:VEVENT",
      `UID:${uidSafe}-${eventType}-survey@cimc-study`,
      `DTSTAMP:${utcStamp()}`,
      `DTSTART:${start}`,
      `DTEND:${end}`,
      `RRULE:${recurrence}`,
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
      "END:VEVENT"
    ];
  }

  function buildIcs(dailySurveyUrl, monthlySurveyUrl) {
    const dailyCal = config.calendar || {};
    const monthlyCal = config.monthlyCalendar || {};
    const dailyCount = inclusiveDayCount(dailyCal.startDate, dailyCal.endDate);
    const monthlyCount = Number.isFinite(Number(monthlyCal.count)) && Number(monthlyCal.count) > 0
      ? Math.floor(Number(monthlyCal.count))
      : 12;

    const dailyEvent = buildEvent({
      eventType: "daily",
      surveyUrl: dailySurveyUrl,
      recurrence: `FREQ=DAILY;COUNT=${dailyCount}`,
      calendarConfig: dailyCal
    });

    const monthlyEvent = buildEvent({
      eventType: "monthly",
      surveyUrl: monthlySurveyUrl,
      recurrence: `FREQ=MONTHLY;COUNT=${monthlyCount}`,
      calendarConfig: monthlyCal
    });

    // Floating local times omit TZID, so each participant's calendar imports
    // both reminders at 9:00 in the phone's local timezone.
    return [
      "BEGIN:VCALENDAR",
      "VERSION:2.0",
      "CALSCALE:GREGORIAN",
      "METHOD:PUBLISH",
      "PRODID:-//CIMC Study//Survey Reminders//EN",
      ...dailyEvent,
      ...monthlyEvent,
      "END:VCALENDAR",
      ""
    ].join("\r\n");
  }

  function downloadCalendar(dailySurveyUrl, monthlySurveyUrl) {
    const blob = new Blob([buildIcs(dailySurveyUrl, monthlySurveyUrl)], { type: "text/calendar;charset=utf-8" });
    const downloadUrl = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = downloadUrl;
    a.download = "study-survey-reminders.ics";
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
    const monthlySurveyUrl = buildMonthlySurveyUrl();
    const calendarLandingUrl = buildCalendarLandingUrl();
    const infoUrl = buildInformationSheetUrl();

    document.getElementById("surveyButton").href = surveyUrl;
    document.getElementById("monthlySurveyButton").href = monthlySurveyUrl;
    document.getElementById("infoPanel").hidden = false;
    document.getElementById("calendarButton").addEventListener("click", () => downloadCalendar(surveyUrl, monthlySurveyUrl));

    renderQr("surveyQr", surveyUrl);
    renderQr("monthlySurveyQr", monthlySurveyUrl);
    renderQr("calendarQr", calendarLandingUrl);
    renderQr("infoQr", infoUrl, 104);
    setupHomeScreenInstructions(surveyUrl, monthlySurveyUrl);
    content.hidden = false;

    if (action === "calendar") {
      window.setTimeout(() => downloadCalendar(surveyUrl, monthlySurveyUrl), 300);
    }
  } catch (error) {
    showError(error.message || "The page could not be loaded.");
  }
})();
