import http from 'http';
import getPort from 'get-port';
import fetch from 'node-fetch';
import { parse } from 'node-html-parser';

import { purifyAmpCss } from './index';

const getHtml = ({ head, body } = {}) => `
  <!doctype html>
  <html>
    <head>
      ${head}
    </head>
    <body>
      ${body}
    </body>
  </html>
`;

const launchServer = async () => {
  const port = await getPort();
  let options = {};
  let html = '';
  let method;

  const server = http.createServer((req, res) => {
    purifyAmpCss(req, res, options);

    if (method === 'end') {
      return res.end(html);
    }

    if (method === 'write') {
      res.write(html);
      return res.end();
    }

    throw new Error('Response method not set');
  }).listen(port);

  return {
    server,
    port,
    setHtml: (newHtml) => { html = newHtml; },
    setOptions: (newOptions) => { options = newOptions; },
    setMethod: (newMethod) => { method = newMethod; },
  };
};

const fetchAmpCss = async (port) => {
  const res = await fetch(`http://localhost:${port}`);

  return parse(await res.text(), { style: true })
    .querySelector('head')
    .childNodes
    .find((node) => node.tagName === 'style')
    .text;
};

describe('Purify AMP CSS', () => {
  let testServer;

  beforeAll(async () => {
    testServer = await launchServer();
  });

  afterEach(() => {
    testServer.setOptions({});
  });

  afterAll(async () => {
    testServer.server.close();
  });

  describe.each(['write', 'end'])('response.%s', (responseMethod) => {
    beforeEach(() => {
      testServer.setMethod(responseMethod);
    });

    it('strips unused css from the response', async () => {
      const html = getHtml({
        head: '<style amp-custom>.yes { background: green; } .no { background: red; }</style>',
        body: '<div class="yes" />',
      });

      testServer.setHtml(html);

      expect(await fetchAmpCss(testServer.port)).toEqual('.yes{background:green}');
    });

    it('does not strip anything extra from the document head', async () => {
      const html = getHtml({
        head: `
          <base />
          <meta />
          <link />
          <style></style>
          <script></script>
          <noscript></noscript>
        `,
      });

      testServer.setHtml(html);

      const res = await fetch(`http://localhost:${testServer.port}`);
      const head = parse(await res.text(), { style: true, script: true }).querySelector('head');

      expect(head.querySelector('base')).not.toBeNull();
      expect(head.querySelector('link')).not.toBeNull();
      expect(head.querySelector('meta')).not.toBeNull();
      expect(head.querySelector('style')).not.toBeNull();
      expect(head.querySelector('script')).not.toBeNull();
      expect(head.querySelector('noscript')).not.toBeNull();
      expect(head.querySelector('somethingelse')).toBeNull();
    });

    it('returns the document unchanged if no AMP CSS', async () => {
      const html = getHtml();

      testServer.setHtml(html);
      testServer.setMethod(responseMethod);

      const res = await fetch(`http://localhost:${testServer.port}`);

      expect(await res.text()).toEqual(html);
    });

    it('returns the document unchanged if no body', async () => {
      const html = '<head><style amp-custom>.a {}</style></head>';

      testServer.setHtml(html);
      testServer.setMethod(responseMethod);

      const res = await fetch(`http://localhost:${testServer.port}`);

      expect(await res.text()).toEqual(html);
    });

    it('does not minify the AMP CSS if minification disabled', async () => {
      const html = getHtml({
        head: '<style amp-custom>.yes { background: green; }</style>',
        body: '<div class="yes" />',
      });

      testServer.setHtml(html);
      testServer.setOptions({ minify: false });

      expect(await fetchAmpCss(testServer.port)).toEqual('.yes {\n  background: green;\n}');
    });

    it('does not remove whitelisted selectors', async () => {
      const html = getHtml({
        head: '<style amp-custom>.no { background: red; }</style>',
      });

      testServer.setHtml(html);
      testServer.setOptions({ whitelist: ['.no'] });

      expect(await fetchAmpCss(testServer.port)).toEqual('.no{background:red}');
    });

    describe('debug mode', () => {
      const originalConsoleLog = console.log;

      beforeAll(() => {
        console.log = jest.fn();
      });

      afterAll(() => {
        console.log = originalConsoleLog;
      });

      it('reports how many bytes were removed', async () => {
        const html = getHtml({
          head: '<style amp-custom>.a {}</style>',
        });

        testServer.setHtml(html);
        testServer.setOptions({ debug: true });

        await fetch(`http://localhost:${testServer.port}`);

        expect(console.log).toHaveBeenCalledWith('Purge AMP CSS removed 5 bytes of unused CSS (100.00%)');
      });

      it('report if no AMP CSS found', async () => {
        const html = getHtml();

        testServer.setHtml(html);
        testServer.setOptions({ debug: true });

        await fetch(`http://localhost:${testServer.port}`);

        expect(console.log).toHaveBeenCalledWith('Purge AMP CSS found no <style amp-custom> element');
      });
    });
  });
});
