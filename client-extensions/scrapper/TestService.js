import { sampleSize } from 'lodash';

import blogs from './data/blogs.json';
import pages from './data/pages.json';

import {
  liferayFetch,
  createBlog,
  getSiteDocumentFolderByERC,
  createSiteDocumentFolder,
  createArticle,
  uploadFolderDocument,
  uploadBlogImage,
  uploadArticleAttachment,
  createStructuredContent,
  getBlogImageByERC,
  getArticleAttachment,
  postSiteStructuredContent,
  postCMSBlog,
  postCMSContent,
} from './LiferayService';

const siteId = '20126';

export const importBlogs = async () => {
  for (const item of sampleSize(blogs, 20)) {
    try {
      const document = await importBlogImage(item);
      await createBlog(
        {
          headline: item.title,
          externalReferenceCode: slugify(item.title),
          articleBody: item.summary,
          image: document
            ? {
                caption: 'item.title',
                imageId: document.id,
              }
            : undefined,
        },
        siteId
      );
    } catch (error) {
      console.error(`Error processing blog: ${item.title}:`, error);
    }
  }
};

export const importCMSBlogs = async () => {
  for (const item of sampleSize(blogs, 20)) {
    try {
      const fileName = item.image.split('/').at(-1);
      const externalReferenceCode = item.url.split('/').at(-2);

      await postCMSBlog(
        {
          title: item.title,
          externalReferenceCode: slugify(item.title),
          content: item.summary,
          objectEntryFolderExternalReferenceCode: 'L_CONTENTS',
          coverImage: {
            externalReferenceCode: externalReferenceCode,
            fileURL: item.image,
            name: fileName,
          },
        },
        'space'
      );
    } catch (error) {
      console.error(`Error processing blog: ${item.title}:`, error);
    }
  }
};

export const importCMSContents = async () => {
  for (const item of sampleSize(blogs, 20)) {
    try {
      await postCMSContent(
        {
          title: item.title,
          externalReferenceCode: slugify(item.title),
          content: item.summary,
          objectEntryFolderExternalReferenceCode: 'L_CONTENTS',
        },
        'space'
      );
    } catch (error) {
      console.error(`Error processing blog: ${item.title}:`, error);
    }
  }
};

export const importArticles = async () => {
  for (const item of sampleSize(blogs, 20)) {
    try {
      const article = await createArticle(
        {
          title: item.title,
          description: item.summary,
          externalReferenceCode: slugify(item.title),
          articleBody: item.summary,
        },
        siteId
      );

      if (article) {
        await importArticleAttachment(item, article);
      }
    } catch (error) {
      console.error(`Error processing article: ${item.title}:`, error);
    }
  }
};

export const importContents = async () => {
  for (const item of sampleSize(blogs, 20)) {
    try {
      await createStructuredContent(
        42398,
        {
          title: item.title,
          description: item.summary,
          externalReferenceCode: slugify(item.title),
          contentStructureId: 31691,
          contentFields: [
            {
              contentFieldValue: {
                data: item.summary,
              },
              dataType: 'string',
              label: 'Content',
              name: 'content',
              nestedContentFields: [],
              repeatable: false,
            },
          ],
        },
        siteId
      );
    } catch (error) {
      console.error(`Error processing content: ${item.title}:`, error);
    }
  }
};

export const importSiteContents = async () => {
  for (const item of sampleSize(blogs, 20)) {
    try {
      await postSiteStructuredContent(
        siteId,
        {
          title: item.title,
          description: item.summary,
          externalReferenceCode: slugify(item.title),
          contentStructureId: 31691,
          contentFields: [
            {
              contentFieldValue: {
                data: item.summary,
              },
              dataType: 'string',
              label: 'Content',
              name: 'content',
              nestedContentFields: [],
              repeatable: false,
            },
          ],
        },
        siteId
      );
    } catch (error) {
      console.error(`Error processing content: ${item.title}:`, error);
    }
  }
};

function slugify(text) {
  return text
    .toString() // Ensure it's a string
    .toLowerCase() // Convert to lowercase
    .trim() // Remove whitespace
    .replace(/[\s\W-]+/g, '-') // Replace spaces & non-word chars with hyphen
    .replace(/^-+|-+$/g, ''); // Remove leading/trailing hyphens
}

const createPage = async (title, page) => {
  try {
    const reqBody = {
      name: title,
      parentLayoutId: page?.pageId || 0,
      siteId,
      friendlyURL: page ? `${page.friendlyURL}/${slugify(title)}` : `/${slugify(title)}`,
    };

    return await liferayFetch(`/o/nl-marketing-accelerator/v1.0/api/site/generate/site-page`, 'POST', reqBody);
  } catch (error) {
    console.error(`Error processing page: ${title}:`, error);
    throw error;
  }
};

async function createPagesRecursively(node, parent = null) {
  if (!node) return;

  for (const key in node) {
    // Create current page
    const currentPage = await createPage(key, parent);

    // Recurse into children
    if (node[key] && typeof node[key] === 'object') {
      await createPagesRecursively(node[key], currentPage);
    }
  }
}

export const importPages = async () => {
  try {
    await createPagesRecursively(pages);
  } catch (error) {
    console.error('Error during page import:', error);
  }
};

export const documentFolder = {
  externalReferenceCode: '80cb4ee2-0848-26f2-d83f-89133086b999',
  name: 'NL Marketing Accelerator',
};

export const importDocuments = async () => {
  let folder = await getSiteDocumentFolderByERC(siteId, documentFolder.externalReferenceCode);
  if (!folder) {
    folder = await createSiteDocumentFolder(siteId, documentFolder);
  }

  for (const image of sampleSize(blogs, 20)) {
    const fileName = image.image.split('/').at(-1);
    const externalReferenceCode = image.url.split('/').at(-2);

    const response = await fetch(image.image.replace('https://www.thenirvanalab.com', 'http://localhost:3000'));
    const blob = await response.blob();

    const file = new File([blob], fileName, {
      type: blob.type,
    });

    await uploadFolderDocument({
      title: image.title,
      description: image.description,
      documentFolderId: folder.id,
      file,
      externalReferenceCode,
    });
  }
};

export const importBlogImage = async (image) => {
  const fileName = image.image.split('/').at(-1);
  const externalReferenceCode = image.url.split('/').at(-2);

  const response1 = await getBlogImageByERC(siteId, externalReferenceCode);
  if (response1) {
    return response1;
  }

  const response = await fetch(image.image.replace('https://www.thenirvanalab.com', 'http://localhost:3000'));
  const blob = await response.blob();

  const file = new File([blob], fileName, {
    type: blob.type,
  });

  return await uploadBlogImage({
    siteId,
    title: image.title,
    file,
    externalReferenceCode,
  });
};

export const importArticleAttachment = async (image, article) => {
  const fileName = image.image.split('/').at(-1);
  const externalReferenceCode = image.url.split('/').at(-2);

  const response1 = await getArticleAttachment(siteId, article.externalReferenceCode, externalReferenceCode);
  if (response1) {
    return response1;
  }

  const response = await fetch(image.image.replace('https://www.thenirvanalab.com', 'http://localhost:3000'));
  const blob = await response.blob();

  const file = new File([blob], fileName, {
    type: blob.type,
  });

  return await uploadArticleAttachment({
    siteId,
    knowledgeBaseArticleId: article.id,
    title: image.title,
    description: image.description,
    file,
    externalReferenceCode,
  });
};

// importPages();
// importSiteContents();
// importContents();
// importBlogs();
// importCMSBlogs();
// importArticles();
// importDocuments();
// importCMSContents();
