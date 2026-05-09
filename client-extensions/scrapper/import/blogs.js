import _ from 'lodash';
import path from 'path';
import fs from 'fs/promises';

import blogs from '../blogs.json' with { type: 'json' };
import { client } from './client.js';

const siteId = '20126';
// const siteId = '1094776';
const BLOGS_DIR = path.join(process.cwd(), 'blogs');

const SAMPLE_SIZE = 20;

/* ---------------------------------- */
/* Utils */
/* ---------------------------------- */

const getFilePath = (slug) => path.join(BLOGS_DIR, `${slug}.html`);

const readHtmlFile = async (filePath) => {
  if (!filePath) return '';
  try {
    return await fs.readFile(filePath, 'utf-8');
  } catch {
    console.warn(`⚠️ Missing HTML file: ${filePath}`);
    return '';
  }
};

const fetchFileFromUrl = async (url) => {
  const res = await fetch(url.replace('https://www.thenirvanalab.com', 'http://localhost:3000'));
  const blob = await res.blob();

  return new File([blob], url.split('/').at(-1), {
    type: blob.type,
  });
};

const processItems = async (handler) => {
  for (const item of _.sampleSize(blogs, SAMPLE_SIZE)) {
    try {
      await handler(item);
    } catch (error) {
      console.error(`❌ ${item.title}`, error);
    }
  }
};

const buildContentField = (data) => ({
  contentFieldValue: { data },
  dataType: 'string',
  label: 'Content',
  name: 'content',
  nestedContentFields: [],
  repeatable: false,
});

/* ---------------------------------- */
/* Importers */
/* ---------------------------------- */

export const importContents = async () =>
  processItems(async (item) => {
    const data = await readHtmlFile(getFilePath(item.slug));

    await client.headlessDelivery.structuredContent.postAssetLibraryStructuredContent({
      assetLibraryId: 41539,
      body: {
        title: item.title,
        description: item.summary,
        externalReferenceCode: item.slug,
        contentStructureId: 31491,
        contentFields: [buildContentField(data)],
      },
    });
  });

export const importSiteContents = async () =>
  processItems(async (item) => {
    const data = await readHtmlFile(getFilePath(item.slug));

    await client.headlessDelivery.structuredContent.postSiteStructuredContent({
      siteId,
      body: {
        title: item.title,
        description: item.summary,
        externalReferenceCode: item.slug,
        contentStructureId: 31491,
        contentFields: [buildContentField(data)],
      },
    });
  });

export const importBlogs = async () =>
  processItems(async (item) => {
    const articleBody = await readHtmlFile(getFilePath(item.slug));
    const image = await importBlogImage(item);

    await client.headlessDelivery.blogPosting.postSiteBlogPosting({
      siteId,
      body: {
        headline: item.title,
        externalReferenceCode: item.slug,
        description: item.summary,
        alternativeHeadline: item.summary,
        articleBody,
        image: image && {
          caption: item.slug,
          imageId: image.data.id,
        },
      },
    });
  });

export const importArticles = async () =>
  processItems(async (item) => {
    const articleBody = await readHtmlFile(getFilePath(item.slug));

    const res = await client.headlessDelivery.knowledgeBaseArticle.postSiteKnowledgeBaseArticle({
      siteId,
      body: {
        title: item.title,
        description: item.summary,
        externalReferenceCode: item.slug,
        articleBody,
      },
    });

    if (res?.data) {
      await importArticleAttachment(item, res.data);
    }
  });

export const importCMSBlogs = async () =>
  processItems(async (item) => {
    const content = await readHtmlFile(getFilePath(item.slug));

    await client.object.cMSBlog.postScopeScopeKey({
      scopeKey: siteId,
      body: {
        title: item.title,
        externalReferenceCode: item.slug,
        content,
        objectEntryFolderExternalReferenceCode: 'L_CONTENTS',
        coverImage: {
          externalReferenceCode: item.slug,
          fileURL: item.image,
          name: item.image.split('/').at(-1),
        },
      },
    });
  });

export const importCMSContents = async () =>
  processItems(async (item) => {
    const content = await readHtmlFile(getFilePath(item.slug));

    await client.object.cMSBasicWebContent.postScopeScopeKey({
      scopeKey: siteId,
      body: {
        title: item.title,
        externalReferenceCode: item.slug,
        content,
        objectEntryFolderExternalReferenceCode: 'L_CONTENTS',
      },
    });
  });

/* ---------------------------------- */
/* Image Upload Logic */
/* ---------------------------------- */

export const importBlogImage = async (item) => {
  const externalReferenceCode = item.slug;

  try {
    return await client.headlessDelivery.blogPostingImage.getSiteBlogPostingImageByExternalReferenceCode({
      siteId,
      externalReferenceCode,
    });
  } catch {}

  const file = await fetchFileFromUrl(item.image);

  const formdata = new FormData();
  formdata.append(
    'blogPostingImage',
    JSON.stringify({
      externalReferenceCode,
      title: externalReferenceCode,
    }),
  );
  formdata.append('file', file, file.name);

  return client.headlessDelivery.blogPostingImage.postSiteBlogPostingImage({
    siteId,
    body: formdata,
  });
};

export const importArticleAttachment = async (item, article) => {
  const externalReferenceCode = item.slug;

  try {
    return await client.headlessDelivery.knowledgeBaseAttachment.getSiteKnowledgeBaseArticleByExternalReferenceCodeKnowledgeBaseArticleExternalReferenceCodeKnowledgeBaseAttachmentByExternalReferenceCode(
      {
        siteId,
        knowledgeBaseArticleExternalReferenceCode: article.externalReferenceCode,
        externalReferenceCode,
      },
    );
  } catch {}

  const file = await fetchFileFromUrl(item.image);

  const body = new FormData();
  body.append(
    'knowledgeBaseAttachment',
    JSON.stringify({
      externalReferenceCode,
      title: externalReferenceCode,
    }),
  );
  body.append('file', file, file.name);

  return client.headlessDelivery.knowledgeBaseAttachment.postKnowledgeBaseArticleKnowledgeBaseAttachment({
    knowledgeBaseArticleId: article.id,
    body,
  });
};

/* ---------------------------------- */
/* Run */
/* ---------------------------------- */

await client.init();

// importPages();
// importSiteContents();
// importContents();
// importBlogs();
// importCMSBlogs();
// importCMSContents();
// importArticles();
// importDocuments();
