import {expect} from 'chai'
import env from 'dotenv'
import * as path from 'path'
import {runTest,runner} from '../src/lighthouse.js'

env.config();

describe('Queue', () => {
    let server,db,series=[]
    let m = new Date().getUTCMonth()
    before(async()=>{
    })
    after(async()=>{
    })
    it('can enqueue',async () => {
        const ctx={}
        const data={url:'testing'}
        runTest(ctx,data)
        console.log(ctx);
        expect(ctx.body.state).to.equal('running')
        let r = runner.findTestById(ctx.body.id)
        expect(r.id).to.equal(ctx.body.id)
        r=runner.enqueue_test(data)
        expect(r.position).to.equal(1)
        r = runner.findTestById(r.id)
        console.log(r);
        runTest(ctx,data)
        console.log(ctx);
        expect(ctx.body.state).to.equal('queued')
        let res = await runner.waitForComplete(ctx.body.id)
        console.log('completed',res);
    })
    it('runs actial test',async function () {
        this.timeout(3000)
        const ctx={}
        const data={url:'http://localhost:3003',select:['hello'],options:{output_path:'reports/report.txt'},mock:true}
        runTest(ctx,data)
        console.log(ctx);
        let res=await runner.waitForComplete(ctx.body?.id); 
        console.log(res);
        expect(res.state).to.equal('complete')
        expect(res.res.output).to.equal('reports/report.txt')
    })
});
