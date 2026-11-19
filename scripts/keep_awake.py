"""Visit each Streamlit app linked from the portfolio and wake it if it's asleep.

Streamlit Community Cloud puts apps to sleep after a stretch with no visitors,
and a plain HTTP ping doesn't wake them: someone has to press the
"Yes, get this app back up!" button. This does that in a headless browser.
"""
import sys
from playwright.sync_api import sync_playwright, TimeoutError as PWTimeout

APPS = [
    "https://f1-intel.streamlit.app/",
    "https://chess-zayeedbinkabir.streamlit.app/",
    "https://microstructure-terminal.streamlit.app/",
]

failed = []
with sync_playwright() as p:
    browser = p.chromium.launch()
    page = browser.new_page()
    for url in APPS:
        try:
            page.goto(url, wait_until="domcontentloaded", timeout=60_000)
            page.wait_for_timeout(5_000)
            wake = page.get_by_role("button", name="Yes, get this app back up!")
            if wake.count():
                wake.click()
                print(f"woke   {url}")
                page.wait_for_timeout(45_000)  # give the container time to boot
            else:
                print(f"awake  {url}")
        except PWTimeout:
            print(f"TIMEOUT {url}")
            failed.append(url)
    browser.close()

sys.exit(1 if failed else 0)
