import express from 'express';
import cors from 'cors';
import { createProxyMiddleware } from 'http-proxy-middleware';

const app = express();
app.use(cors())

// create the proxy
/** @type {import('http-proxy-middleware/dist/types').RequestHandler<express.Request, express.Response>} */
const exampleProxy = createProxyMiddleware({
  target: 'https://www.thenirvanalab.com', // target host with the same base path
  changeOrigin: true, // needed for virtual hosted sites
});

// mount `exampleProxy` in web server
app.use('/', exampleProxy);
app.listen(3000);
console.log('proxy created http://localhost:3000 -> https://www.thenirvanalab.com')