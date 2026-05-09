import { LiferayHeadlessClient } from 'liferay-headless-sdk';

export const client = new LiferayHeadlessClient({
  baseUrl: 'http://localhost:8080',
  username: 'test@liferay.com',
  password: 'test@liferay.com',
  swaggerUrls: ['/o/x-headless-delivery/v1.0/openapi.json', '/o/cms/blogs/openapi.json', '/o/cms/basic-web-contents/openapi.json'],
});

// export const client = new LiferayHeadlessClient({
//   baseUrl: 'https://apps.nlproducts.net',
//   username: 'portal.admin@thenirvanalab.com',
//   password: 'Welcome@123!',
//   swaggerUrls: ['/o/headless-delivery/v1.0/openapi.json', '/o/cms/blogs/openapi.json', '/o/cms/basic-web-contents/openapi.json'],
// });

// await client.init();

// console.log('client', client._services)

