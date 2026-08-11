const manifestPath = "cv.json";
    const iconMap = {
      "Experience": '<i class="fa-solid fa-briefcase"></i>',
      "Education": '<i class="fa-solid fa-graduation-cap"></i>',
      "Grants": '<i class="fa-solid fa-scroll"></i>',
      "Publications": '<i class="fa-solid fa-newspaper"></i>',
      "Presentations": '<i class="fa-solid fa-person-chalkboard"></i>',
      "Awards": '<i class="fa-solid fa-award"></i>',
      "Service": '<i class="fa-solid fa-hand-holding"></i>',
      "Professional Memberships": '<i class="fa-solid fa-user-tie"></i>',
      "Courses Taught": '<i class="fa-solid fa-chalkboard-user"></i>',
    };
    const sectionOrder = [
      "Education",
      "Experience",
      "Grants",
      "Awards",
      "Publications",
      "Presentations",
      "Service",
      "Professional Memberships",
      "Courses Taught"
    ];
    const monthIndex = {
      jan: 0, january: 0,
      feb: 1, february: 1,
      mar: 2, march: 2,
      apr: 3, april: 3,
      may: 4,
      jun: 5, june: 5,
      jul: 6, july: 6,
      aug: 7, august: 7,
      sep: 8, sept: 8, september: 8,
      oct: 9, october: 9,
      nov: 10, november: 10,
      dec: 11, december: 11
    };

    const content = document.querySelector("#cvContent");
    const status = document.querySelector("#status");

    loadCv();

    async function loadCv() {
      try {
        const manifest = await fetchJson(manifestPath);
        const sections = await Promise.all(
          manifest.map(async (section) => ({
            type: section.type,
            entries: await fetchJson(section.file)
          }))
        );

        sections.sort((left, right) => {
          return sectionOrder.indexOf(left.type) - sectionOrder.indexOf(right.type);
        });
        content.replaceChildren(...sections.map(renderSection));
      } catch (error) {
        status.hidden = false;
        status.textContent = `${error.message}. If you opened this file directly, run a local server in this folder so the browser can load the JSON files.`;
      }
    }

    async function fetchJson(path) {
      const response = await fetch(path, { cache: "no-store" });
      if (!response.ok) {
        throw new Error(`Could not load ${path}`);
      }
      return response.json();
    }

    function renderSection(section) {
      const sectionElement = document.createElement("section");
      sectionElement.className = `section section--${createClassName(section.type)}`;

      const heading = document.createElement("div");
      heading.className = "section-heading";
      heading.innerHTML = `
        <span class="section-icon" aria-hidden="true">${iconMap[section.type] || section.type.charAt(0)}</span>
        <h2>${escapeHtml(section.type)}</h2>
      `;

      const entries = section.entries.slice().sort(sortNewestFirst);
      const body = document.createElement("div");
      body.className = section.type === "Courses Taught" ? "course-columns" : "timeline";

      if (section.type === "Courses Taught") {
        body.append(...renderCourseColumns(groupCourseEntries(entries)));
      } else {
        entries.forEach((entry) => {
          body.append(renderTimelineItem(entry));
        });
      }

      sectionElement.append(heading, body);
      return sectionElement;
    }

    function renderCourseColumns(entries) {
      const splitIndex = Math.ceil(entries.length / 2);
      return [entries.slice(0, splitIndex), entries.slice(splitIndex)].map((columnEntries) => {
        const column = document.createElement("div");
        column.className = "timeline course-column";
        columnEntries.forEach((entry) => {
          column.append(renderCourseItem(entry));
        });
        return column;
      });
    }

    function groupCourseEntries(entries) {
      const courses = new Map();

      entries.forEach((entry) => {
        const event = String(entry.event || "").trim();
        if (!courses.has(event)) {
          courses.set(event, {
            event,
            description: String(entry.description || "").trim(),
            dates: []
          });
        }

        courses.get(event).dates.push({
          start: entry.start,
          end: entry.end,
          label: formatCourseRange(entry.start, entry.end),
          sortValue: dateValue(entry.start, false)
        });
      });

      return Array.from(courses.values())
        .map((course) => ({
          ...course,
          dates: course.dates.sort((left, right) => right.sortValue - left.sortValue)
        }))
        .sort(sortCourses);
    }

    function sortCourses(left, right) {
      const leftParts = parseCourseCode(left.event);
      const rightParts = parseCourseCode(right.event);
      return courseInstitutionPriority(left.description) - courseInstitutionPriority(right.description)
        || leftParts.prefix.localeCompare(rightParts.prefix)
        || leftParts.number - rightParts.number
        || left.event.localeCompare(right.event);
    }

    function courseInstitutionPriority(description) {
      const normalized = String(description || "").toLowerCase();
      if (normalized.includes("baylor university")) {
        return 0;
      }
      if (normalized.includes("uc davis") || normalized.includes("university of california")) {
        return 1;
      }
      if (normalized.includes("university of west florida")) {
        return 2;
      }
      return 3;
    }

    function parseCourseCode(value) {
      const normalized = String(value || "").trim();
      const variableMatch = normalized.match(/^([A-Za-z]{1,3})\s*(\d)[A-Za-z](\d{2})/);
      const match = normalized.match(/^([A-Za-z]{1,3})\s*(\d{1,4})/);

      if (variableMatch) {
        return {
          prefix: variableMatch[1].toUpperCase(),
          number: Number(`${variableMatch[2]}999`)
        };
      }

      return {
        prefix: match ? match[1].toUpperCase() : normalized.slice(0, 3).toUpperCase(),
        number: match ? Number(match[2]) : Number.POSITIVE_INFINITY
      };
    }

    function renderCourseItem(course) {
      const item = document.createElement("article");
      item.className = "timeline-item course-item";
      item.innerHTML = `
        <h3 class="item-title">${formatInline(course.event)}</h3>
        ${course.description ? `<p class="item-body">${formatDescription(course.description)}</p>` : ""}
        <ul class="course-dates">
          ${course.dates.map((date) => `<li>${escapeHtml(date.label)}</li>`).join("")}
        </ul>
      `;
      return item;
    }

    function renderTimelineItem(entry) {
      const item = document.createElement("article");
      item.className = "timeline-item";
      item.innerHTML = `
        <div class="date">${escapeHtml(formatRange(entry.start, entry.end))}</div>
        <div>
          <h3 class="item-title">${formatInline(entry.event)}</h3>
          ${entry.description ? `<p class="item-body">${formatDescription(entry.description)}</p>` : ""}
        </div>
      `;
      return item;
    }

    function createClassName(value) {
      return String(value || "")
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "");
    }

    function sortNewestFirst(left, right) {
      return dateValue(right.end, true) - dateValue(left.end, true)
        || dateValue(right.start, false) - dateValue(left.start, false);
    }

    function dateValue(value, isEndDate) {
      if (value?.present) {
        return Number.POSITIVE_INFINITY;
      }
      const year = Number(value?.year);
      if (!Number.isFinite(year)) {
        return Number.NEGATIVE_INFINITY;
      }
      const month = parseMonth(value?.month);
      return year * 12 + (month ?? (isEndDate ? 11 : 0));
    }

    function parseMonth(value) {
      const key = String(value || "").trim().toLowerCase();
      return Object.prototype.hasOwnProperty.call(monthIndex, key) ? monthIndex[key] : null;
    }

    function formatRange(start, end) {
      const startLabel = formatDate(start);
      const endLabel = formatDate(end);
      return startLabel === endLabel ? startLabel : `${startLabel} - ${endLabel}`;
    }

    function formatCourseRange(start, end) {
      const startLabel = formatDate(start);
      const endLabel = formatDate(end);
      return startLabel === endLabel ? startLabel : `${startLabel}-${endLabel}`;
    }

    function formatDate(value) {
      if (value?.present) {
        return "Present";
      }

      const year = value?.year;
      const month = value?.month;
      if (month && year) {
        return `${month} ${year}`;
      }
      return year ? String(year) : "Date unavailable";
    }

    function formatInline(value) {
      return applyMarkup(escapeHtml(String(value || ""))).replace(/\n/g, " ");
    }

    function formatDescription(value) {
      return applyMarkup(escapeHtml(String(value || "").replace(/\\n/g, "\n"))).replace(/\n/g, "<br>");
    }

    function applyMarkup(value) {
      return value
        .replace(/\\bf\{([^{}]*)\}/g, "<strong>$1</strong>")
        .replace(/\\it\{([^{}]*)\}/g, "<em>$1</em>")
        .replace(/\\ite\{([^{}]*)\}/g, "<em>$1</em>");
    }

    function escapeHtml(value) {
      return value
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;");
    }
