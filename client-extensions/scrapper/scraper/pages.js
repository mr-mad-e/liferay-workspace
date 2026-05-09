import fs from "fs";
import path from "path";
import * as cheerio from 'cheerio';

const BASE_URL = "https://www.thenirvanalab.com";
const OUTPUT_DIR = path.join(process.cwd(), "pages1");

if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

function sanitizeFileName(url) {
  let name = url
    .replace(BASE_URL + "/", "")
    .replace(/\/$/, "")
    .replace(/\//g, "_");

  if (!name) name = "home";

  return name.replace(/[^a-z0-9_\-]/gi, "").slice(0, 100) + ".html";
}

function delay(ms) {
  return new Promise(res => setTimeout(res, ms));
}

/**
 * Get first-level URLs from homepage
 */
async function getFirstLevelUrls() {
  const res = await fetch(BASE_URL);
  const html = await res.text();
  const $ = cheerio.load(html);

  const urls = new Set();

  $("a[href]").each((_, el) => {
    let href = $(el).attr("href");
    if (!href) return;

    // ignore anchors, mail, tel
    if (href.startsWith("#") || href.startsWith("mailto:") || href.startsWith("tel:")) return;

    // convert relative → absolute
    try {
      href = new URL(href, BASE_URL).href;
    } catch {
      return;
    }

    // must be same domain
    if (!href.startsWith(BASE_URL)) return;

    // keep ONLY first-level paths
    const pathPart = href.replace(BASE_URL, "");
    const depth = pathPart.split("/").filter(Boolean).length;

    if (depth <= 1) {
      urls.add(href.split("?")[0]);
    }
  });

  return [...urls];
}

async function run() {
  const urls = await getFirstLevelUrls();

  console.log("Found URLs:", urls.length);
  console.log(urls);

  for (const url of urls) {
    try {
      console.log("Processing:", url);

      const res = await fetch(url);
      const htmlText = await res.text();

      const $ = cheerio.load(htmlText);

      $("script, meta, header, footer").remove();
      $('[class^="cky-"], [class*=" cky-"]').remove();

      const body = $("body");

      if (body.length) {
        const div = $("<div></div>");

        Object.entries(body[0].attribs || {}).forEach(([k, v]) => {
          div.attr(k, v);
        });

        div.html(body.html());
        body.replaceWith(div);
      }

      const finalHTML = "<!DOCTYPE html>\n" + $.html();

      const fileName = sanitizeFileName(url);
      const filePath = path.join(OUTPUT_DIR, fileName);

      fs.writeFileSync(filePath, finalHTML, "utf8");

      console.log("Saved:", fileName);

      await delay(1000);
    } catch (err) {
      console.error("Failed:", url, err.message);
    }
  }

  console.log("Done!");
}

run();