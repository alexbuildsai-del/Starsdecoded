import { test } from "node:test";
import assert from "node:assert/strict";
import { LEGAL_IDENTITY, missingSellerFields, saleReady, waitlistReady, type SellerIdentity } from "./seller";

// A stand-in for a finished identity. The Owner's real postal address is never written in this repo.
const COMPLETE: SellerIdentity = {
  name: "Test Seller",
  tradingName: "Test Shop",
  country: "Testland",
  postalAddress: "test postal address",
  contactEmail: "seller@example.test",
  statementDescriptor: "TESTSHOP",
};

test("seller: the constant holds the Owner's name, trading name, country, descriptor and contact address, and no postal address (ADR-144, MB-115)", () => {
  assert.deepEqual(LEGAL_IDENTITY, {
    name: "Alexandra Bendicakova",
    tradingName: "Stars Decoded",
    country: "Belgium",
    postalAddress: null,
    contactEmail: "hello@mystarsdecoded.com",
    statementDescriptor: "MYSTARSDECODED",
  });
});

test("seller: the constant is ready for the waitlist and not for a sale, and only the postal address is missing", () => {
  assert.deepEqual(missingSellerFields(), ["postalAddress"]);
  assert.equal(waitlistReady(), true);
  assert.equal(saleReady(), false);
  assert.deepEqual(missingSellerFields(LEGAL_IDENTITY), missingSellerFields());
  assert.equal(waitlistReady(LEGAL_IDENTITY), waitlistReady());
  assert.equal(saleReady(LEGAL_IDENTITY), saleReady());
});

test("seller: a complete identity passed in is ready for both", () => {
  assert.deepEqual(missingSellerFields(COMPLETE), []);
  assert.equal(waitlistReady(COMPLETE), true);
  assert.equal(saleReady(COMPLETE), true);
});

test("seller: without a postal address the waitlist is ready and the sale is not", () => {
  const noPostal = { ...COMPLETE, postalAddress: null };
  assert.deepEqual(missingSellerFields(noPostal), ["postalAddress"]);
  assert.equal(waitlistReady(noPostal), true);
  assert.equal(saleReady(noPostal), false);
});

test("seller: without a contact address neither is ready", () => {
  const noContact = { ...COMPLETE, contactEmail: null };
  assert.deepEqual(missingSellerFields(noContact), ["contactEmail"]);
  assert.equal(waitlistReady(noContact), false);
  assert.equal(saleReady(noContact), false);
});

test("seller: with neither address both are listed, postal address first, and neither is ready", () => {
  const bare = { ...COMPLETE, postalAddress: null, contactEmail: null };
  assert.deepEqual(missingSellerFields(bare), ["postalAddress", "contactEmail"]);
  assert.equal(waitlistReady(bare), false);
  assert.equal(saleReady(bare), false);
});

test("seller: a blank address is as missing as null", () => {
  for (const blank of ["", "   ", "\n\t"]) {
    assert.deepEqual(missingSellerFields({ ...COMPLETE, postalAddress: blank }), ["postalAddress"], JSON.stringify(blank));
    assert.deepEqual(missingSellerFields({ ...COMPLETE, contactEmail: blank }), ["contactEmail"], JSON.stringify(blank));
    assert.equal(waitlistReady({ ...COMPLETE, contactEmail: blank }), false, JSON.stringify(blank));
    assert.equal(saleReady({ ...COMPLETE, postalAddress: blank }), false, JSON.stringify(blank));
  }
});

test("seller: the name is needed for both, though only the two addresses are listed as missing", () => {
  const nameless = { ...COMPLETE, name: " " };
  assert.deepEqual(missingSellerFields(nameless), []);
  assert.equal(waitlistReady(nameless), false);
  assert.equal(saleReady(nameless), false);
});

test("seller: the trading name, country and descriptor hold back a sale but not the waitlist", () => {
  for (const field of ["tradingName", "country", "statementDescriptor"] as const) {
    const gap = { ...COMPLETE, [field]: "" };
    assert.equal(waitlistReady(gap), true, field);
    assert.equal(saleReady(gap), false, field);
  }
});

test("seller: the predicates read the identity they are given, not the constant", () => {
  assert.equal(waitlistReady({ ...LEGAL_IDENTITY, contactEmail: null }), false);
  assert.equal(saleReady({ ...LEGAL_IDENTITY, postalAddress: COMPLETE.postalAddress }), true);
  assert.equal(waitlistReady(), true);
  assert.equal(saleReady(), false);
});
