import requestListener from '../server.mjs';

export default async function handler(req, res) {
  return requestListener(req, res);
}
