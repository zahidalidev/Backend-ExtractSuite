const axios = require('axios');
const { load } = require('cheerio');
const url = require('url');

const { addressRegex, keyIndicatorsRegex } = require('../constants/regexPatterns');
const { selectors } = require('../constants/selectors');
const { aboutKeywords, serviceKeywords } = require('../constants/websiteKeywords');
const { isInternalLink, isSocialLink, isLogo } = require('./validators');

const NumberOfEmployees = {
  '1-10': '1-10',
  '11-50': '11-50',
  '51-200': '51-200',
  '201-500': '201-500',
  '501-1000': '501-1000',
  '1001-5000': '1001-5000',
  '5001-10000': '5001-10000',
  '10000+': '10000+'
};

const findStartIndex = (bulletPoints, keyword) => {
  if (!bulletPoints || !Array.isArray(bulletPoints)) return -1;
  const index = bulletPoints.findIndex(
    (point) => point.trim().toLowerCase() === keyword.toLowerCase(),
  );
  return index !== -1 ? index + 1 : -1;
};

const findEndIndex = (bulletPoints, startIndex, nextKeywords = []) => {
  if (!bulletPoints || !Array.isArray(bulletPoints)) return -1;
  const nextKeywordIndices = [];
  for (const keyword of nextKeywords) {
    const index = findStartIndex(bulletPoints, keyword);
    if (index !== -1) {
      nextKeywordIndices.push(index);
    }
  }
  const endIndex =
    nextKeywordIndices.length > 0
      ? Math.min(...nextKeywordIndices) - 1
      : bulletPoints.length;
  return endIndex;
};

const extractSection = (bulletPoints, startIndex, endIndex) => {
  if (!bulletPoints || !Array.isArray(bulletPoints)) return [];
  const result = [];
  const slicedPoints = bulletPoints.slice(startIndex, endIndex);
  for (const point of slicedPoints) {
    const cleanedPoint = point.replace(/^\d+\.\s*|-/g, '').trim();
    if (cleanedPoint) {
      result.push(cleanedPoint);
    }
  }
  return result;
};

const checkEmployeeCountFromString = (str) => {
  const regex = /\d+/;
  const match = str?.match(regex);
  return match ? checkEmployeeCount(Number(match[0])) : null;
};

const checkEmployeeCount = (number) => {
  if (number <= 10) return NumberOfEmployees['1-10'];
  if (number <= 50) return NumberOfEmployees['11-50'];
  if (number <= 200) return NumberOfEmployees['51-200'];
  if (number <= 500) return NumberOfEmployees['201-500'];
  if (number <= 1000) return NumberOfEmployees['501-1000'];
  if (number <= 5000) return NumberOfEmployees['1001-5000'];
  if (number <= 10000) return NumberOfEmployees['5001-10000'];
  return NumberOfEmployees['10000+'];
};

const extractContactInfo = (text, domains) => {
  const phoneContacts = [];
  const emailContacts = [];
  let match;
  const existingValues = new Set();

  // modify this regex according to domains
  const contactRegex = /((?:\+\d{1,2}\s?)?\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4})|([a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/g
  // @gmail: \b[A-Za-z0-9._%+-]+@gmail\b
  // @yahoo: \b[A-Za-z0-9._%+-]+@yahoo\b
  // @domain: \b[A-Za-z0-9._%+-]+@domain\b
  // info@: \binfo@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b
  // sales@: \bsales@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b
  // support@: \bsupport@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b
  // contact@: \bcontact@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b
  // admin@: \badmin@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b
  // editor@: \beditor@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b
  // marketing@: \bmarketing@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b
  // feedback@: \bfeedback@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b
  // hr@: \bhr@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b
  // team@: \bteam@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b
  // customerservice@: \bcustomerservice@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b
  // office@: \boffice@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b
  // mail@: \bmail@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b
  // enquiries@: \benquiries@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b
  // @hotmail: \b[A-Za-z0-9._%+-]+@hotmail\b

  while ((match = contactRegex.exec(text)) !== null) {
    const contact = match[0];
    if (!existingValues.has(contact)) {
      existingValues.add(contact);

      const truncatedText = text.replace(/\n|\r/g, '').trim().substring(0, 50);
      
      if (contact.includes('@')) {
        emailContacts.push({
          type: 'Email',
          value: contact,
          text: truncatedText,
        });
      } else {
        phoneContacts.push({
          type: 'Phone',
          value: contact,
          text: truncatedText,
        });
      }
    }
  }
  return { phoneContacts, emailContacts };
};

const extractBulletPoints = (response) => {
  if (!response || !response.choices || !response.choices[0] || !response.choices[0].message || !response.choices[0].message.content) {
    return {
      services: [],
      buys: [],
      keyIndicators: [],
      companySize: [],
      about: [],
      address: [],
      industry: [],
      keywords: [],
      generalCategories: [],
    };
  }

  const content = response.choices[0].message.content;
  const bulletPoints = content.split('\n');

  const servicesStartIndex = findStartIndex(bulletPoints, 'services:');
  const buysStartIndex = findStartIndex(bulletPoints, 'buys:');
  const keyIndicatorsStartIndex = findStartIndex(bulletPoints, 'keyIndicators:');
  const companySizeStartIndex = findStartIndex(bulletPoints, 'companySize:');
  const aboutStartIndex = findStartIndex(bulletPoints, 'about:');
  const addressStartIndex = findStartIndex(bulletPoints, 'address:');
  const industryStartIndex = findStartIndex(bulletPoints, 'industry:');
  const keywordsStartIndex = findStartIndex(bulletPoints, 'keywords:');
  const generalCategoriesStartIndex = findStartIndex(bulletPoints, 'generalCategories:');

  const servicesEndIndex = findEndIndex(bulletPoints, servicesStartIndex, [
    'buys:',
    'keyIndicators:',
    'companySize:',
    'about:',
    'address:',
    'industry:',
    'keywords:',
    'generalCategories:',
  ]);
  const buysEndIndex = findEndIndex(bulletPoints, buysStartIndex, [
    'keyIndicators:',
    'companySize:',
    'about:',
    'address:',
    'industry:',
    'keywords:',
    'generalCategories:',
  ]);
  const keyIndicatorsEndIndex = findEndIndex(bulletPoints, keyIndicatorsStartIndex, [
    'companySize:',
    'about:',
    'address:',
    'industry:',
    'keywords:',
    'generalCategories:',
  ]);
  const companySizeEndIndex = findEndIndex(bulletPoints, companySizeStartIndex, [
    'about:',
    'address:',
    'industry:',
    'keywords:',
    'generalCategories:',
  ]);
  const aboutEndIndex = findEndIndex(bulletPoints, aboutStartIndex, [
    'address:',
    'industry:',
    'keywords:',
    'generalCategories:',
  ]);
  const addressEndIndex = findEndIndex(bulletPoints, addressStartIndex, [
    'industry:',
    'keywords:',
    'generalCategories:',
  ]);
  const industryEndIndex = findEndIndex(bulletPoints, industryStartIndex, [
    'keywords:',
    'generalCategories:',
  ]);
  const keywordEndIndex = findEndIndex(bulletPoints, keywordsStartIndex, [
    'generalCategories:',
  ]);

  return {
    services: extractSection(bulletPoints, servicesStartIndex, servicesEndIndex),
    buys: extractSection(bulletPoints, buysStartIndex, buysEndIndex),
    keyIndicators: extractSection(bulletPoints, keyIndicatorsStartIndex, keyIndicatorsEndIndex),
    companySize: extractSection(bulletPoints, companySizeStartIndex, companySizeEndIndex),
    about: extractSection(bulletPoints, aboutStartIndex, aboutEndIndex),
    address: extractSection(bulletPoints, addressStartIndex, addressEndIndex),
    industry: extractSection(bulletPoints, industryStartIndex, industryEndIndex),
    keywords: extractSection(bulletPoints, keywordsStartIndex, keywordEndIndex),
    generalCategories: extractSection(bulletPoints, generalCategoriesStartIndex, bulletPoints.length),
  };
};

const extractRelevantContent = ($, serviceKeywords, aboutKeywords, isAbout, isBusiness, domains, extractOptions) => {
  const services = [];
  const indicators = [];
  const about = [];
  const phoneContacts = [];
  const emailContacts = [];
  const address = [];

  if (!$ || !selectors) return { services, indicators, about, phoneContacts, emailContacts, address };

  selectors.forEach((selector) => {
    $(selector).each((_, element) => {
      const isLastChildDiv = selector === 'div' && $(element).is('div') && $(element).is(':last-child') && !$(element).find('div').length;
      const text = $(element).text().trim();

      if (selector !== 'div') {
        if (extractOptions.services && containServiceKeywords(text, serviceKeywords)) {
          services.push(text);
        }
        if (extractOptions.about && !isBusiness && (containServiceKeywords(text, aboutKeywords) || isAbout)) {
          about.push(text);
        }
        if (extractOptions.indicators && !isBusiness) {
          const extractedIndicators = extractKeyIndicators(text);
          if (extractedIndicators.length > 0) {
            indicators.push(...extractedIndicators);
          }
        }
        if (extractOptions.contacts && !isBusiness) {
          const { phoneContacts: phones, emailContacts: emails } = extractContactInfo(text, domains);
          if (phones.length > 0) {
            for (const phone of phones) {
              phoneContacts.push(phone);
            }
          }
          if (emails.length > 0) {
            for (const email of emails) {
              emailContacts.push(email);
            }
          }
        }
      }
      if (extractOptions.addresses && isLastChildDiv && text.match(addressRegex) && !isBusiness) {
        address.push(text);
      }
    });
  });

  return { services, indicators, about, phoneContacts, emailContacts, address };
};

const trimContentUptoMax = (text, length = 5000) => {
  if (!Array.isArray(text)) return [];
  let totalLength = text.join('').length;
  if (totalLength > length) {
    let charsToRemove = totalLength - 5000;
    text = text.join('*');
    text = text.slice(0, -charsToRemove);
    text = text.split('*');
  }
  return text;
};

const extractKeyIndicators = (text) => {
  const indicators = [];
  let match;
  while ((match = keyIndicatorsRegex.exec(text)) !== null) {
    const wordRegex = /\b[\w'-]+\b/g;
    const startIndex = text.substr(0, match.index).search(wordRegex);
    const endIndex = text.substr(match.index + match[0].length).search(wordRegex) + match.index + match[0].length;
    const completeWord = text.substring(startIndex, endIndex).trim();
    indicators.push(completeWord);
  }
  return indicators;
};

const containServiceKeywords = (text, keywords) => {
  if (!text || !keywords || !Array.isArray(keywords)) return false;
  text = text.toLowerCase();
  for (const keyword of keywords) {
    if (text.includes(keyword.toLowerCase())) return true;
  }
  return false;
};

const extractPhoneNumberAndEmail = (phoneContacts, emailContacts) => {
  let phoneNumber = phoneContacts && phoneContacts.length > 0 ? phoneContacts[0].value : '';
  let email = emailContacts && emailContacts.length > 0 ? emailContacts[0].value : '';
  return { phoneNumber, email };
};

const getUniqueIds = (idArray) => {
  if (!Array.isArray(idArray)) return [];
  const uniqueSet = new Set();
  const uniqueArray = [];

  for (const id of idArray) {
    if (!uniqueSet.has(id.toString())) {
      uniqueSet.add(id.toString());
      uniqueArray.push(id);
    }
  }

  return uniqueArray;
};

const extractWebsiteInformation = async (websiteUrl, isBusiness, domains, extractOptions = {}) => {
  try {
    if (!websiteUrl) {
      return {
        companyServices: [],
        keyIndicators: [],
        aboutList: [],
        addresses: [],
        phoneContacts: [],
        emailContacts: [],
        errorPages: [],
        socialLinks: {},
        logo: ''
      };
    }

    const defaultOptions = {
      services: true,
      indicators: true,
      about: true,
      contacts: true,
      addresses: true,
      socialLinks: true,
      logo: true
    };
    
    extractOptions = { ...defaultOptions, ...extractOptions };
    
    const visitedPages = new Set();
    const baseUrl = new URL(websiteUrl).origin;
    
    const companyServices = extractOptions.services ? new Set() : new Set();
    const keyIndicators = extractOptions.indicators ? new Set() : new Set();
    const aboutList = extractOptions.about ? new Set() : new Set();
    const phoneContacts = extractOptions.contacts ? [] : [];
    const emailContacts = extractOptions.contacts ? [] : [];
    const addresses = extractOptions.addresses ? new Set() : new Set();
    const socialLinks = extractOptions.socialLinks ? {} : {};
    let logo = extractOptions.logo ? '' : '';
    const errorPages = [];

    async function crawlWebsite(pageUrl, baseUrl) {
      if (!visitedPages.has(pageUrl)) {
        visitedPages.add(pageUrl);
        try {
          const response = await axios.get(pageUrl);
          const html = response.data;
          const $ = load(html);

          const { services, indicators, about, phoneContacts: phones, emailContacts: emails, address } = extractRelevantContent(
            $,
            serviceKeywords,
            aboutKeywords,
            pageUrl.includes('about') || pageUrl.includes('who-we-are'),
            isBusiness,
            domains,
            extractOptions
          );

          //processes requested data only...
          if (services) {
            for (const item of services) {
              companyServices.add(item);
            }
          }
          if (indicators) {
            for (const item of indicators) {
              keyIndicators.add(item);
            }
          }
          if (about) {
            for (const item of about) {
              aboutList.add(item);
            }
          }
          if (address) {
            for (const item of address) {
              addresses.add(item);
            }
          }
          if (phones) {
            phones.forEach((item) => {
              const existingContact = phoneContacts.find((c) => c.value === item.value);
              if (!existingContact) phoneContacts.push(item);
            });
          }
          if (emails) {
            emails.forEach((item) => {
              const existingContact = emailContacts.find((c) => c.value === item.value);
              if (!existingContact) emailContacts.push(item);
            });
          }

          const internalLinks = [];
          $('a').each((_, element) => {
            const link = $(element).attr('href');
            if (link) {
              if (socialLinks && isSocialLink(link)) {
                const matchedWord = isSocialLink(link);
                socialLinks[matchedWord] = link;
              }

              const nextPageUrl = url.resolve(baseUrl, link);
              if (isInternalLink(nextPageUrl, baseUrl) && !visitedPages.has(nextPageUrl)) {
                internalLinks.push(nextPageUrl);
              }
            }
          });

          if (logo !== '' && !logo) {
            $('img').each((_, element) => {
              const link = $(element).attr('src');
              if (link && isLogo(link)) {
                logo = link;
                return false;
              }
            });
          }

          return internalLinks;
        } catch (error) {
          errorPages.push(pageUrl);
          return [];
        }
      }
      return [];
    }

    const internalLinks = await crawlWebsite(websiteUrl, baseUrl);
    if (internalLinks && internalLinks.length > 0) {
      for (const link of internalLinks) {
        if (link) {
          await crawlWebsite(link, baseUrl);
        }
      }
    }

    console.log('Scrapped Website Data:', {
      companyServices: companyServices ? [...companyServices] : [],
      keyIndicators: keyIndicators ? [...keyIndicators] : [],
      aboutList: aboutList ? [...aboutList] : [],
      addresses: addresses ? [...addresses] : [],
      phoneContacts: phoneContacts || [],
      emailContacts: emailContacts || [],
      errorPages,
      socialLinks: socialLinks || [],
      logo: logo
    })
    return {
      companyServices: Array.from(companyServices || []),
      keyIndicators: Array.from(keyIndicators || []),
      aboutList: Array.from(aboutList || []),
      addresses: Array.from(addresses || []),
      phoneContacts: phoneContacts || [],
      emailContacts: emailContacts || [],
      errorPages: errorPages || [],
      socialLinks: socialLinks || {},
      logo: logo || ''
    };
  } catch (error) {
    return {
      companyServices: [],
      keyIndicators: [],
      aboutList: [],
      addresses: [],
      phoneContacts: [],
      emailContacts: [],
      errorPages: [],
      socialLinks: [],
      logo: []
    };
  }
};

module.exports = {
  NumberOfEmployees,
  checkEmployeeCountFromString,
  extractBulletPoints,
  trimContentUptoMax,
  extractPhoneNumberAndEmail,
  getUniqueIds,
  extractWebsiteInformation
};
