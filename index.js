const lighthouse = require('lighthouse');
const chromeLauncher = require('chrome-launcher');
const fs=require('fs')
async function launchChromeAndRunLighthouse(url, flags = {}, options={}, config = null) {
    const chrome = await chromeLauncher.launch(flags)
    options.port=chrome.port
    const results=await lighthouse(url, options, config)
    await chrome.kill()
    // `.report` is the HTML report as a string
    const reportHtml = results.report;
    //console.log(reportHtml);
    fs.writeFileSync(options.output_path||'report.html', reportHtml);
}

const flags = {
    //chromeFlags: ['--headless']
};
const options = {
    logLevel: 'info', output: 'html', onlyCategories: ['performance'],
    //output_path:'result.html'
};

if(process.argv.length<3) {
    console.log('Missing url');
    process.exit(1)
}
if(process.argv.length>3) {
    options.output_path=process.argv[3]
}
launchChromeAndRunLighthouse(process.argv[2], flags, options)