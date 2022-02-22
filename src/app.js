import * as  dotenv from 'dotenv' //require('dotenv')
dotenv.config()

const port=process.env.PORT||3000
import * as dbg from 'debug'
const debug=dbg.default('app')
import Koa from 'koa';
//import koajwt from 'koa-jwt';
import requestBodyParser from 'koa-bodyparser';
import jsonError from 'koa-json-error';
import Router from 'koa-router';
//import env from 'dotenv'
//env.config();
//import * as dataRoutes from './routes.js'
import {routes as lhRoutes} from './lighthouse.js'
const is_local=process.env.NODE_ENV==='local'

function get_app() {

    //import { publicRoutes, jwtRoutes, protectedRoutes } from './routes/index';

    let app = new Koa();

    // all routes
    const router = new Router();
    let tokens
    if(is_local) console.log('Local mode');
    if(!is_local) tokens=process.env.TOKENS && process.env.TOKENS.split(',')

    //process.env.AUTH_TOKENS
    if (is_local) {
        app.use(async (ctx, next) => {
            console.log('headers',ctx.headers)
            const start = new Date();
            await next();
            const ms = new Date() - start;
            console.log(`${ctx.method} ${ctx.url} - ${ms}`);
        });
    }
    app.use(async (ctx, next) => {
        if(!is_local) {
            let header = ctx.headers['templ-auth'] || ctx.headers['wooreportauth']
            if (!tokens||!tokens.includes(header)) {
                console.log('auth failed',header);
                ctx.throw(401,'not authorized')
            }
        }
        return next()
    })

    app.use(requestBodyParser());
    //app.use(jsonError());


    let routes=[{
        method:'get',path:'/',f:async (ctx) => {
            ctx.body = "Hello World!"
        }}
    ]
    routes=routes.concat(lhRoutes)
    debug(routes)
    routes.forEach((route) => {
        //debug(route);
        router[route.method](route.path, route.f);
    });

    app.use(router.routes())
    //.use(router.allowedMethods());

    return app
}

const app = get_app()

app.listen(port)
if (is_local) {
    console.log(`application running at http://localhost:${port}`);
}
