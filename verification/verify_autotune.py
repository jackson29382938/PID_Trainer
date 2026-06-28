from playwright.sync_api import Page, expect, sync_playwright
import time

def test_autotune(page: Page):
    page.goto("http://localhost:4173")
    page.wait_for_selector("text=The Bouncy Castle")

    p_input = page.get_by_role("spinbutton", name="Proportional gain")
    initial_p = p_input.input_value()
    print(f"Initial P: {initial_p}")

    autotune_btn = page.get_by_role("button", name="Auto-Tune")
    autotune_btn.click()

    time.sleep(3)

    new_p = p_input.input_value()
    print(f"New P: {new_p}")

    page.screenshot(path="verification/verification_final.png")

    if initial_p != new_p:
        print("SUCCESS: P gain changed after auto-tune")
    else:
        print("FAILURE: P gain did not change")

if __name__ == "__main__":
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()
        try:
            test_autotune(page)
        finally:
            browser.close()
