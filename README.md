# lh-speed
testing lighthouse

npm install

Edit .env to use chromium-browser included in puppeteer. E.g.:


CHROME_PATH=node_modules/puppeteer/.local-chromium/linux-950341/chrome-linux/chrome-wrapper


Run a test with:

npm start https://example.com [outfile]
