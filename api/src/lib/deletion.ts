// MB-32 provisional: when a report's last reference goes, the profile goes
// with it. If the Owner decides otherwise (anonymise, keep), this is the seam.
export type ProfileReferences = {
  otherReportCount: number;
  relationshipParticipantCount: number;
};

export function shouldDeleteProfile(refs: ProfileReferences): boolean {
  return refs.otherReportCount === 0 && refs.relationshipParticipantCount === 0;
}
