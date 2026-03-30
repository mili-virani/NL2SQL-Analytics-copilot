from playwright.sync_api import sync_playwright

def extract_from_url(url: str):
    try:
        with sync_playwright() as p:
            browser = p.chromium.launch(headless=True)
            page = browser.new_page()
            page.goto(url, timeout=10000)
            
            # Simple content extraction
            title = page.title()
            content = page.evaluate("() => document.body.innerText.substring(0, 1000)")
            
            browser.close()
            return {"title": title, "content": content}
    except Exception as e:
        return {"error": f"Playwright extraction failed: {str(e)}"}
