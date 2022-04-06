import lighthouse from 'lighthouse'
import * as dbg from 'debug'
import _ from 'lodash'
const debug=dbg.default('app')
import fs from 'fs'
import { configs } from './configs.js'
import { P } from './utils.js'
const EXPIRY_TIME_S=10*60
const MAX_LISTEN_S=30
const MAX_COUNT=1000

function default_options () {
    return  {
        logLevel: 'info', output: 'json', onlyCategories: ['performance'], port:9222
    }
}

/** Run lighthouse tests with queueing and listeners */
export class LighouseRunner {

    async runLighthouse(id,data={url:'testing'}) {
        const url=data.url
        debug('Running test',id,url)
        if(url=='testing') {
            debug('mock test')
            return setTimeout(()=>this.testCompleted(id,{}),200)
        }
        try {
            const config=configs[data.config||'mobile']
            const options=Object.assign(default_options(),data.options||{})
            
            if(!options.port) {
                throw new Error("Missing option: port")
            }
            console.log(url,options,config);
            let results= {report:'{"hello":{"lighthouse":"world","other":"world"},"finalUrl":"someMockUrl"}'}
            if(!data.mock) {
                results = await lighthouse(url, options, config)
            } else {
                let mock=data.mock
                console.log('Sending mock result after',mock,'ms');
                try { mock=parseInt(data.mock)}catch(e){}
                await P(cb=>setTimeout(()=>cb(),mock))
            }
            // `.report` is the JSON/HTML report as a string
            const report = results.report;
            const output=options.output_path||'reports/report.'+options.output
            console.log('Saving report to',output);
            fs.writeFileSync(output, report);
            console.log('Saved report to',output);
            this.testCompleted(id,{output:output,report: this.projection(JSON.parse(report),data.select)})
        } catch(e) {
            this.testCompleted(id,{error:e.message})
        }
    }
    projection(report,select=[]) {
        const res={}
        select.forEach(s=>{
            const v = _.get(report,s)
            _.set(res,s,v)
        })
        return res
    }

    async project(file,select=[]) {
        if(!file) return {}
        let report
        if(file.endsWith('.json')) {
            report = await import('../'+file, { assert: { type: "json" } })
            report = report.default
        } else {
            let text=await P(cb=>fs.readFile(file,cb))
            report = JSON.parse(text)
        }
        debug(select)
        return this.projection(report,select)
    }
    queue=[]
    listeners={}
    results={}

    cleanResults() {
        const now=Date.now()
        for (let [id,old] of Object.entries(this.results).filter(r=>r.expires<=now)) {
            debug('Removing',id)
            delete this.results[id]
        }
    }

    storeResult(id,res) {
        this.results[id]={expires:Date.now()+EXPIRY_TIME_S*1000,res}
        // Clean old results
        this.cleanResults()
    }

    addListener(id,f) {
        if(this.results[id] || !this.findTestById(id)) {
            debug('Invoking listener immediately',id, 'because', this.results[id]? 'results alread added':'no such test found')
            return f({state:'complete',res:this.results[id]?.res})
        }
        debug('Adding listener',id)
        this.listeners[id]=f
    }

    getQueuePosition(id) {
        return this.queue.findIndex(test => test.id==id)
    }

    getResults(id) {
        return this.results[id]
    }

    findTestById(id) {
        return this.queue.find(test => test.id==id)
    }

    count=0
    getID() {
        if(this.count>MAX_COUNT) this.count=0
        return ++this.count
    }

    enqueue_test(data) {
        const id=data.id || this.getID()
        debug(this.queue[0])
        this.queue.push({id:id,data:data})
        let res= {id,position:this.queue.length-1}
        if( res.position==0) this.runLighthouse(id,data)
        return res
    }

    /** A test was completed. start another if there is one */
    testCompleted(id,res) {
        debug('Test completed',id)
        // Store result for a certain time
        this.storeResult(id,res)
        // Rempve the test from the queue
        this.queue.shift()
        if(this.listeners[id]) {
            // Call listener with result
            this.listeners[id]({state:'complete',res})
            delete this.listeners[id]
        }
        // Update position of tests in queue
        this.queue.forEach((q,i)=>{
            if(this.listeners[q.id]) this.listeners[q.id]({state:i?'queued':'running',position:i})
        })
        // Start next test
        const next=this.queue[0]
        if(next) this.runLighthouse(next.id,next.data)
    }

    /** Waits for an update of given test. 
     * Resolves in the following object:
     *   {state: state, res:result, position:i}
     * Where state can be one of:
     *   - running - the test is running
     *   - queued -  the test is queued, at given position
     *   - complete - the test is complete, and result is as given
     * Can also be rejected with 'timeout' as error
     */
    async waitForUpdate(id,timeout=MAX_LISTEN_S) {
        return new Promise((resolve,reject) => {
            const t = setTimeout(()=>{
                reject('timeout')
            },timeout*1000)
            this.addListener(id,(res)=>{
                clearTimeout(t)
                resolve(res)
            })
        })
    }

    async waitForComplete(id,timeout=MAX_LISTEN_S) {
        debug('Waiting for',id)
        let res= await this.waitForUpdate(id,timeout)
        debug('Result',id,res)
        while (['running','queued'].includes(res?.state)) {
            res= await this.waitForUpdate(id,timeout)
            debug('Result',id,res)
        }
        return res
    }

}

export const runner=new LighouseRunner()

export function runTest(ctx,body) {
    if(body.id) {
        // Check if test is already queued/running/complete
        const position=runner.getQueuePosition(body.id)
        if(position>=0) return {state:position?'queued':'running',id:body.id,position:position}
        const results=runner.getResults(body.id)
        if(results) return {state:'completed',res:results}
    }
    const {id,position} = runner.enqueue_test(body)
    ctx.body = {state:position?'queued':'running',id:id,position:position}
}

export let routes=[{
    method:'post',path:'/runtest',f: async (ctx)=>{
        console.log('Running test post',ctx.request.body);
        runTest(ctx,ctx.request.body)
    }
},{
    method:'get',path:'/runtest',f: async (ctx)=>{
        console.log('Running test get',ctx.request.query);
        ctx.body = "Running test get!"
        runTest(ctx,ctx.request.query)
    },
},{
    method:'get',path:'/observe/:id',f:async (ctx) => {
        const id=ctx.params.id
        try {
            ctx.body = await runner.waitForUpdate(id)
        } catch(e) {
            ctx.body={state:'error',error:e}
        }
    }
},{
    method:'get',path:'/result/:id',f:async (ctx) => {
        const id=ctx.params.id
        try {
            ctx.body = await runner.waitForComplete(id)
        } catch(e) {
            ctx.body={state:'error',error:e}
        }
    }
},{
    method:'post',path:'/project',f:async (ctx) => {
        try {
            const body=ctx.request.body
            ctx.body = await runner.project(body?.file,body?.select)
        } catch(e) {
            ctx.body={state:'error',error:e}
        }
    }
}]
