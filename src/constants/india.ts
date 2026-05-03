export const STATES = [
  "Andhra Pradesh",
  "Assam",
  "Bihar",
  "Delhi",
  "Gujarat",
  "Karnataka",
  "Kerala",
  "Madhya Pradesh",
  "Maharashtra",
  "Punjab",
  "Rajasthan",
  "Tamil Nadu",
  "Telangana",
  "Uttar Pradesh",
  "West Bengal",
] as const;

export type State = (typeof STATES)[number];

export const ELECTION_TYPES = [
  { value: "lok_sabha",    label: "Lok Sabha"    },
  { value: "vidhan_sabha", label: "Vidhan Sabha" },
] as const;

export type ElectionType = (typeof ELECTION_TYPES)[number]["value"];
