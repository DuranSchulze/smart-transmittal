import { expect, it } from "vitest"
import { parseGoogleLink } from "./google-links"

it.each([
  ["https://drive.google.com/file/d/abcdefghijk/view?usp=sharing", "file"],
  ["https://drive.google.com/drive/u/0/folders/abcdefghijk", "folder"],
  ["https://drive.google.com/open?id=abcdefghijk", "file"],
  ["https://docs.google.com/document/d/abcdefghijk/edit", "file"],
  ["https://docs.google.com/spreadsheets/u/0/d/abcdefghijk/edit", "sheet"],
  ["https://docs.google.com/presentation/d/abcdefghijk/edit", "file"],
])("recognizes a supported Google link: %s", (url, kind) => {
  expect(parseGoogleLink(url)).toMatchObject({ id: "abcdefghijk", kind })
})
it.each([
  "https://evil.example/file/d/abcdefghijk/view",
  "https://drive.google.com.evil.example/file/d/abcdefghijk",
  "not a link /file/d/abcdefghijk",
  "https://drive.google.com/file/d/abc/view",
])("rejects invalid or unrelated links: %s", url => expect(parseGoogleLink(url)).toBeNull())
it("preserves resource keys on shared links", () => {
  expect(parseGoogleLink("https://drive.google.com/file/d/abcdefghijk/view?resourcekey=key-123")?.resourceKey).toBe("key-123")
})
