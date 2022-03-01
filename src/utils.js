export async function P(fn) {
    return new Promise((resolve,reject)=>{
        try{
            fn((err,...moreArgs)=>{
                if(err) return reject(err)
                // Resolve actually only considers the first argument, so the
                // ... is not really useful here
                resolve(...moreArgs)
            })
        } catch(e) {
            reject(e)
        }
    })
}
