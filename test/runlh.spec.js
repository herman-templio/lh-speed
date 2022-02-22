import {disconnect,client} from '../src/mongodb.js';
import {Alarm,DataAlarm} from '../src/alarms.js';
import {Model,User} from '../src/models.js';
import {expect} from 'chai'
import env from 'dotenv'
import * as path from 'path'

env.config();

describe('Alarms', () => {
    let server,db,series=[]
    let m = new Date().getUTCMonth()
    before(async()=>{
        let c=await client()
        db=c.db('test-db')
        Model.set_db(db)
    })
    after(async()=>{
        await User.drop()
        await DataAlarm.drop()
        await disconnect()
        Model.set_db(null)
    })
    it('can add a DataAlarm',async () => {
        await User.insert( [
            { _id:1, data:100 },{ _id:2, data:99 },
        ])
        console.log(await (await User.find()).toArray());
        await DataAlarm.insert([
            {user:1,limit:99,max:150,level:75,month:m},
            {user:2,limit:99,max:150,level:75,month:m}
        ])
        console.log(await (await DataAlarm.find()).toArray());
        let pending = await (await DataAlarm.get_pending()).toArray()
        console.log('pending',pending[0],pending[1]);
        await DataAlarm.raise_pending()
        console.log('raised',await (await DataAlarm.find({raised:true})).toArray());
        await Promise.all([DataAlarm.remove({}),User.remove({})])
    })
    it('can raise real alarnm',async function () {
        this.timeout(4000)
        let p = path.resolve(process.cwd(), '.env.alarm')
        //env.config({ path: p})
        console.log(process.env.DATAALARM_URL);
        await User.insert({ _id:22, data:100 })
        await DataAlarm.insert( {user:22,limit:99,max:150,level:75,month:m} )
        let pending = await (await DataAlarm.get_pending()).toArray()
        console.log('pending',pending[0],pending[1]);
        await DataAlarm.raise_pending()
        console.log('raised',await (await DataAlarm.find({raised:true})).toArray());
        pending = await (await DataAlarm.get_pending()).toArray()
        expect(pending.length).to.equal(0);
        await Promise.all([DataAlarm.remove({}),User.remove({})])
    })
});
