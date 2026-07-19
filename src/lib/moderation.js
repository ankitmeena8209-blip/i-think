// Profanity set for content moderation
const PROFANITY_SET = new Set([
  'badword', 'abuse', 'hate', 'slur', 'nazi', 'racist', 'kill', 'terrorist',
  'bitch', 'bastard', 'fuck', 'shit', 'cunt', 'asshole', 'dick', 'pussy',
  'cock', 'motherfucker', 'whore', 'slut', 'nigger', 'faggot', 'retard'
]);

export const descriptiveWords = [
  "Silent", "Golden", "Ancient", "Wandering", "Bright", "Hidden", "Cosmic", "Mystic", "Distant", "Gentle",
  "Wild", "Quiet", "Radiant", "Serene", "Brave", "Starlight", "Solar", "Lunar", "Infinite", "Noble",
  "Crystal", "Silver", "Crimson", "Amber", "Velvet", "Emerald", "Sapphire", "Shadow", "Echoing", "Restless",
  "Humble", "Vibrant", "Timeless", "Keen", "Swiftest", "Steady", "Peaceful", "Radiant", "Vivid", "Calm",
  "Bold", "Pure", "Dreaming", "Rising", "Fading", "Shining", "Gliding", "Glowing", "Soaring", "Floating"
];

export const natureWords = [
  "River", "Echo", "Forest", "Mountain", "Lantern", "Compass", "Voyager", "Ocean", "Cloud", "Phoenix",
  "Harbor", "Peak", "Comet", "Feather", "Stone", "Valley", "Garden", "Bridge", "Flame", "Horizon",
  "Meadow", "Stream", "Glade", "Ridge", "Summit", "Canyon", "Island", "Haven", "Beacon", "Pillar",
  "Spire", "Tower", "Arch", "Gate", "Path", "Trail", "Road", "Way", "Journey", "Passage",
  "Voyage", "Flight", "Orbit", "Star", "Moon", "Sun", "Nebula", "Galaxy", "Cosmos", "Aurora"
];

/**
 * Validates a single word for username creation.
 * Rules: Only letters A-Z, 3-15 characters, no spaces, no symbols, no profanity.
 */
export function validateWord(word) {
  if (typeof word !== 'string') return { valid: false, reason: 'Word must be text.' };
  
  const trimmed = word.trim();
  if (trimmed.length < 3 || trimmed.length > 15) {
    return { valid: false, reason: 'Each word must be between 3 and 15 characters.' };
  }

  if (!/^[a-zA-Z]+$/.test(trimmed)) {
    return { valid: false, reason: 'Words can only contain letters (A–Z), no numbers, spaces or symbols.' };
  }

  if (PROFANITY_SET.has(trimmed.toLowerCase())) {
    return { valid: false, reason: 'Words containing offensive language are not allowed.' };
  }

  return { valid: true };
}

/**
 * Capitalizes first letter of a word and lowercases the rest.
 */
export function capitalizeWord(word) {
  if (!word) return '';
  const clean = word.trim().replace(/[^a-zA-Z]/g, '');
  if (!clean) return '';
  return clean.charAt(0).toUpperCase() + clean.slice(1).toLowerCase();
}

/**
 * Checks if a string contains any profane words.
 */
export function containsProfanity(text) {
  if (!text) return false;
  const normalized = text.toLowerCase().replace(/[^a-z0-9\s]/g, ' ');
  const tokens = normalized.split(/\s+/);
  return tokens.some(token => PROFANITY_SET.has(token));
}

/**
 * Sanitizes text content.
 */
export function sanitizeText(text) {
  if (typeof text !== 'string') return '';
  return text
    .trim()
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
