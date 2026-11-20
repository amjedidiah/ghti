import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, mock, test } from "bun:test";

import LessonForm from "@/components/content/LessonForm";
import type { FormState } from "@/lib/validation/auth";

function setup() {
  // Typed like a real form action; the tests read its calls' FormData.
  const action = mock(async (...args: [FormState, FormData]): Promise<FormState> => {
    void args;
    return { status: "success", message: "Lesson added." };
  });
  render(<LessonForm action={action} submitLabel="Add lesson" />);
  return { action, user: userEvent.setup() };
}

describe("LessonForm", () => {
  test("a pasted YouTube link previews the video before saving", async () => {
    const { user } = setup();
    expect(screen.queryByTitle(/^Video:/)).toBeNull();

    await user.type(screen.getByLabelText("Title"), "Week 1");
    await user.type(screen.getByLabelText(/YouTube video/), "https://youtu.be/dQw4w9WgXcQ");

    const player = screen.getByTitle("Video: Week 1");
    expect(player.getAttribute("src")).toStartWith(
      "https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ",
    );
  });

  test("a link that is not YouTube is refused with a clear message, and nothing is sent", async () => {
    const { user, action } = setup();
    await user.type(screen.getByLabelText("Title"), "Week 1");
    await user.type(screen.getByLabelText(/YouTube video/), "https://vimeo.com/123");
    await user.click(screen.getByRole("button", { name: "Add lesson" }));

    expect(await screen.findByText(/Paste the video's YouTube link/)).toBeInTheDocument();
    expect(action).not.toHaveBeenCalled();
    expect(screen.queryByTitle(/^Video:/)).toBeNull();
  });

  test("a valid lesson is sent to the action and the form clears", async () => {
    const { user, action } = setup();
    await user.type(screen.getByLabelText("Title"), "Week 2");
    await user.click(screen.getByRole("button", { name: "Add lesson" }));

    await waitFor(() => expect(action).toHaveBeenCalledTimes(1));
    const sent = action.mock.calls[0][1];
    expect(sent.get("title")).toBe("Week 2");
    expect(await screen.findByText("Lesson added.")).toBeInTheDocument();
    expect(screen.getByLabelText("Title")).toHaveValue("");
  });
});
