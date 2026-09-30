export interface SellerIdentity {
  name: string;
  tradingName: string;
  country: string;
  postalAddress: string | null;
  contactEmail: string | null;
  statementDescriptor: string;
}

/**
 * The one seller that Terms, Privacy, Refunds, "Who runs Stars Decoded" and the receipt
 * all read (ADR-144). Alex sells as a private individual until the company exists; the
 * company later is an edit to this object and one email to users.
 */
export const LEGAL_IDENTITY: Readonly<SellerIdentity> = {
  name: "Alexandra Bendicakova",
  tradingName: "Stars Decoded",
  country: "Belgium",
  // MB-115 provisional: EU consumer law wants a postal address on an online sale, and the
  // Owner's is kept out of the public repo. Only saleReady() waits on it.
  postalAddress: null,
  contactEmail: "hello@mystarsdecoded.com",
  statementDescriptor: "MYSTARSDECODED",
};

// A blank string is as missing as null, so an emptied field cannot pass for a filled one.
const given = (value: string | null | undefined): boolean => value != null && value.trim() !== "";

export function missingSellerFields(
  id: SellerIdentity = LEGAL_IDENTITY,
): ("postalAddress" | "contactEmail")[] {
  const missing: ("postalAddress" | "contactEmail")[] = [];
  if (!given(id.postalAddress)) missing.push("postalAddress");
  if (!given(id.contactEmail)) missing.push("contactEmail");
  return missing;
}

/** The privacy page must name whoever holds the list and how to reach them before it collects an address (ADR-145). */
export function waitlistReady(id: SellerIdentity = LEGAL_IDENTITY): boolean {
  return given(id.name) && given(id.contactEmail);
}

/** A sale needs every field; the waitlist alone does not need the postal address (ADR-144). */
export function saleReady(id: SellerIdentity = LEGAL_IDENTITY): boolean {
  return (
    given(id.name) &&
    given(id.tradingName) &&
    given(id.country) &&
    given(id.statementDescriptor) &&
    missingSellerFields(id).length === 0
  );
}
