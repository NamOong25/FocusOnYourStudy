export type GradeStatusValue = { complete: boolean; passed: boolean; failed: boolean; total: number | null; status: string; reason: string };
import { C } from '../../shared/theme';

// Use the completed course total on the 10-point scale, never GPA on the 4-point scale.
// A failed/blocked course keeps priority over the low passing score warning.
export function gradePresentation(result: GradeStatusValue) {
  const lowPass = result.complete && result.passed && !result.failed
    && result.total !== null && result.total <= 5;
  return {
    lowPass,
    attention: result.failed || lowPass,
    color: result.failed ? C.red : lowPass ? C.orange : result.passed ? C.green : C.muted,
    background: result.failed ? C.redSoft : lowPass ? C.orangeSoft : result.passed ? C.greenSoft : C.track,
    label: lowPass ? `${result.status} · Điểm thấp` : result.status,
  };
}
