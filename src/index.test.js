import http from 'http';
import getPort from 'get-port';
import fetch from 'node-fetch';
import { parse } from 'node-html-parser';

import purifyAmpCss from './index';

const getDocument = async ({
  head = '',
  body = '',
  responseMethod = 'end',
  options,
} = {}) => {
  const port = await getPort();

  const doc = `
    <!doctype html>
    <head>
      ${head}
    </head>
    <html>
      <body>
        ${body}
      </body>
    </html>
  `;

  const server = http.createServer((req, res) => {
    const purify = purifyAmpCss(options);

    purify(req, res);

    if (responseMethod === 'end') {
      res.end(doc);
    }

    if (responseMethod === 'write') {
      res.write(doc);
      res.end();
    }
  });

  server.listen(port);

  const res = await fetch(`http://127.0.0.1:${port}`);
  const nodeHttpParserOpts = {
    style: true,
    script: true,
    comments: true,
    pre: true,
  };

  server.close();

  return {
    original: parse(doc, nodeHttpParserOpts),
    purified: parse(await res.text(), nodeHttpParserOpts),
  };
};

describe('Purify AMP CSS', () => {
  describe.each(['write', 'end'])('response.%s', (responseMethod) => {
    it.each('strips unused css from the response', async () => {
      const { purified } = await getDocument({
        responseMethod,
        head: '<style amp-custom>.yes { background: green; } .no { background: red; }</style>',
        body: '<div class="yes" />',
      });

      const ampCss = purified
        .querySelector('head')
        .childNodes
        .find((node) => node.tagName === 'style')
        .text;

      expect(ampCss).toEqual('.yes{background:green}');
    });

    it('does not strip anything extra from the document head', async () => {
      const { original, purified } = await getDocument({
        head: `
          <style />
          <meta />
          <script />
          <noscript />
          <base />
        `,
      });

      expect(original.toString()).toEqual(purified.toString());
    });

    it('returns the document unchanged if no AMP CSS', async () => {
      const { original, purified } = await getDocument({ body: '<div class="yes" />' });

      expect(original.toString()).toEqual(purified.toString());
    });

    it('does not minify the AMP CSS if minification disabled', async () => {
      const { purified } = await getDocument({
        responseMethod,
        head: '<style amp-custom>.yes { background: green; }</style>',
        body: '<div class="yes" />',
        options: { minify: false },
      });

      const ampCss = purified
        .querySelector('head')
        .childNodes
        .find((node) => node.tagName === 'style')
        .text;

      expect(ampCss).toEqual('.yes {\n  background: green;\n}');
    });

    it('does not remove whitelisted selectors', async () => {
      const { purified } = await getDocument({
        responseMethod,
        head: '<style amp-custom>.no { background: red; }</style>',
        options: { whitelist: ['.no'] },
      });

      const ampCss = purified
        .querySelector('head')
        .childNodes
        .find((node) => node.tagName === 'style')
        .text;

      expect(ampCss).toEqual('.no{background:red}');
    });
  });
});
