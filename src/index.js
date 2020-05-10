export default () => {
  return (req, res, next) => {
    const { end } = res;

    res.end = (originalData, ...args) => {
      res.data = res.data || '';

      if (typeof originalData === 'string') {
        res.data += originalData;
      }

      if (originalData instanceof Buffer) {
        res.data += originalData.toString();
      }

      const ampCssMatch = (/<style[\s\r\n]+amp-custom>(.*?)<\/style>/i.exec(res.data));
      const bodyMatch = (/<body.*?>(.*?)<\/body>/i.exec(res.data));

      if (!bodyMatch || !ampCssMatch) {
        return end.call(res, res.data, ...args);
      }

      purify(bodyMatch[1], ampCssMatch[1], { minify: true }, (purifiedCss) => {
        res.data = res.data.replace(/<style[\s\r\n]+amp-custom>.*?<\/style>/i, `<style amp-custom>${purifiedCss}</style>`);

        if (res.data !== undefined && !res._header) {
          res.setHeader('content-length', Buffer.byteLength(res.data, ...args));
        }

        end.call(res, res.data, ...args);
      });
    };
  };
};
