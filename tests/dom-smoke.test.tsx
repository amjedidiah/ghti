import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, test } from "bun:test";

import FormMessage from "@/components/forms/FormMessage";

describe("component test setup", () => {
  test("renders, queries by role and uses jest-dom matchers", async () => {
    render(<FormMessage status="error" message="Please fix the highlighted fields." />);
    expect(screen.getByRole("alert")).toHaveTextContent("Please fix the highlighted fields.");
    await userEvent.setup().tab();
    expect(document.body).toBeInTheDocument();
  });
});
