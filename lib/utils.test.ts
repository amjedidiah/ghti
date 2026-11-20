import { describe, expect, test } from "bun:test";

import { cn, isUuid } from "@/lib/utils";

describe("cn", () => {
  test("joins class names and drops falsy values", () => {
    expect(cn("px-2", false, undefined, "py-1")).toBe("px-2 py-1");
  });

  test("lets later Tailwind classes win over conflicting earlier ones", () => {
    expect(cn("px-2 text-sm", "px-4")).toBe("text-sm px-4");
  });
});

describe("isUuid", () => {
  test("accepts database ids, including the seed's non-RFC ones", () => {
    expect(isUuid("00000000-0000-0000-0000-0000000005a1")).toBe(true);
    expect(isUuid("8e8976e8-e5d6-45fe-ae7a-1039a9d4127e")).toBe(true);
  });

  test("refuses anything else", () => {
    expect(isUuid("not-a-uuid")).toBe(false);
    expect(isUuid("8E8976E8-E5D6-45FE-AE7A-1039A9D4127E")).toBe(false);
    expect(isUuid("8e8976e8-e5d6-45fe-ae7a-1039a9d4127e/../x")).toBe(false);
  });
});
