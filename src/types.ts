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
};

export type WatchedUserStatus = {
  uid: string;
  fullName: string;
  phone: string;
  lastAliveAt: string | null;
};
