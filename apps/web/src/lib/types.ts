export interface Colleague {
  id: string;
  name: string;
  type: "OC" | "SENIOR_OC" | "MANAGER";
  isAssignable: boolean;
}

export interface TaskAllocation {
  id: string;
  colleagueId: string;
  workingDayId: string;
  taskType: string;
  status: "ACTIVE" | "EXTENDED" | "COMPLETED";
  allocatedAt: string;
  durationMins: number;
  extendedUntil: string | null;
  colleague: Colleague;
}

export interface WorkingDay {
  id: string;
  date: string;
  locked: boolean;
  colleagues: { id: string; colleague: Colleague }[];
  taskAllocations: TaskAllocation[];
}

export interface PatientArrival {
  id: string;
  workingDayId: string;
  name: string;
  dob: string;
  reason: "SIGHT_TEST" | "COLLECTION" | "ADJUSTMENT";
  arrivedAt: string;
  acknowledged: boolean;
}

export interface ActiveSession {
  id: string;
  userId: string;
  username: string;
  role: string;
  createdAt: string;
}
