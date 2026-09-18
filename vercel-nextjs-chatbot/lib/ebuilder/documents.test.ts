import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  isAllowedEBuilderDownloadUrl,
  isEBuilderConfigured,
} from "./download-url-policy.js";
import { buildDocumentByFileIdQuery } from "./queries.js";

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

describe("buildDocumentByFileIdQuery", () => {
  const fileId = "2d2cdf28-42ff-4f0e-82c0-00b05b89eb85";

  it("uses the equality operator e-Builder accepts", () => {
    // "EQ" returns 400 Invalid filter operation, which silently disabled
    // document preview: no download URL resolved, so every file fell back to
    // a download link.
    assert.equal(buildDocumentByFileIdQuery(fileId).Filters[0].Operation, "=");
  });

  it("filters on the file id it was given", () => {
    const filter = buildDocumentByFileIdQuery(fileId).Filters[0];
    assert.equal(filter.Field, "Document/FileId");
    assert.equal(filter.Value, fileId);
  });

  it("asks for the download URL, or there is nothing to preview", () => {
    assert.ok(
      buildDocumentByFileIdQuery(fileId).SelectedFields.includes(
        "Document/DownloadURL"
      )
    );
  });
});
