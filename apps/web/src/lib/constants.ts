export const TASK_LABELS: Record<string, string> = {
  PRE_SCREENING_FULL_SIGHT_TEST: "Pre-screening: Full Sight Test",
  PRE_SCREENING_SUPPLEMENTARY: "Pre-screening: Supplementary Test",
  POST_CHECKS: "Post Checks",
  DISPENSING_SINGLE_VISION: "Dispensing: Single Vision",
  DISPENSING_VARIFOCALS: "Dispensing: Varifocals",
  COLLECTION: "Collection",
  EGOS: "E-GOS",
  FILE_PULLING: "File Pulling",
  SCANNING: "Scanning",
};

export const TASK_DURATIONS: Record<string, number> = {
  PRE_SCREENING_FULL_SIGHT_TEST: 15,
  PRE_SCREENING_SUPPLEMENTARY: 10,
  POST_CHECKS: 10,
  DISPENSING_SINGLE_VISION: 30,
  DISPENSING_VARIFOCALS: 30,
  COLLECTION: 10,
  EGOS: 30,
  FILE_PULLING: 60,
  SCANNING: 60,
};

export const TASK_TYPES = Object.keys(TASK_LABELS);

export const ARRIVAL_REASON_LABELS: Record<string, string> = {
  SIGHT_TEST: "Sight Test",
  COLLECTION: "Collection",
  ADJUSTMENT: "Adjustment",
};

export const COLLEAGUE_TYPE_LABELS: Record<string, string> = {
  OC: "OC",
  SENIOR_OC: "Senior OC",
  MANAGER: "Manager",
};

export const OPT_CALL_LABELS: Record<string, string> = {
  POST_CHECK_SINGLE_STIM:     "Single Stim",
  POST_CHECK_MULTI_STIM:      "Multi Stim",
  POST_CHECK_ZATA_24_2:       "Zata 24-2",
  POST_CHECK_PRESSURES:       "Pressures",
  POST_CHECK_FUNDUS_PHOTOS:   "Fundus Photos",
  POST_CHECK_CLINICAL_OCT:    "Clinical OCT",
  POST_CHECK_CLINICAL_OPTOMAP:"Clinical Optomap",
  DISPENSE_SINGLE_VISION:     "Single Vision",
  DISPENSE_VARIFOCAL:         "Varifocal",
};
