const { extractWebsiteInformation, trimContentUptoMax } = require('../../utils/helpers/htmlParser')
const { isValidUrl } = require('../../utils/helpers/validators')

module.exports.websiteScrappingService = async (webDetails, isBusiness) => {
  try {
    const { link, domains, extractOptions } = webDetails
    let websiteUrl = link

    if (!isValidUrl(websiteUrl)) websiteUrl = `https://${websiteUrl}`

    console.log('Running website scrapping for', websiteUrl)

    let { companyServices, keyIndicators, aboutList, contacts, addresses, socialLinks, logo } =
      await extractWebsiteInformation(websiteUrl, isBusiness, domains, extractOptions)

    const cleanedCompanyServices = []
    for (const item of companyServices || []) {
      if (item) cleanedCompanyServices.push(item.replace(/\n|\r/g, '').trim())
    }
    companyServices = trimContentUptoMax(cleanedCompanyServices, 10000)

    const cleanedKeyIndicators = []
    for (const item of keyIndicators || []) {
      if (item) cleanedKeyIndicators.push(item.replace(/\n|\r/g, '').trim())
    }
    keyIndicators = trimContentUptoMax(cleanedKeyIndicators)

    const cleanedAboutList = []
    for (const item of aboutList || []) {
      cleanedAboutList.push(item.replace(/\n|\r/g, '').trim())
    }
    aboutList = trimContentUptoMax(cleanedAboutList)

    const cleanedAddresses = []
    for (const item of addresses || []) {
      cleanedAddresses.push(item.replace(/\n|\r/g, '').trim())
    }
    addresses = trimContentUptoMax(cleanedAddresses)

    const phoneContacts = []
    const emails = []
    if (Array.isArray(contacts)) {
      for (const item of contacts) {
        const cleanedText = item.text.replace(/\n|\r/g, '').trim()
        if (item.type === 'phone') {
          phoneContacts.push(cleanedText)
        } else if (item.type === 'email') {
          emails.push(cleanedText)
        }
      }
    }

    console.log('\n\n\nFrom Scrapping')
    console.log('Full aboutList List:', aboutList)
    console.log('Full phone contacts List:', phoneContacts)
    console.log('Full emails List:', emails)
    console.log('Full addresses List:', addresses)
    console.log('The company offers and buys:22', companyServices)
    console.log('Key Indicators', keyIndicators)
    console.log('Social Links', socialLinks)
    console.log('Logo', logo)

    return {
      aboutList,
      phoneContacts,
      emails,
      addresses,
      companyServices,
      keyIndicators,
      socialLinks,
      logo,
    }
  } catch (error) {
    console.log('Error in websiteScrappingService: ', error)
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
