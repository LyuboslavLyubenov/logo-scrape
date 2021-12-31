import cheerio = require('cheerio');
import { Helpers } from './Helpers';
import { HtmlLoader } from './HtmlLoader';

export interface ImageData {
  type: string;
  size?: string;
  url: string;
  content?: string;
}

export class ImageSearch {
  public static async findImages(url: string, showAllImages?: boolean): Promise<ImageData | ImageData[]> {
    const response = await HtmlLoader.getHTML(url);
    const $ = cheerio.load(response.html, { lowerCaseTags: true, lowerCaseAttributeNames: true });

    const logos: string[] = [
      { type: 'og:logo', url: $('meta[property="og:logo"]').attr('content') },
      { type: 'meta-itemprop/logo', url: $('meta[itemprop="logo"]').attr('content') },
      ...$('link[rel*="icon"]')
        .map((i, el) => {
          return { type: 'link-rel/icon', url: $(el).attr('href'), size: $(el).attr('sizes') };
        })
        .get(),
      { type: 'img-itemprop/logo', url: $('img[itemprop="logo"]').attr('src') },
      {
        type: 'meta-name/msapplication-TileImage',
        url: $('meta[name*="msapplication-TileImage"]').attr('content')
      },
      { type: 'meta-content/logo', url: $('meta[content*="logo"]').attr('content') },
      { type: 'meta-content/image', url: $('meta[itemprop*="image"]').attr('content') },
      ...$('script[type*="application/ld+json"]')
        .map((i, el) => {
          return { type: 'json-ld-logo', url: Helpers.findJsonLdImages($(el).html()) };
        })
        .get(),
      { type: 'img-alt/logo', url: $('img[alt*="logo"]').attr('src') },
      { type: 'img-alt/logo-class', url: $('img[class*="logo"]').attr('src') },
      { type: 'img-src/logo', url: $('img[src*="logo"]').attr('src') },
      { type: 'og:image', url: $('meta[property="og:image"]').attr('content') },
      // { type: 'svg:image', data: true, url: Helpers.svgToDataURL($('a[class*="logo"]').html()) },
      { type: 'svg:content', passChecking: true, content: this.grabSvgContent($) }
    ].filter(e => e.url || e.content);
    const correctLogos: ImageData[] = logos.map((image: any) => {
      return !Helpers.validUrl(image.url) &&
      image.passChecking !== true &&
      image.url && 
      image.url.indexOf && 
      image.url.indexOf('data:') === -1
        ? { ...image, url: Helpers.concatUrl(response.url, image.url) }
        : image;
    });
    if (showAllImages) {
      return correctLogos;
    } else {
      const [logo] = correctLogos;
      return logo;
    }
  }

  private static grabSvgContent($: CheerioStatic): string | null {
    const svg: Cheerio = $('svg[class*="logo"]');
    if (svg.html() === null) return null;
    return `<svg xmlns="${svg.attr('xmlns')}" viewBox="${svg.attr('viewBox')}" class="${svg.attr('class')}">${svg.html()}</svg>`;
  }
}
