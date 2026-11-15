import { describe, expect, it } from "vitest";
import {
  MEBIBYTE,
  SystemSettingsFormSchema,
  SystemSettingsSchema,
} from "~/schemas/system-settings";

const validForm = {
  contactEmail: " teachers@example.org ",
  suggestionsMaxPerDay: "3",
  registrationOpen: "on",
  uploadMaxMegabytes: "8",
};

describe("SystemSettingsFormSchema", () => {
  it("turns the form's strings into settings", () => {
    expect(SystemSettingsFormSchema.parse(validForm)).toEqual({
      contactEmail: "teachers@example.org",
      suggestionsMaxPerDay: 3,
      registrationOpen: true,
      uploadMaxBytes: 8 * MEBIBYTE,
    });
  });

  it("reads an empty email as none and a missing checkbox as closed", () => {
    const { registrationOpen: _registrationOpen, ...unchecked } = validForm;
    expect(SystemSettingsFormSchema.parse({ ...unchecked, contactEmail: "" })).toMatchObject({
      contactEmail: null,
      registrationOpen: false,
    });
  });

  it("rejects a bad email and numbers outside their range", () => {
    const failedField = (overrides: Record<string, string>) => {
      const result = SystemSettingsFormSchema.safeParse({ ...validForm, ...overrides });
      return result.success ? null : result.error.issues[0]?.path[0];
    };
    expect(failedField({ contactEmail: "not-an-email" })).toBe("contactEmail");
    expect(failedField({ suggestionsMaxPerDay: "0" })).toBe("suggestionsMaxPerDay");
    expect(failedField({ suggestionsMaxPerDay: "" })).toBe("suggestionsMaxPerDay");
    expect(failedField({ suggestionsMaxPerDay: "101" })).toBe("suggestionsMaxPerDay");
    expect(failedField({ uploadMaxMegabytes: "0" })).toBe("uploadMaxMegabytes");
    expect(failedField({ uploadMaxMegabytes: "51" })).toBe("uploadMaxMegabytes");
    expect(failedField({ uploadMaxMegabytes: "1.5" })).toBe("uploadMaxMegabytes");
  });
});

describe("SystemSettingsSchema", () => {
  it("validates stored values per key", () => {
    expect(SystemSettingsSchema.shape.contactEmail.safeParse(null).success).toBe(true);
    expect(SystemSettingsSchema.shape.contactEmail.safeParse("nope").success).toBe(false);
    expect(SystemSettingsSchema.shape.registrationOpen.safeParse("yes").success).toBe(false);
    expect(SystemSettingsSchema.shape.uploadMaxBytes.safeParse(10).success).toBe(false);
  });
});
