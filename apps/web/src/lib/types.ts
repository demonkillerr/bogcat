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
  colleagues: { id: string; colleague: Colleague; onLunch: boolean; lunchStartedAt: string | null }[];
  taskAllocations: TaskAllocation[];
}

export interface PatientArrival {
  id: string;
  workingDayId: string;
  name: string;
  reason: "SIGHT_TEST" | "COLLECTION" | "ADJUSTMENT";
  notes: string | null;
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

export type OptCallTaskType =
  | "POST_CHECK_SINGLE_STIM"
  | "POST_CHECK_MULTI_STIM"
  | "POST_CHECK_ZATA_24_2"
  | "POST_CHECK_PRESSURES"
  | "POST_CHECK_FUNDUS_PHOTOS"
  | "POST_CHECK_CLINICAL_OCT"
  | "POST_CHECK_CLINICAL_OPTOMAP"
  | "DISPENSE_SINGLE_VISION"
  | "DISPENSE_VARIFOCAL";

export interface OptometristProfile {
  id: string;
  date: string;
  name: string;
  roomNumber: number;
  locked: boolean;
}

export interface OptometristCall {
  id: string;
  workingDayId: string;
  roomNumber: number;
  optometristName: string;
  taskType: OptCallTaskType;
  status: "PENDING" | "ACKNOWLEDGED";
  createdAt: string;
  acknowledgedAt: string | null;
}

export interface WeeklyStats {
  weekStart: string;
  weekEnd: string;
  totalDays: number;
  totalTasks: number;
  totalArrivals: number;
  tasksByType: Record<string, number>;
  tasksByColleague: Record<string, Record<string, number>>;
  arrivalsByReason: Record<string, number>;
  lunches: { date: string; colleagueName: string; lunchStartedAt: string }[];
  dailySummaries: {
    date: string;
    colleaguesWorking: { name: string; type: string; onLunch: boolean; lunchStartedAt: string | null }[];
    tasks: { taskType: string; colleagueName: string; status: string; allocatedAt: string; durationMins: number }[];
    arrivals: { name: string; reason: string; arrivedAt: string }[];
  }[];
}
