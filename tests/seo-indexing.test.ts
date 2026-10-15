import assert from "node:assert/strict";
import { test } from "node:test";
import { publicIndexingAllowed } from "../lib/site/indexing";
import { brandConfig } from "../brand.config";

test("production indexing approval never unlocks previews or an explicit indexing pause", () => {
  const original = {
    flag: process.env.NEXT_PUBLIC_ALLOW_INDEXING,
    deployment: process.env.VERCEL_ENV,
  };
  try {
    process.env.NEXT_PUBLIC_ALLOW_INDEXING = "true";
    process.env.VERCEL_ENV = "production";
    assert.equal(publicIndexingAllowed(), true);
    process.env.VERCEL_ENV = "preview";
    assert.equal(publicIndexingAllowed(), false);
    process.env.VERCEL_ENV = "production";
    process.env.NEXT_PUBLIC_ALLOW_INDEXING = "false";
    assert.equal(publicIndexingAllowed(), false);
    delete process.env.NEXT_PUBLIC_ALLOW_INDEXING;
    const requiresApproval = (brandConfig as { useBrandCanonicalOrigin?: boolean }).useBrandCanonicalOrigin;
    assert.equal(publicIndexingAllowed(), !requiresApproval);
  } finally {
    if (original.flag === undefined) delete process.env.NEXT_PUBLIC_ALLOW_INDEXING;
    else process.env.NEXT_PUBLIC_ALLOW_INDEXING = original.flag;
    if (original.deployment === undefined) delete process.env.VERCEL_ENV;
    else process.env.VERCEL_ENV = original.deployment;
  }
});
