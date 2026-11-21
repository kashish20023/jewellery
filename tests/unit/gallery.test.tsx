// @vitest-environment jsdom
import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { ZoomModal } from "@/components/product/ZoomModal";
import { PublicMediaDto } from "@/lib/types";

describe("ZoomModal Component — Smoke Test Matrix S05 Contract", () => {
  const mockMedia: PublicMediaDto[] = [
    {
      id: "m-1",
      url: "https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f",
      altText: "Choker Angle 1 - Studio Front",
      displayOrder: 1,
      isPrimary: true,
      isHoverImage: false,
    },
    {
      id: "m-2",
      url: "https://images.unsplash.com/photo-1611591475152-47795d07e600",
      altText: "Choker Angle 2 - Meenakari Reverse",
      displayOrder: 2,
      isPrimary: false,
      isHoverImage: true,
    },
  ];

  it("renders accessible dialog with aria attributes", () => {
    const handleClose = vi.fn();
    render(
      <ZoomModal
        isOpen={true}
        onClose={handleClose}
        media={mockMedia}
        productTitle="Heritage Polki Choker"
      />
    );

    const dialog = screen.getByRole("dialog");
    expect(dialog).toBeInTheDocument();
    expect(dialog).toHaveAttribute("aria-modal", "true");
    expect(screen.getByText("Heritage Polki Choker")).toBeInTheDocument();
    expect(screen.getByText(/Image 1 of 2/)).toBeInTheDocument();
  });

  it("navigates images with ArrowRight and ArrowLeft keyboard keys", () => {
    const handleClose = vi.fn();
    render(
      <ZoomModal
        isOpen={true}
        onClose={handleClose}
        media={mockMedia}
        productTitle="Heritage Polki Choker"
      />
    );

    expect(screen.getByText(/Image 1 of 2/)).toBeInTheDocument();

    // Press ArrowRight to advance
    fireEvent.keyDown(window, { key: "ArrowRight" });
    expect(screen.getByText(/Image 2 of 2/)).toBeInTheDocument();

    // Press ArrowLeft to return
    fireEvent.keyDown(window, { key: "ArrowLeft" });
    expect(screen.getByText(/Image 1 of 2/)).toBeInTheDocument();
  });

  it("closes modal on Escape key press", () => {
    const handleClose = vi.fn();
    render(
      <ZoomModal
        isOpen={true}
        onClose={handleClose}
        media={mockMedia}
        productTitle="Heritage Polki Choker"
      />
    );

    fireEvent.keyDown(window, { key: "Escape" });
    expect(handleClose).toHaveBeenCalledTimes(1);
  });

  it("restores focus to the trigger element when modal closes (S05 Focus Restoration)", () => {
    // Create an explicit mock trigger button in the DOM
    const triggerButton = document.createElement("button");
    triggerButton.textContent = "Open Zoom";
    document.body.appendChild(triggerButton);
    triggerButton.focus();

    expect(document.activeElement).toBe(triggerButton);

    const triggerRef = { current: triggerButton };
    const handleClose = vi.fn();

    // Render modal with triggerRef
    const { unmount } = render(
      <ZoomModal
        isOpen={true}
        onClose={handleClose}
        media={mockMedia}
        productTitle="Heritage Polki Choker"
        triggerElementRef={triggerRef}
      />
    );

    // Unmount modal (simulating modal close)
    unmount();

    // Verify focus was restored back to the trigger button
    expect(document.activeElement).toBe(triggerButton);

    // Cleanup
    document.body.removeChild(triggerButton);
  });
});

