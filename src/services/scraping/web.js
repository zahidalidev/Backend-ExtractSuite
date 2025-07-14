const axios = require('axios')
const { extractWebsiteInformation, trimContentUptoMax } = require('../../utils/helpers/htmlParser')
const { isValidUrl } = require('../../utils/helpers/validators')

// Create optimized axios instance with connection pooling
const httpClient = axios.create({
  timeout: 10000, // Reduced from default
  maxRedirects: 3, // Limit redirects
  headers: {
    'User-Agent': 'Mozilla/5.0 (compatible; WebScraper/1.0)',
    Accept: 'text/html,application/xhtml+xml',
    'Accept-Encoding': 'gzip, deflate',
    Connection: 'keep-alive',
  },
  // Connection pooling
  httpAgent: new (require('http').Agent)({
    keepAlive: true,
    maxSockets: 100,
    maxFreeSockets: 10,
    timeout: 60000,
    freeSocketTimeout: 30000,
  }),
  httpsAgent: new (require('https').Agent)({
    keepAlive: true,
    maxSockets: 100,
    maxFreeSockets: 10,
    timeout: 60000,
    freeSocketTimeout: 30000,
    rejectUnauthorized: false, // For faster processing, consider security implications
  }),
})

// Add response interceptor for better error handling
httpClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.code === 'ECONNABORTED') {
      console.log('Request timeout for:', error.config?.url)
    }
    return Promise.reject(error)
  }
)

module.exports.websiteScrappingService = async (webDetails, isBusiness) => {
  const startTime = Date.now()

  try {
    const { link, domains, extractOptions } = webDetails
    let websiteUrl = link

    if (!isValidUrl(websiteUrl)) websiteUrl = `https://${websiteUrl}`

    console.log(`[${Date.now()}] Starting scrape for: ${websiteUrl}`)

    const scrapingResult = await extractWebsiteInformation(
      websiteUrl,
      isBusiness,
      domains,
      extractOptions,
      httpClient // Pass the optimized client
    )

    let { companyServices, keyIndicators, aboutList, contacts, addresses, socialLinks, logo } =
      scrapingResult

    // Optimized content processing with parallel operations
    const [processedServices, processedIndicators, processedAbout, processedAddresses] =
      await Promise.all([
        Promise.resolve(
          trimContentUptoMax(
            companyServices.map((item) => item?.replace(/\n|\r/g, '').trim()),
            10000
          )
        ),
        Promise.resolve(
          trimContentUptoMax(keyIndicators.map((item) => item?.replace(/\n|\r/g, '').trim()))
        ),
        Promise.resolve(
          trimContentUptoMax(aboutList.map((item) => item.replace(/\n|\r/g, '').trim()))
        ),
        Promise.resolve(
          trimContentUptoMax(addresses.map((item) => item.replace(/\n|\r/g, '').trim()))
        ),
      ])

    const processedContacts = contacts.map((item) => ({
      ...item,
      text: item.text.replace(/\n|\r/g, '').trim(),
    }))

    const processingTime = Date.now() - startTime
    console.log(`[${Date.now()}] Completed scrape for: ${websiteUrl} in ${processingTime}ms`)

    return {
      aboutList: processedAbout,
      contacts: processedContacts,
      addresses: processedAddresses,
      companyServices: processedServices,
      keyIndicators: processedIndicators,
      socialLinks,
      logo,
      processingTime,
    }
  } catch (error) {
    const processingTime = Date.now() - startTime
    console.error(
      `[${Date.now()}] Error scraping ${webDetails.link} after ${processingTime}ms:`,
      error.message
    )

    // Return empty result instead of undefined to prevent consumer issues
    return {
      aboutList: [],
      contacts: [],
      addresses: [],
      companyServices: [],
      keyIndicators: [],
      socialLinks: {},
      logo: '',
      error: error.message,
      processingTime,
    }
  }
}

//data format
// {
//     "links": "https://www.nadra.gov.pk/,https://arcadiancafe.com/",
//     "domains": ["@gmail", "@hotmail"],
//     "extractOptions": {
//         "about": true,
//         "contact": true,
//         "address": false
//     }
//     // "isFile": true // next task
// }
