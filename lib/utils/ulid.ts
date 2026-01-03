const ENCODING = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";
const TIME_LENGTH = 10;
const RANDOM_LENGTH = 16;

function encodeTime(timeMs: number) {
  let time = timeMs;
  const chars = new Array(TIME_LENGTH);

  for (let i = TIME_LENGTH - 1; i >= 0; i -= 1) {
    const mod = time % 32;
    chars[i] = ENCODING[mod];
    time = Math.floor(time / 32);
  }

  return chars.join("");
}

function randomChars(length: number) {
  const bytes = new Uint8Array(length);

  if (typeof crypto !== "undefined" && crypto.getRandomValues) {
    crypto.getRandomValues(bytes);
  } else {
    for (let i = 0; i < length; i += 1) {
      bytes[i] = Math.floor(Math.random() * 256);
    }
  }

  let output = "";
  for (let i = 0; i < length; i += 1) {
    output += ENCODING[bytes[i] & 31];
  }

  return output;
}

export function createUlid(timeMs: number = Date.now()) {
  return `${encodeTime(timeMs)}${randomChars(RANDOM_LENGTH)}`;
}
