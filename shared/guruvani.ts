export const GURU_VANI: string[] = [
  "Peace, contentment and joy is ingrained in every one of us. The Guru alone can unlock this treasure for us.",
  "Do not be disheartened by the spiritual darkness in the world around you. If you feel earnestly the urgency of escaping from the cycle of birth and death, seek your Guru.",
  "When the Sun sets and the darkness of night envelops the land, you don't stop your work, do you? Don't you light a lamp and get on with your normal activities? Likewise, ignore the spiritual gloom around and seek out a guiding torch, the realized Guru, who is waiting to help you.",
  "Surrender yourself entirely to a Guru. He will lead you to the goal.",
  "Even all-knowing Avatara Purushas sought out a Guru to conform to tradition and to convey the importance of the Guru. Sri Rama, Sri Krishna and Sri Adi Shankara Bhagavatpada sought Sri Vasishtha, Sri Sandeepani, and Sri Govindapada respectively.",
  "The Guru works only for the benefit of the world. He will never have any sense of doership or enjoyership. Hence a seeker should approach Him alone for guidance.",
  "A Guru is necessary to prescribe the particular course of action, sanctioned by the Shastras and suited to the disciple's qualification.",
  "Even a second of one's life can never be obtained again. If the entire life as a human is spent solely on sense pleasures, what greater loss can there ever be?",
  "The Lord has given a human birth. Do not wail when death is at the doorstep. Use the human birth well and achieve its purpose by taking to the spiritual path early.",
  "Do not waste time in frivolous pursuits. Orient yourself, under the guidance of the Guru, towards the goal of life elucidated in the Shastras.",
  "Birth as a human being is because of antecedent merits. Even then, following the established practices of one's elders and conducting oneself along the Vedic path are rare indeed. Make good use of such a precious human birth and attain Shreyas (greater good).",
  "Make the best use of this body by doing Seva to the Guru with a focussed mind and in a spirit of surrender.",
];

export const GURU_VANI_ATTRIBUTION =
  "Jagadguru Shankaracharya Sri Sri Bharati Tirtha Mahasannidhanam";

/**
 * Deterministic fallback quote for a given yyyy-mm-dd date, used when an admin
 * has not scheduled a Guruvani for that date.
 */
export function getFallbackGuruvani(dateStr: string): string {
  const start = Date.UTC(2025, 0, 1);
  const parsed = Date.parse(`${dateStr}T00:00:00Z`);
  const base = Number.isNaN(parsed) ? Date.now() : parsed;
  const dayIndex = Math.floor((base - start) / 86400000);
  const len = GURU_VANI.length;
  const idx = (((dayIndex + 3) % len) + len) % len;
  return GURU_VANI[idx];
}
