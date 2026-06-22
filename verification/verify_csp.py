from playwright.sync_api import Page, expect, sync_playwright
import time

def test_pid_trainer_load(page: Page):
    # 1. Arrange: Go to the PID Trainer app.
    page.goto("http://localhost:5173")

    # 2. Act: Wait for the app to load.
    # We'll wait for the header to be visible.
    expect(page.get_by_role("heading", name="PID Trainer")).to_be_visible()

    # 3. Assert: Check if the main components are rendered.
    expect(page.get_by_text("Scenario")).to_be_visible()
    expect(page.get_by_text("PID Gains")).to_be_visible()

    # Take a screenshot to verify the UI and the CSP header's effect (no broken styles/scripts)
    page.screenshot(path="verification/verification.png")

if __name__ == "__main__":
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()
        try:
            test_pid_trainer_load(page)
        finally:
            browser.close()
