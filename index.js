import * as  dotenv from 'dotenv' //require('dotenv')
dotenv.config()
import lighthouse from 'lighthouse'
import * as chromeLauncher from 'chrome-launcher'
import fs from 'fs'
async function launchChromeAndRunLighthouse(url, flags = {}, options={}, config = null) {
    let chrome 
    if(!options.port) {
        chrome = await chromeLauncher.launch(flags)
        options.port=chrome.port
    }
    console.log(url,options,config);
    //return
    const results=await lighthouse(url, options, config)
    if(chrome) await chrome.kill()
    // `.report` is the HTML report as a string
    const reportHtml = results.report;
    //console.log(reportHtml);
    const output=options.output_path||'reports/report.'+options.output
    console.log('Saving report to',output);
    fs.writeFileSync(output, reportHtml);
}

function getOptValue(flag,defaultValue) {
    const i=process.argv.indexOf(flag)
    if(i<0) return defaultValue
    let res=process.argv.splice(i,2)
    return res[1]
}
const flags = {
    chromeFlags: ['--headless']
};
const options = {
    logLevel: 'info', output: 'json', onlyCategories: ['performance'],
    //output_path:'result.html'
};

options.port=getOptValue('--port',options.port)
options.logLevel=getOptValue('--logLevel',options.logLevel)
options.output=getOptValue('--output',options.output)
if(process.argv.length<3) {
    console.log('Missing url');
    process.exit(1)
}
if(process.argv.length>3) {
    options.output_path=process.argv[3]
}
console.log(options); //process.exit()
//let config=require('./config');
//const { argv } = require('process');
import config from 'lighthouse/lighthouse-core/config/lr-mobile-config.js'
//config=require('lighthouse/lighthouse-core/config/lr-desktop-config')
launchChromeAndRunLighthouse(process.argv[2], flags, options, config)
