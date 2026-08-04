import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  isAllowedEBuilderDownloadUrl,
  isEBuilderConfigured,
} from "./download-url-policy.js";

describe("isAllowedEBuilderDownloadUrl", () => {
  it("allows e-Builder S3 signed URLs", () => {
    assert.equal(
      isAllowedEBuilderDownloadUrl(
        "https://tenant-bucket.s3.us-east-1.amazonaws.com/path/file.pdf?X-Amz-Signature=abc"
      ),
      true
    );
  });

  it("allows e-builder hostnames", () => {
    assert.equal(
      isAllowedEBuilderDownloadUrl(
        "https://files.e-builder.net/download/abc.docx"
      ),
      true
    );
  });

  it("rejects arbitrary external URLs", () => {
    assert.equal(
      isAllowedEBuilderDownloadUrl("https://evil.com/file.pdf"),
      false
    );
    assert.equal(isAllowedEBuilderDownloadUrl("http://example.com/file.pdf"), false);
  });
});

describe("isEBuilderConfigured", () => {
  it("returns true when access token is set", () => {
    const previous = process.env.EBUILDER_ACCESS_TOKEN;
    process.env.EBUILDER_ACCESS_TOKEN = "test-token";
    assert.equal(isEBuilderConfigured(), true);
    process.env.EBUILDER_ACCESS_TOKEN = previous;
  });
});
