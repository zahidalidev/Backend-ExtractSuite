
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
  const index = bulletPoints.findIndex(
    (point) => point.trim().toLowerCase() === keyword.toLowerCase(),
  );
  return index !== -1 ? index + 1 : -1;
};

const findEndIndex = (bulletPoints, startIndex, nextKeywords) => {
  const nextKeywordIndices = nextKeywords
    .map((keyword) => findStartIndex(bulletPoints, keyword))
    .filter((index) => index !== -1);
  const endIndex =
    nextKeywordIndices.length > 0
      ? Math.min(...nextKeywordIndices) - 1
      : bulletPoints.length;
  return endIndex;
};

const extractSection = (bulletPoints, startIndex, endIndex) => {
  return bulletPoints
    .slice(startIndex, endIndex)
    .map((point) => point.replace(/^\d+\.\s*|-/g, '').trim())
    .filter((point) => point);
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
  const contacts = [];
  let match;
  const existingValues = new Set();

  // modify this regex according to domains
  const contactRegex = /((?:\+\d{1,2}\s?)?\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4})|([a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/g

  while ((match = contactRegex.exec(text)) !== null) {
    const contact = match[0];
    if (!existingValues.has(contact)) {
      existingValues.add(contact);

      const truncatedText = text.replace(/\n|\r/g, '').trim().substring(0, 50);
      
      if (contact.includes('@')) {
        contacts.push({
          type: 'Email',
          value: contact,
          text: truncatedText,
        });
      } else {
        contacts.push({
          type: 'Phone',
          value: contact,
          text: truncatedText,
        });
      }
    }
  }
  return contacts;
};

const extractBulletPoints = (response) => {
  if (response.length === 0) {
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
  const contact = [];
  const address = [];

  selectors.forEach((selector) => {
    $(selector).each((_, element) => {
      const isLastChildDiv = selector === 'div' && $(element).is('div') && $(element).is(':last-child') && !$(element).find('div').length;
      const text = $(element).text().trim();

      // conditions for extractOptions
      if (selector !== 'div') {
        if (containServiceKeywords(text, serviceKeywords)) services.push(text);

        if (!isBusiness && (containServiceKeywords(text, aboutKeywords) || isAbout)) about.push(text);
        
        const indicators = extractKeyIndicators(text);
        if (!isBusiness && indicators.length > 0) indicators.push(...indicators);
        
        const contacts = extractContactInfo(text, domains);
        if (!isBusiness && contacts.length > 0) contact.push(...contacts);
      }

      if (isLastChildDiv && text.match(addressRegex) && !isBusiness) address.push(text);
    });
  });

  return { services, indicators, about, contact, address };
};

const trimContentUptoMax = (text, length = 5000) => {
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
  text = text.toLowerCase();
  return keywords.some((keyword) => text.includes(keyword.toLowerCase()));
};

const extractPhoneNumberAndEmail = (contactList) => {
  let phoneNumber = '';
  let email = '';

  for (let i = 0; i < contactList.length; i++) {
    const contact = contactList[i];
    if (contact.type === 'Phone' && !phoneNumber) {
      phoneNumber = contact.value;
      contactList.splice(i, 1);
      i--;
    } else if (contact.type === 'Email' && !email) {
      email = contact.value;
      contactList.splice(i, 1);
      i--;
    }
    if (phoneNumber && email) break;
  }

  return { phoneNumber, email };
};

const getUniqueIds = (idArray) => {
  const uniqueSet = new Set();
  const uniqueArray = [];

  idArray.forEach((id) => {
    if (!uniqueSet.has(id.toString())) {
      uniqueSet.add(id.toString());
      uniqueArray.push(id);
    }
  });

  return uniqueArray;
};

const extractWebsiteInformation = async (websiteUrl, isBusiness, domains, extractOptions) => {
  try {
    const visitedPages = new Set();
    const baseUrl = new URL(websiteUrl).origin;
    const companyServices = new Set();
    const keyIndicators = new Set();
    const aboutList = new Set();
    const contacts = [];
    const addresses = new Set();
    const socialLinks = {};
    const errorPages = [];
    let logo = '';

    async function crawlWebsite(pageUrl, baseUrl) {
      if (!visitedPages.has(pageUrl)) {
        visitedPages.add(pageUrl);
        try {
          const response = await axios.get(pageUrl);
          const html = response.data;
          const $ = load(html);

          const { services, indicators, about, contact, address } = extractRelevantContent(
            $,
            serviceKeywords,
            aboutKeywords,
            pageUrl.includes('about') || pageUrl.includes('who-we-are'),
            isBusiness,
            domains, 
            extractOptions
          );

          services.forEach((item) => companyServices.add(item));
          indicators.forEach((item) => keyIndicators.add(item));
          about.forEach((item) => aboutList.add(item));
          address.forEach((item) => addresses.add(item));

          contact.forEach((item) => {
            const existingContact = contacts.find((c) => c.value === item.value);
            if (!existingContact) contacts.push(item);
          });

          const internalLinks = [];

          // scrap all links from main page
          $('a').each((_, element) => {
            const link = $(element).attr('href');
            if (link) {

              // save social links
              if (isSocialLink(link)) {
                const matchedWord = isSocialLink(link);
                socialLinks[matchedWord] = link;
              }

              const nextPageUrl = url.resolve(baseUrl, link);
              if (isInternalLink(nextPageUrl, baseUrl) && !visitedPages.has(nextPageUrl)) {
                internalLinks.push(nextPageUrl);
              }
            }
          });

          if (!logo) {
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

    // First crawl the main website
    const internalLinks = await crawlWebsite(websiteUrl, baseUrl);
    
    // Then crawl all internal links in parallel
    if (internalLinks.length > 0) {
      await Promise.allSettled(
        internalLinks.map(link => crawlWebsite(link, baseUrl))
      );
    }

    return {
      companyServices: [...companyServices],
      keyIndicators: [...keyIndicators],
      aboutList: [...aboutList],
      addresses: [...addresses],
      contacts,
      errorPages,
      socialLinks,
      logo
    };
  } catch (error) {
    return {
      companyServices: [],
      keyIndicators: [],
      aboutList: [],
      addresses: [],
      contacts: [],
      errorPages: [],
      socialLinks: {},
      logo: ''
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
