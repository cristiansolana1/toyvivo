export type UserProfile = {
  fullName: string;
  dni: string;
  phone: string;
  country: string;
  province: string;
  birthDate: string; // ISO string: YYYY-MM-DD
};

export type HeartbeatEntry = {
  id: string;
  createdAt: string;
  status: "alive";
};

export type Survey = {
  id: string;
  question: string;
  options: string[];
  targetCountry?: string; // ISO country code (e.g., "AR") - optional, if not set targets all countries
  targetProvince?: string; // Province code (e.g., "BA") - optional, requires targetCountry
};

export type WatchedUserStatus = {
  uid: string;
  fullName: string;
  phone: string;
  lastAliveAt: string | null;
};
