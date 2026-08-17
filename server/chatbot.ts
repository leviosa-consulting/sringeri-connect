const SRINGERI_API_URL = process.env.VITE_SRINGERI_API_URL || "https://dsspv2.lcpl.in";
const SRINGERI_API_KEY = process.env.SRINGERI_API_KEY;

interface CacheEntry {
  data: any;
  fetchedAt: number;
}

const cache: Record<string, CacheEntry> = {};
const CACHE_TTL = 30 * 60 * 1000;

function parseApiResponse(text: string): any {
  const jsonStart = text.indexOf('[');
  const jsonStartObj = text.indexOf('{');
  const start = jsonStart !== -1 && (jsonStartObj === -1 || jsonStart < jsonStartObj) ? jsonStart : jsonStartObj;
  if (start !== -1) {
    return JSON.parse(text.substring(start));
  }
  return JSON.parse(text);
}

async function fetchAndCache(key: string, url: string): Promise<any> {
  const existing = cache[key];
  if (existing && Date.now() - existing.fetchedAt < CACHE_TTL) {
    return existing.data;
  }

  try {
    const response = await fetch(url, {
      headers: {
        "Content-Type": "application/json",
        ...(SRINGERI_API_KEY && { "X-API-Key": SRINGERI_API_KEY }),
      },
    });

    if (!response.ok) return existing?.data || null;

    const text = await response.text();
    const data = parseApiResponse(text);
    cache[key] = { data, fetchedAt: Date.now() };
    return data;
  } catch {
    return existing?.data || null;
  }
}

async function getDonationHeadings(): Promise<any[]> {
  return (await fetchAndCache("donationHeadings", `${SRINGERI_API_URL}/api/donationHeading`)) || [];
}

async function getDonationCategories(): Promise<any[]> {
  return (await fetchAndCache("donationCategories", `${SRINGERI_API_URL}/api/donationCategory`)) || [];
}

async function getAccommodationInventory(): Promise<any[]> {
  return (await fetchAndCache("accommodation", `${SRINGERI_API_URL}/api/onlineInventory`)) || [];
}

async function getTodayDetails(): Promise<any> {
  const today = new Date();
  const dateStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
  return (await fetchAndCache(`todayDetails-${dateStr}`, `${SRINGERI_API_URL}/api/todayDetails/${dateStr}`)) || {};
}

export function setEventsCache(events: any[]) {
  cache["events"] = { data: events, fetchedAt: Date.now() };
}

export function setAnnouncementsCache(announcements: any[]) {
  cache["announcements"] = { data: announcements, fetchedAt: Date.now() };
}

function getCachedEvents(): any[] {
  const entry = cache["events"];
  if (entry && Date.now() - entry.fetchedAt < CACHE_TTL) {
    return entry.data || [];
  }
  return [];
}

function getCachedAnnouncements(): any[] {
  const entry = cache["announcements"];
  if (entry && Date.now() - entry.fetchedAt < CACHE_TTL) {
    return entry.data || [];
  }
  return [];
}

const MONTH_NAMES: Record<string, number> = {
  jan: 1, january: 1, feb: 2, february: 2, mar: 3, march: 3,
  apr: 4, april: 4, may: 5, jun: 6, june: 6,
  jul: 7, july: 7, aug: 8, august: 8, sep: 9, september: 9,
  oct: 10, october: 10, nov: 11, november: 11, dec: 12, december: 12,
  februaray: 2, feburary: 2, febuary: 2, janury: 1, augst: 8,
  septmber: 9, ocotber: 10, novmber: 11, decmber: 12,
};

function parseDateFromMessage(message: string): { date: string; dispDate: string } | "invalid" | null {
  const cleaned = message.toLowerCase().replace(/[,]/g, ' ').replace(/\s+/g, ' ').trim();
  const currentYear = new Date().getFullYear();

  let day: number | null = null;
  let month: number | null = null;
  let year: number = currentYear;

  const ddmmyyyySlash = cleaned.match(/(\d{1,2})[\/\-](\d{1,2})(?:[\/\-](\d{2,4}))?/);
  if (ddmmyyyySlash) {
    day = parseInt(ddmmyyyySlash[1]);
    month = parseInt(ddmmyyyySlash[2]);
    if (ddmmyyyySlash[3]) {
      year = parseInt(ddmmyyyySlash[3]);
      if (year < 100) year += 2000;
    }
  }

  if (!day || !month) {
    const ordinalMonth = cleaned.match(/(\d{1,2})(?:st|nd|rd|th)?\s+(?:of\s+)?([a-z]+)(?:\s+(\d{4}))?/);
    if (ordinalMonth) {
      day = parseInt(ordinalMonth[1]);
      const monthStr = ordinalMonth[2];
      month = MONTH_NAMES[monthStr] ?? null;
      if (ordinalMonth[3]) year = parseInt(ordinalMonth[3]);
    }
  }

  if (!day || !month) {
    const monthDay = cleaned.match(/([a-z]+)\s+(\d{1,2})(?:st|nd|rd|th)?(?:\s+(\d{4}))?/);
    if (monthDay) {
      const monthStr = monthDay[1];
      const parsedMonth = MONTH_NAMES[monthStr];
      if (parsedMonth) {
        month = parsedMonth;
        day = parseInt(monthDay[2]);
        if (monthDay[3]) year = parseInt(monthDay[3]);
      }
    }
  }

  if (!day || !month) {
    const hasDateHint = /\d/.test(cleaned) || Object.keys(MONTH_NAMES).some(m => cleaned.includes(m));
    if (hasDateHint) return "invalid";
    return null;
  }

  if (day < 1 || day > 31 || month < 1 || month > 12) return "invalid";

  const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  const dispDate = `${String(day).padStart(2, '0')}-${String(month).padStart(2, '0')}-${year}`;

  const testDate = new Date(year, month - 1, day);
  if (testDate.getDate() !== day || testDate.getMonth() !== month - 1) return "invalid";

  return { date: dateStr, dispDate };
}

type Intent = "greeting" | "donation" | "accommodation" | "panchanga" | "events" | "announcements" | "services" | "contact" | "help" | "unknown";

const INTENT_PATTERNS: { intent: Intent; patterns: RegExp[] }[] = [
  {
    intent: "greeting",
    patterns: [
      /^(hi|hello|namaste|namaskar|hey|namaskara|vanakkam|good\s*(morning|afternoon|evening))/i,
      /^(jai|hare|om|shri)/i,
    ],
  },
  {
    intent: "donation",
    patterns: [
      /donat/i, /kanike/i, /contribut/i, /give|giving/i, /80\s*g/i,
      /offer/i, /dana|daan/i, /guru\s*kanike/i, /seva.*donat/i,
      /how.*donat/i, /where.*donat/i, /what.*donat/i,
      /malahanikareshwara/i, /vajrotsava/i, /preservation/i,
    ],
  },
  {
    intent: "accommodation",
    patterns: [
      /accommodat/i, /room/i, /stay/i, /book.*room/i, /yatri\s*nivas/i,
      /guest\s*house/i, /lodge|lodging/i, /hotel/i, /where.*stay/i,
      /availab.*room/i, /tariff|rate|price|cost.*room/i, /check.?in|check.?out/i,
    ],
  },
  {
    intent: "panchanga",
    patterns: [
      /panchang/i, /tithi/i, /nakshatra/i, /today.*special/i,
      /calendar/i, /masa|maas/i, /samvatsara/i, /rashi/i,
      /ekadashi/i, /amavasya|pournami|purnima/i, /what.*today/i,
      /sandhya\s*kala/i, /muhurta/i,
    ],
  },
  {
    intent: "events",
    patterns: [
      /event/i, /festival/i, /celebrat/i, /utsav/i, /function/i,
      /upcoming/i, /program/i, /schedule/i, /when.*next/i,
      /mahashivarat/i, /navaratri/i, /rathotsava/i,
    ],
  },
  {
    intent: "announcements",
    patterns: [
      /announce/i, /news/i, /update/i, /latest/i, /notice/i,
      /what.*new/i, /recent.*update/i,
    ],
  },
  {
    intent: "services",
    patterns: [
      /service/i, /seva/i, /pooja|puja/i, /what.*can.*do/i,
      /feature/i, /what.*offer/i, /what.*available/i,
      /book.*seva/i, /how.*use/i, /help.*with/i,
      /bhajan/i, /stotra/i, /magazine/i, /bookstore|book\s*store/i,
    ],
  },
  {
    intent: "contact",
    patterns: [
      /contact/i, /phone/i, /email/i, /address/i, /reach/i,
      /location/i, /direction/i, /how.*get.*there/i, /where.*sringeri/i,
      /office/i, /timing/i, /hour/i, /open/i,
    ],
  },
  {
    intent: "help",
    patterns: [
      /help/i, /how.*work/i, /what.*can.*you/i, /guide/i,
      /tell.*about/i, /explain/i, /how.*do.*i/i,
    ],
  },
];

function detectIntent(message: string): Intent {
  const cleaned = message.trim().toLowerCase();
  for (const { intent, patterns } of INTENT_PATTERNS) {
    for (const pattern of patterns) {
      if (pattern.test(cleaned)) {
        return intent;
      }
    }
  }
  return "unknown";
}

async function buildGreetingResponse(): Promise<string> {
  return "Namaste! 🙏 I am Sringeri Sahayak, your assistant for Sri Sringeri Sharada Peetham services.\n\nI can help you with:\n• **Donations** — donation categories, causes, and how to donate\n• **Accommodation** — room availability and booking details\n• **Today's Panchanga** — tithi, nakshatra, and calendar info\n• **Events** — upcoming festivals and programs\n• **Announcements** — latest news and notices\n• **Services** — sevas, bookstore, bhajans, and more\n\nWhat would you like to know about?";
}

async function buildDonationResponse(): Promise<string> {
  const [headings, categories] = await Promise.all([
    getDonationHeadings(),
    getDonationCategories(),
  ]);

  let response = "Here are the donation options available at Sri Sringeri Sharada Peetham:\n\n";

  if (headings.length > 0) {
    response += "**Donation Centers:**\n";
    headings.forEach((h: any) => {
      response += `• ${h.heading || h.name || h.donationHeading || "Center"}\n`;
    });
    response += "\n";
  }

  if (categories.length > 0) {
    response += "**Donation Causes:**\n";
    categories.forEach((c: any) => {
      const name = c.category || c.name || c.donationCategory || "";
      const is80g = c.is80g || c.is80G;
      if (name) {
        response += `• ${name}${is80g ? " (80G eligible)" : ""}\n`;
      }
    });
    response += "\n";
  }

  response += "You can make a donation through the **Donation** section in the app. Tap the ❤️ Donation icon on the home page to get started.\n\n";
  response += "_Some donations qualify for 80G tax benefits under Indian Income Tax Act._";

  return response;
}

async function buildAccommodationResponse(requestedDate?: { date: string; dispDate: string } | null): Promise<string> {
  const inventory = await getAccommodationInventory();

  let response = "**Accommodation at Sringeri — Yatri Nivas**\n\n";

  if (Array.isArray(inventory) && inventory.length > 0) {
    let targetEntry: any = null;

    if (requestedDate) {
      targetEntry = inventory.find((d: any) => d.date === requestedDate.date || d.dispDate === requestedDate.dispDate);
      if (!targetEntry) {
        response += `⚠️ No availability data found for **${requestedDate.dispDate}**. The accommodation system only shows availability for the next few days.\n\n`;
        response += "Please check the **Accommodation** section in the app to search for your preferred dates.\n\n";
        response += "📌 **How to book:** Go to the **Accommodation** section from the home page, select your dates, choose a room type, and complete the booking.\n\n";
        response += "📋 **Requirements:** A valid government ID (Aadhaar preferred) is required for booking.";
        return response;
      }
    } else {
      targetEntry = inventory.find((d: any) => d.availability && d.availability.length > 0);
    }

    if (targetEntry && targetEntry.availability && targetEntry.availability.length > 0) {
      response += `**Room Types (availability for ${targetEntry.dispDate}):**\n`;
      targetEntry.availability.forEach((room: any) => {
        const name = room.dispName || room.roomType || room.name || "";
        const rent = room.rent || room.tariff || "";
        const available = room.available ?? "";
        if (name) {
          response += `• **${name}**`;
          if (rent) response += ` — ₹${rent}/day`;
          if (available !== "") response += ` (${available} rooms available)`;
          response += "\n";
        }
      });
      response += "\n";
    } else if (targetEntry) {
      response += `No rooms available for **${targetEntry.dispDate}**. All rooms may be booked for this date.\n\n`;
    } else {
      response += "No rooms currently available for the nearest dates. Please check the Accommodation section for other dates.\n\n";
    }
  } else {
    response += "Room availability information is currently being loaded. Please check the Accommodation section in the app for live availability.\n\n";
  }

  response += "📌 **How to book:** Go to the **Accommodation** section from the home page, select your dates, choose a room type, and complete the booking.\n\n";
  response += "📋 **Requirements:** A valid government ID (Aadhaar preferred) is required for booking.";

  return response;
}

function buildInvalidDateResponse(): string {
  return "I couldn't understand that date format. Could you please try again with a format like:\n\n" +
    "• **18 February** or **18th Feb**\n" +
    "• **Feb 18** or **February 18**\n" +
    "• **18/02** or **18-02-2026**\n\n" +
    "Or you can check availability directly in the **Accommodation** section of the app.";
}

async function buildPanchangaResponse(): Promise<string> {
  const details = await getTodayDetails();

  let response = "**Today's Panchanga Details** 🙏\n\n";

  if (details && (details.tithi || details.nakshatra || details.samvatsara)) {
    if (details.todayWebsiteEnglish) {
      response += `${details.todayWebsiteEnglish}\n\n`;
    }
    if (details.todayWebsiteKannada) {
      response += `${details.todayWebsiteKannada}\n\n`;
    }

    const fields = [
      { label: "Samvatsara", en: details.samvatsara, kn: details.samvatsaraK },
      { label: "Chandra Masa", en: details.chandraMasa, kn: details.chandraMasaK },
      { label: "Tithi", en: details.tithi, kn: details.tithiK },
      { label: "Nakshatra", en: details.nakshatra, kn: details.nakshatraK },
    ];

    fields.forEach(f => {
      if (f.en || f.kn) {
        response += `• **${f.label}:** ${f.en || ""}${f.kn ? ` (${f.kn})` : ""}\n`;
      }
    });

    if (details.occasion || details.occasionK) {
      response += `\n🎉 **Special Occasion:** ${details.occasion || ""}${details.occasionK ? ` (${details.occasionK})` : ""}\n`;
    }

    response += "\nFor detailed Sandhya Kala timings, visit [Sandhya Kala](https://sandhyakala.vercel.app/).";
  } else {
    response += "Panchanga details are being loaded. You can see today's panchanga on the home page, or visit [Sandhya Kala](https://sandhyakala.vercel.app/) for detailed timings.";
  }

  return response;
}

async function buildEventsResponse(): Promise<string> {
  const events = getCachedEvents();

  let response = "**Upcoming Events & Programs** 📅\n\n";

  if (events.length > 0) {
    const recentEvents = events.slice(0, 5);
    recentEvents.forEach((e: any) => {
      response += `• **${e.title}**`;
      if (e.date) response += ` — ${e.date}`;
      if (e.location) response += ` (${e.location})`;
      response += "\n";
      if (e.description) {
        response += `  _${e.description.substring(0, 100)}_\n`;
      }
    });

    if (events.length > 5) {
      response += `\n...and ${events.length - 5} more events.`;
    }

    response += "\n\nView all events in the **Events & News** section of the app.";
  } else {
    response += "Event information is currently being loaded. Please check the **Events & News** section in the app for the latest updates.";
  }

  return response;
}

async function buildAnnouncementsResponse(): Promise<string> {
  const announcements = getCachedAnnouncements();

  let response = "**Latest Announcements** 📢\n\n";

  if (announcements.length > 0) {
    const recent = announcements.slice(0, 5);
    recent.forEach((a: any) => {
      response += `• **${a.title}**`;
      if (a.date) response += ` — ${a.date}`;
      response += "\n";
      if (a.description) {
        response += `  _${a.description.substring(0, 100)}_\n`;
      }
    });

    if (announcements.length > 5) {
      response += `\n...and ${announcements.length - 5} more announcements.`;
    }
  } else {
    response += "No recent announcements at the moment. Please check the home page for the latest updates.";
  }

  return response;
}

function buildServicesResponse(): string {
  return "**Services Available** 🙏\n\n" +
    "**Online Services:**\n" +
    "• **Seva Booking** — Perform poojas and sevas remotely or in-person\n" +
    "• **Donation (Kanike)** — Contribute to the Math's charitable activities\n" +
    "• **Accommodation** — Book your stay at Yatri Nivas\n" +
    "• **Bookstore** — Order spiritual books and publications at [books.sringeri.net](https://books.sringeri.net)\n\n" +
    "**Resources:**\n" +
    "• **Bhajans & Audio** — Listen to divine stotras and bhajans at [bhajan.sringeri.net](https://bhajan.sringeri.net)\n" +
    "• **Magazines** — Access monthly spiritual magazines at [magazines.sringeri.net](https://magazines.sringeri.net)\n" +
    "• **Stotras** — Sacred stotras collection at [sringeri.net/stotras](https://www.sringeri.net/stotras)\n" +
    "• **Sandhya Kala** — Daily timings at [sandhyakala.vercel.app](https://sandhyakala.vercel.app)\n\n" +
    "Navigate using the icons on the home page to access any service.";
}

function buildContactResponse(): string {
  return "**Sri Sringeri Sharada Peetham** 🙏\n\n" +
    "📍 **Location:** Sringeri, Chikkamagaluru District, Karnataka, India — 577139\n\n" +
    "📞 **Contact:**\n" +
    "• Phone: +91-8265-250220\n" +
    "• Email: info@sringeri.net\n\n" +
    "🌐 **Website:** [www.sringeri.net](https://www.sringeri.net)\n\n" +
    "🕐 **Temple Timings:**\n" +
    "• Morning: 6:00 AM – 12:00 PM\n" +
    "• Evening: 4:00 PM – 9:00 PM\n\n" +
    "📺 **YouTube:** [Sringeri Sharada Peetham](https://www.youtube.com/@SringeriSharadaPeetham)\n\n" +
    "_For specific queries, please contact the office directly._";
}

function buildHelpResponse(): string {
  return "I can help you with information available in this app. Here's what you can ask me about:\n\n" +
    "🎯 **Quick topics:**\n" +
    "• \"What donations are available?\" — See donation categories and causes\n" +
    "• \"Is accommodation available?\" — Check room types and availability\n" +
    "• \"What is today's tithi?\" — Get today's panchanga details\n" +
    "• \"Any upcoming events?\" — See upcoming festivals and programs\n" +
    "• \"Latest announcements\" — Recent news and notices\n" +
    "• \"What services are available?\" — All online services and resources\n" +
    "• \"Contact details\" — Phone, email, and temple timings\n\n" +
    "You can also use the quick-reply buttons below for common topics.\n\n" +
    "_I only provide verified information from official Sringeri Sharada Peetham data._";
}

function buildUnknownResponse(): string {
  return "I'm sorry, I don't have specific information about that. I can help you with:\n\n" +
    "• **Donations** — categories, causes, 80G benefits\n" +
    "• **Accommodation** — room availability and booking\n" +
    "• **Panchanga** — today's tithi, nakshatra, and calendar\n" +
    "• **Events** — upcoming festivals and programs\n" +
    "• **Announcements** — latest news\n" +
    "• **Services** — sevas, bookstore, bhajans, stotras\n" +
    "• **Contact** — phone, email, temple timings\n\n" +
    "Please try one of these topics, or contact the Sringeri office directly for other queries.";
}

/**
 * Compact snapshot of every fact this app can vouch for, assembled from the
 * same deterministic builders the keyword bot uses. The AI bot is told to
 * answer only from this text, which keeps it grounded in official data.
 */
export async function buildGroundingContext(): Promise<string> {
  const [donation, accommodation, panchanga, events, announcements] = await Promise.all([
    buildDonationResponse().catch(() => ""),
    buildAccommodationResponse(null).catch(() => ""),
    buildPanchangaResponse().catch(() => ""),
    buildEventsResponse().catch(() => ""),
    buildAnnouncementsResponse().catch(() => ""),
  ]);

  const sections: [string, string][] = [
    ["DONATIONS", donation],
    ["ACCOMMODATION (today's availability)", accommodation],
    ["TODAY'S PANCHANGA", panchanga],
    ["UPCOMING EVENTS", events],
    ["ANNOUNCEMENTS", announcements],
    ["SERVICES", buildServicesResponse()],
    ["CONTACT & TIMINGS", buildContactResponse()],
  ];

  return sections
    .filter(([, body]) => body.trim().length > 0)
    .map(([title, body]) => `### ${title}\n${body}`)
    .join("\n\n");
}

let lastIntent: Intent = "unknown";

export async function handleChatMessage(message: string): Promise<{ reply: string; intent: Intent; suggestedActions?: { label: string; action: string }[] }> {
  let intent = detectIntent(message);

  if (intent === "unknown") {
    const parsedDate = parseDateFromMessage(message);
    if (parsedDate !== null) {
      intent = "accommodation";
    }
  }

  let reply: string;
  let suggestedActions: { label: string; action: string }[] | undefined;

  switch (intent) {
    case "greeting":
      reply = await buildGreetingResponse();
      suggestedActions = [
        { label: "Donations", action: "donation" },
        { label: "Accommodation", action: "accommodation" },
        { label: "Today's Panchanga", action: "panchanga" },
        { label: "Events", action: "events" },
      ];
      break;
    case "donation":
      reply = await buildDonationResponse();
      suggestedActions = [
        { label: "Make a Donation", action: "navigate:/donation" },
        { label: "Accommodation", action: "accommodation" },
        { label: "Events", action: "events" },
      ];
      break;
    case "accommodation": {
      const parsedDate = parseDateFromMessage(message);
      if (parsedDate === "invalid") {
        reply = buildInvalidDateResponse();
        suggestedActions = [
          { label: "Book Accommodation", action: "navigate:/accommodation" },
          { label: "Donations", action: "donation" },
          { label: "Events", action: "events" },
        ];
      } else {
        reply = await buildAccommodationResponse(parsedDate);
        suggestedActions = [
          { label: "Book Accommodation", action: "navigate:/accommodation" },
          { label: "Donations", action: "donation" },
          { label: "Events", action: "events" },
        ];
      }
      break;
    }
    case "panchanga":
      reply = await buildPanchangaResponse();
      suggestedActions = [
        { label: "Events", action: "events" },
        { label: "Donations", action: "donation" },
        { label: "Services", action: "services" },
      ];
      break;
    case "events":
      reply = await buildEventsResponse();
      suggestedActions = [
        { label: "View All Updates", action: "navigate:/updates" },
        { label: "Announcements", action: "announcements" },
        { label: "Donations", action: "donation" },
      ];
      break;
    case "announcements":
      reply = await buildAnnouncementsResponse();
      suggestedActions = [
        { label: "Events", action: "events" },
        { label: "Services", action: "services" },
        { label: "Donations", action: "donation" },
      ];
      break;
    case "services":
      reply = buildServicesResponse();
      suggestedActions = [
        { label: "Make a Donation", action: "navigate:/donation" },
        { label: "Book Accommodation", action: "navigate:/accommodation" },
        { label: "Events", action: "events" },
      ];
      break;
    case "contact":
      reply = buildContactResponse();
      suggestedActions = [
        { label: "Services", action: "services" },
        { label: "Donations", action: "donation" },
        { label: "Events", action: "events" },
      ];
      break;
    case "help":
      reply = buildHelpResponse();
      suggestedActions = [
        { label: "Donations", action: "donation" },
        { label: "Accommodation", action: "accommodation" },
        { label: "Today's Panchanga", action: "panchanga" },
        { label: "Events", action: "events" },
      ];
      break;
    default:
      reply = buildUnknownResponse();
      suggestedActions = [
        { label: "Donations", action: "donation" },
        { label: "Accommodation", action: "accommodation" },
        { label: "Panchanga", action: "panchanga" },
        { label: "Events", action: "events" },
      ];
      break;
  }

  lastIntent = intent;
  return { reply, intent, suggestedActions };
}
