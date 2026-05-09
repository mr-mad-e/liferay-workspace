import fs from 'fs/promises';
import path from 'path';
import slugify from 'slugify';
import { client } from './client.js';

slugify.extend({ '&': '-', '/': '-' });

const siteId = '20126';
// const siteId = '1094776';

const HTML_DIR = path.join(process.cwd(), 'html');

const pages = {
  Home: 'home',
  Services: {
    'Apps & Integration': {
      'Web Portal – CMS & DXP': 'web-portal-cms-dxp',
      'API Integration': 'api-integration',
      Mobility: 'mobility',
      'UI/UX Designs': 'ui-ux-design',
      'Integration Platforms': 'integration-platforms',
    },
    'Business Solution': {
      'Business Portal': 'business-portal',
      'Supplier Portal': 'supplier-portal',
      'E-Commerce': 'e-commerce',
      'Partner Portal': 'partner-portal',
      'Digital Transformation': 'digital-transformation',
      'Marketing Accelerator': 'marketing-accelerator',
      'AI Virtual Assistant': 'ai-virtual-assistant',
    },
    'Cloud & DevOps': {
      'Cloud Strategy & Consulting': 'cloud-strategy-consulting',
      DevOps: 'devops',
    },
    'Data Insights': {
      'Analytics & Business Intelligence': 'analytics-business-intelligence',
      'Data Science': 'data-science',
    },
  },
  Technologies: {
    'Apps & Integration': {
      Liferay: 'liferay-dxp',
      WordPress: 'wordpress',
      Talend: 'talend',
      'Micro Services': 'micro-services',
    },
    'Business Solution': {
      'Analytics & Business Intelligence': 'analytics-business-intelligence',
      'Dynamics CRM': 'dynamic-crm',
      Salesforce: 'salesforce',
      SAP: 'sap',
    },
    'Cloud & DevOps': {
      'Cloud Consulting': 'cloud-strategy-consulting',
      DevOps: 'devops',
      'AWS Infra Services': 'aws-infra-services',
      'Cloud Migration Services': 'cloud-migration-services',
    },
    'Data Insights': {
      'Data Engineering': 'data-engineering',
      'Power BI': 'power-bi',
      Talend: 'talend',
    },
  },
  Industries: {
    Manufacturing: 'manufacturing',
    'Higher Education': 'higher-education',
    'Digital Commerce': 'digital-commerce',
    'Energy & Utilities': 'energy-utilities',
    Government: 'government',
    Healthcare: 'healthcare',
  },
  Company: {
    'About Nirvana Lab': 'about-us',
    Leadership: 'leadership',
    Customers: 'customers',
  },
  Careers: 'careers',
  Resources: {
    Blogs: 'blogs',
    Events: 'events',
    'Case Studies': 'case-studies',
    Newsletters: 'newsletters',
    Whitepapers: 'whitepapers',
  },
  'Contact Us': 'contact',
};

/**
 * Utils
 */
const getSlug = (title) => slugify(title, { lower: true, strict: true });

const getFilePath = (value) => (typeof value === 'string' ? path.join(HTML_DIR, `${value}_.html`) : null);

const readHtmlFile = async (filePath) => {
  if (!filePath) return '';

  try {
    return await fs.readFile(filePath, 'utf-8');
  } catch {
    console.warn(`⚠️ Missing HTML file: ${filePath}`);
    return '';
  }
};

/**
 * Build request payload
 */
const buildPagePayload = ({ title, slug, value, htmlContent, parent }) => {
  const pathSegment = htmlContent ? value : slug;
  const friendlyUrlPath = parent ? `${parent.friendlyUrlPath}/${pathSegment}` : `/${pathSegment}`;

  return {
    title,
    parentSitePage: parent ? { friendlyUrlPath: parent.friendlyUrlPath } : undefined,
    friendlyUrlPath,
    pageType: htmlContent ? 'content' : 'node',
    pageDefinition: htmlContent
      ? {
          pageElement: {
            // id: '9a140814-0578-3227-f510-ff97f235c4f7',
            id: 'a2519fab-85bf-840a-9f00-cf8f3093e83a',
            type: 'Root',
            pageElements: [
              {
                // id: '00a09bf3-a60b-6760-8224-21d2307b1321',
                id: 'd17561dd-61cd-7259-0c9c-89313500b766',
                type: 'Fragment',
                definition: {
                  fragment: { key: 'BASIC_COMPONENT-html' },
                  fragmentConfig: {},
                  fragmentFields: [
                    {
                      id: 'element-html',
                      value: {
                        html: {
                          value_i18n: {
                            en_US: htmlContent,
                          },
                        },
                      },
                    },
                  ],
                  indexed: true,
                },
              },
            ],
          },
          settings: {
            colorSchemeName: '01',
            themeName: 'Classic',
          },
          version: 1.1,
        }
      : undefined,
  };
};

/**
 * API call (stubbed for now)
 */
const createPageRequest = async (body) => {
  // if (body.pageType == 'node') {
  // console.log('📄 Creating page:', body);

  try {
    await client.headlessDelivery.sitePage.postSiteSitePage({ siteId, body });
  } catch (error) {
    console.log('error', body.title, error);
  }
  // }

  return body; // mock response for now
};

/**
 * Main page creator
 */
const createPage = async (title, value, parent) => {
  const slug = getSlug(title);
  const filePath = getFilePath(value);
  const htmlContent = await readHtmlFile(filePath);

  const payload = buildPagePayload({
    title,
    slug,
    value,
    htmlContent,
    parent,
  });

  return createPageRequest(payload);
};

/**
 * Recursive traversal
 */
const createPagesRecursively = async (node, parent = null) => {
  for (const [title, value] of Object.entries(node)) {
    const currentPage = await createPage(title, value, parent);
    // return
    if (value && typeof value === 'object') {
      await createPagesRecursively(value, currentPage);
    }
  }
};

/**
 * Entry point
 */
export const importPages = async (pages) => {
  try {
    await client.init();
    if(!client.headlessDelivery?.sitePage?.postSiteSitePage) {
      throw new Error("API is not ready")
    } // TODO: throw error from proxy object
    await createPagesRecursively(pages);
    console.log('✅ Page import completed');
  } catch (error) {
    console.error('❌ Page import failed:', error);
  }
};

importPages(pages);