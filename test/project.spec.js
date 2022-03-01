import {expect} from 'chai'
import env from 'dotenv'
import {runTest,runner} from '../src/lighthouse.js'

env.config();

describe('Project', () => {
    let server,db,series=[]
    let m = new Date().getUTCMonth()
    before(async()=>{
    })
    after(async()=>{
    })
    it('can project',async () => {
        const ctx={}
        const file='./reports/report.json'
        let res = await runner.project(file,['hello'])
        console.log(res);
    })

});
