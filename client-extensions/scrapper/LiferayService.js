// --- Liferay API Helper ---
import { LiferayUtil } from '../../ui/src/sweetalert2';

/**
 * Helper for making API requests to Liferay
 */
export const liferayFetch = async (url, method = 'GET', body = null) => {
  try {
    const isGet = method === 'GET';
    const isBodyMethod = ['POST', 'PUT', 'PATCH'].includes(method);

    // Build URL with query params for GET
    if (body && isGet) {
      const queryParams = new URLSearchParams(body).toString();
      if (queryParams) {
        url += `?${queryParams}`;
      }
    }

    const options = {
      method,
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        'X-Accept-All-Languages': true,
      },
      credentials: 'include',
      ...(body && isBodyMethod && { body: JSON.stringify(body) }),
    };

    const response = await Liferay.Util.fetch(url, options);

    // Check if response is JSON
    const contentType = response.headers.get('content-type');
    const isJson = contentType && contentType.includes('application/json');

    const data = isJson ? await response.json().catch(() => null) : null;

    if (response.status === 200) return data;
    if (response.status === 404) return null;

    // Handle HTTP errors
    if (data?.detail) {
      data.detail = JSON.parse(data.detail);
    }
    const errorMessage = data?.message || data?.detail?.[0]?.errorMessage || 'Something went wrong';

    LiferayUtil.openToast({
      message: errorMessage,
      type: 'danger',
      title: 'Error',
      autoClose: true,
      duration: 3000,
    });

    return null;
  } catch (error) {
    console.error('liferayFetch error:', error);
    return null;
  }
};

// --- OAuth2 Client ---
/**
 * Get OAuth2 client instance or fetch wrapper with custom headers
 */
export const getOAuth2Client = (name, customHeaders, portal) => {
  let oAuth2Client;
  try {
    oAuth2Client = Liferay.OAuth2Client.FromUserAgentApplication(name);
    if (customHeaders) {
      return {
        fetch: async (url, options) => {
          const token = await oAuth2Client._getOrRequestToken();
          if (options.headers.append) {
            options.headers.append('Authorization', `Bearer ${token.access_token}`);
          }
          return Liferay.Util.fetch(
            portal ? window.themeDisplay.getPortalURL() + url : oAuth2Client.homePageURL + url,
            options
          );
        },
      };
    }
    return oAuth2Client;
  } catch (error) {
    console.error('Failed to initialize OAuth2 client:', error);
    return { fetch: Liferay.Util.fetch };
  }
};

// --- Content Fetchers ---
export const fetchDocumentById = async (documentId) =>
  liferayFetch(`/o/headless-delivery/v1.0/documents/${documentId}`);

export const fetchWebContentsByAssetLibrary = async (assetLibraryId) => {
  const data = await liferayFetch(
    `/o/headless-delivery/v1.0/asset-libraries/${assetLibraryId}/structured-contents?pageSize=500&sort=dateModified:desc`
  );
  return data?.items || [];
};

export const getSiteStructuredContentsPage = async (siteId) => {
  const data = await liferayFetch(
    `/o/headless-delivery/v1.0/sites/${siteId}/structured-contents?pageSize=500&sort=dateModified:desc`
  );
  return data?.items || [];
};

export const fetchKnowledgeBaseArticles = async (site) => {
  const data = await liferayFetch(
    `/o/headless-delivery/v1.0/sites/${site.id}/knowledge-base-articles?pageSize=500&sort=dateModified:desc`
  );
  return data?.items || [];
};

export const fetchBlogEntries = async (site) => {
  const data = await liferayFetch(
    `/o/headless-delivery/v1.0/sites/${site.id}/blog-postings?pageSize=500&sort=dateModified:desc`
  );
  return data?.items || [];
};

export const fetchSites = async () => {
  const data = await liferayFetch('/o/headless-admin-user/v1.0/my-user-account/sites');
  return data?.items || [];
};

const getSEOValue = (value) => {
  const value_i18n = {};
  Object.keys(value).forEach((key) => {
    const _key = key === 'zh-Hans-CN' ? 'zh-CN' : key;
    value_i18n[_key.replace('-', '_')] = value[key];
  });

  return value_i18n;
};

export const fetchPages = async (site) => {
  const data = await liferayFetch(
    `/o/headless-delivery/v1.0/sites/${site.id}/site-pages?pageSize=500&sort=dateModified:desc`
  );

  return (data?.items || []).map((item) => {
    if (item.pageSettings) {
      if (item.pageSettings.seoSettings) {
        item.pageSettings.seoSettings.htmlTitle_i18n = getSEOValue(item.pageSettings.seoSettings.htmlTitle_i18n);
        item.pageSettings.seoSettings.description_i18n = getSEOValue(item.pageSettings.seoSettings.description_i18n);
        item.pageSettings.seoSettings.seoKeywords_i18n = getSEOValue(item.pageSettings.seoSettings.seoKeywords_i18n);
      }

      if (item.pageSettings.openGraphSettings) {
        item.pageSettings.openGraphSettings.title_i18n = getSEOValue(item.pageSettings.openGraphSettings.title_i18n);
        item.pageSettings.openGraphSettings.description_i18n = getSEOValue(
          item.pageSettings.openGraphSettings.description_i18n
        );
        item.pageSettings.openGraphSettings.imageAlt_i18n = getSEOValue(
          item.pageSettings.openGraphSettings.imageAlt_i18n
        );
      }

      if (item.pageSettings.customMetaTags) {
        item.pageSettings.customMetaTags = item.pageSettings.customMetaTags.map((tag) => {
          tag.value_i18n = getSEOValue(tag.value_i18n);
          return tag;
        });
      }
    }

    return item;
  });
};

export const fetchLanguagesBySiteId = async (siteId) => {
  const data = await liferayFetch(`/o/headless-delivery/v1.0/sites/${siteId}/languages`);
  return data?.items || [];
};

export const fetchAssetLibraries = async () => {
  try {
    const pAuth = window.Liferay?.authToken;
    const companyId = window.Liferay?.ThemeDisplay?.getCompanyId();
    const data = await fetch(
      `/api/jsonws/group/get-groups?companyId=${companyId}&parentGroupId=0&site=false&p_auth=${pAuth}`
    ).then((res) => res.json());
    return (data ?? []).filter(({ type }) => type === 5);
  } catch (error) {
    console.error('Error fetching asset libraries:', error);
    return [];
  }
};

// --- Commerce ---
export const fetchCommerceChannels = async () => {
  const data = await liferayFetch('/o/headless-commerce-admin-channel/v1.0/channels');
  return data?.items || [];
};

export const fetchProductsByChannel = async (channelId) => {
  const data = await liferayFetch(`/o/headless-commerce-delivery-catalog/v1.0/channels/${channelId}/products`);
  return data?.items || [];
};

export const fetchProduct = async (productId) =>
  liferayFetch(`/o/headless-commerce-admin-catalog/v1.0/products/${productId}`);

export const updateProduct = async (product) =>
  liferayFetch(`/o/headless-commerce-admin-catalog/v1.0/products/${product.productId}`, 'PATCH', product);

// --- Object Utilities ---
export const getObjectByFilter = async (objectName, { filter, nestedFields, sort, pageSize } = {}) => {
  const endpoint = `/o/c/${objectName.toLowerCase()}`;
  const params = new URLSearchParams();
  if (pageSize) params.append('pageSize', pageSize);
  if (filter) params.append('filter', filter);
  if (nestedFields) params.append('nestedFields', nestedFields);
  if (sort) params.append('sort', sort);
  const url = params.toString() ? `${endpoint}?${params}` : endpoint;
  const result = await liferayFetch(url);
  return result?.items ?? [];
};

export const getObjectById = async (objectName, { nestedFields, id } = {}) => {
  let endpoint = `/o/c/${objectName}/${id}`;
  if (nestedFields) {
    endpoint += `?nestedFields=${nestedFields}`;
  }
  return await liferayFetch(endpoint);
};

export const getObjectByERC = async (objectName, { nestedFields, externalReferenceCode } = {}) => {
  let endpoint = `/o/c/${objectName}/by-external-reference-code/${externalReferenceCode}`;
  if (nestedFields) {
    endpoint += `?nestedFields=${nestedFields}`;
  }
  return await liferayFetch(endpoint);
};

export const upsertObject = async (objectName, data, flag) => {
  const baseUrl = `/o/c/${objectName}`;
  if (!flag && data.id) {
    // Update
    return await liferayFetch(`${baseUrl}/${data.id}`, 'PATCH', data);
  }
  // Create
  return await liferayFetch(baseUrl, 'POST', data);
};

export const deleteObject = async (objectName, id) => liferayFetch(`/o/c/${objectName}/${id}`, 'DELETE');

export const deleteAllObjects = async (objectName, { filter, nestedFields, sort, pageSize } = {}) => {
  const data = await getObjectByFilter(objectName, { filter, nestedFields, sort, pageSize });
  return Promise.all(data.map((item) => deleteObject(objectName, item.id)));
};

// --- Blog & KB Utilities ---
export const updateBlogFriendlyUrl = async (blog) =>
  liferayFetch(`/o/headless-delivery/v1.0/blog-postings/${blog.id}`, 'PUT', blog);

export const updateKnowledgeBaseFriendlyUrl = async (blog) =>
  liferayFetch(`/o/headless-delivery/v1.0/knowledge-base-articles/${blog.id}`, 'PUT', blog);

// --- Documents ---
export const upsertSiteDocument = async ({ siteId, file, externalReferenceCode }) => {
  const formdata = new FormData();
  formdata.append('document', JSON.stringify({ externalReferenceCode }));
  formdata.append('file', file, file.name);
  const requestOptions = {
    method: 'PUT',
    body: formdata,
    redirect: 'follow',
  };
  const response = await Liferay.Util.fetch(
    `/o/headless-delivery/v1.0/sites/${siteId}/documents/by-external-reference-code/${externalReferenceCode}`,
    requestOptions
  );
  if (!response.ok) {
    return null;
  }
  return await response.json();
};

export const uploadFolderDocument = async ({ file, externalReferenceCode, documentFolderId, title, description }) => {
  const formdata = new FormData();
  formdata.append(
    'document',
    JSON.stringify({
      externalReferenceCode,
      documentFolderId,
      title,
      description,
    })
  );
  formdata.append('file', file, file.name);
  const requestOptions = {
    method: 'POST',
    body: formdata,
    redirect: 'follow',
  };
  const response = await Liferay.Util.fetch(
    `/o/headless-delivery/v1.0/document-folders/${documentFolderId}/documents`,
    requestOptions
  );
  if (!response.ok) {
    return null;
  }
  return await response.json();
};

export const uploadBlogImage = async ({ siteId, file, externalReferenceCode, title }) => {
  const formdata = new FormData();
  formdata.append(
    'blogPostingImage',
    JSON.stringify({
      externalReferenceCode,
      title: Date.now(),
    })
  );
  formdata.append('file', file, file.name);
  const requestOptions = {
    method: 'POST',
    body: formdata,
    redirect: 'follow',
  };
  const response = await Liferay.Util.fetch(
    `/o/headless-delivery/v1.0/sites/${siteId}/blog-posting-images`,
    requestOptions
  );
  if (!response.ok) {
    return null;
  }
  return await response.json();
};

export const uploadArticleAttachment = async ({ siteId, file, externalReferenceCode, title, knowledgeBaseArticleId }) => {
  const formdata = new FormData();
  formdata.append(
    'knowledgeBaseAttachment',
    JSON.stringify({
      externalReferenceCode,
      title: Date.now(),
    })
  );
  formdata.append('file', file, file.name);
  const requestOptions = {
    method: 'POST',
    body: formdata,
    redirect: 'follow',
  };

  const response = await Liferay.Util.fetch(
    `/o/headless-delivery/v1.0/knowledge-base-articles/${knowledgeBaseArticleId}/knowledge-base-attachments`,
    requestOptions
  );
  if (!response.ok) {
    return null;
  }
  return await response.json();
};

export const getArticleAttachment = async (siteId, externalReferenceCode1, externalReferenceCode2) =>
  liferayFetch(
    `/o/headless-delivery/v1.0/sites/${siteId}/knowledge-base-articles/by-external-reference-code/${externalReferenceCode1}/knowledge-base-attachments/by-external-reference-code/${externalReferenceCode2}`
  );

export const getBlogImageByERC = async (siteId, externalReferenceCode) =>
  liferayFetch(
    `/o/headless-delivery/v1.0/sites/${siteId}/blog-posting-images/by-external-reference-code/${externalReferenceCode}`
  );

export const getSiteDocumentByERC = async (siteId, externalReferenceCode) =>
  liferayFetch(
    `/o/headless-delivery/v1.0/sites/${siteId}/documents/by-external-reference-code/${externalReferenceCode}`
  );

export const getSiteDocumentFolderByERC = async (siteId, externalReferenceCode) =>
  liferayFetch(
    `/o/headless-delivery/v1.0/sites/${siteId}/documents-folder/by-external-reference-code/${externalReferenceCode}`
  );

export const createSiteDocumentFolder = async (siteId, folderData) =>
  liferayFetch(`/o/headless-delivery/v1.0/sites/${siteId}/document-folders`, 'POST', folderData);

// --- List Types & Relationships ---
export const fetchListTypeEntriesByERC = async (externalReferenceCode) => {
  const data = await liferayFetch(
    `/o/headless-admin-list-type/v1.0/list-type-definitions/by-external-reference-code/${externalReferenceCode}/list-type-entries`
  );
  return data?.items || [];
};

// --- Blog Posting ---
export const createBlog = async (blogData, siteId) =>
  liferayFetch(`/o/headless-delivery/v1.0/sites/${siteId}/blog-postings`, 'POST', blogData);

export const createArticle = async (articleData, siteId) =>
  liferayFetch(`/o/headless-delivery/v1.0/sites/${siteId}/knowledge-base-articles`, 'POST', articleData);

export const createStructuredContent = async (assetLibraryId, contentData) =>
  liferayFetch(`/o/headless-delivery/v1.0/asset-libraries/${assetLibraryId}/structured-contents`, 'POST', contentData);

export const postSiteStructuredContent = async (siteId, contentData) =>
  liferayFetch(`/o/headless-delivery/v1.0/sites/${siteId}/structured-contents`, 'POST', contentData);

export const fetchUser = () => {
  return liferayFetch('/o/headless-admin-user/v1.0/my-user-account');
};

// CMS
export const fetchBlogs = async (site) => {
  const data = await liferayFetch(`/o/cms/blogs/scopes/${site.groupId}?pageSize=500&sort=dateModified:desc`);
  return data?.items || [];
};

export const fetchBasicWebContents = async (assetLibraryId) => {
  const data = await liferayFetch(
    `/o/cms/basic-web-contents/scopes/${assetLibraryId}?pageSize=500&sort=dateModified:desc`
  );
  return data?.items || [];
};

export const fetchDisplayPageTemplates = async (siteId) => {
  const data = await liferayFetch(`/o/headless-admin-content/v1.0/sites/${siteId}/display-page-templates`);
  return data?.items || [];
};

export const postCMSBlog = async (blogData, siteId) =>
  liferayFetch(`/o/cms/blogs/scopes/${siteId}`, 'POST', blogData);

export const postCMSContent  = async (blogData, siteId) =>
  liferayFetch(`/o/cms/basic-web-contents/scopes/${siteId}`, 'POST', blogData);


