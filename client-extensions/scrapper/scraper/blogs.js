const axios = require("axios");
const cheerio = require("cheerio");
const fs = require("fs");
const path = require("path");

const BASE_URL = "https://www.thenirvanalab.com";
const OUTPUT_DIR = path.join(__dirname, "blogs");

if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR);
}

// Extract slug
function getSlug(url) {
  return url.replace(/\/$/, "").split("/").pop();
}

// Save filtered HTML
async function saveBlogHtml(url) {
  try {
    const { data } = await axios.get(url, {
      headers: { "User-Agent": "Mozilla/5.0" },
    });

    const $ = cheerio.load(data);

    const postContent = $('div[data-elementor-type="wp-post"][data-elementor-post-type="post"]').first();

    if (!postContent.length) {
      console.log(`No content found: ${url}`);
      return;
    }

     postContent.find('[data-widget_type="image.default"]').remove();

    const slug = getSlug(url);
    const filePath = path.join(OUTPUT_DIR, `${slug}.html`);

    fs.writeFileSync(filePath, $.html(postContent), "utf-8");

    console.log(`Saved HTML: ${slug}.html`);
  } catch (err) {
    console.error(`Error saving blog: ${url}`);
  }
}

// Extract metadata
async function getBlogCards(pageUrl) {
  try {
    const { data } = await axios.get(pageUrl, {
      headers: { "User-Agent": "Mozilla/5.0" },
    });

    const $ = cheerio.load(data);
    const blogs = [];

    $('div[data-elementor-type="loop-item"]').each((_, el) => {
      const container = $(el);

      const titleEl = container.find("h2 a");
      const title = titleEl.text().trim();
      const url = titleEl.attr("href");
    const slug = getSlug(url);

      const image = container.find("img").attr("src") || "";

      const summary = container
        .find(".elementor-widget-theme-post-excerpt")
        .text()
        .trim();

      const date = container.find("time").text().trim();

      if (title && url) {
        blogs.push({ title, url, slug, image, summary, date });
      }
    });

    return blogs;
  } catch (err) {
    console.error("Error fetching page:", pageUrl);
    return [];
  }
}

// Crawl pages
async function crawlAllBlogs(maxPages = 10) {
  let allBlogs = [];

  for (let page = 1; page <= maxPages; page++) {
    const url =
      page === 1
        ? `${BASE_URL}/blogs/`
        : `${BASE_URL}/blogs/${page}/`;

    console.log(`Scraping page ${page}`);

    const blogs = await getBlogCards(url);

    if (!blogs.length) break;

    allBlogs = allBlogs.concat(blogs);

    await new Promise((r) => setTimeout(r, 1000));
  }

  return allBlogs;
}

// Run
(async () => {
  const blogs = await crawlAllBlogs(18);

  // Save HTML files
  for (const blog of blogs) {
    await saveBlogHtml(blog.url);
    await new Promise((r) => setTimeout(r, 1000));
  }

  // Save JSON metadata
  fs.writeFileSync(
    "blogs.json",
    JSON.stringify(blogs, null, 2),
    "utf-8"
  );

  console.log(`\nSaved ${blogs.length} blogs metadata + HTML files`);
})();