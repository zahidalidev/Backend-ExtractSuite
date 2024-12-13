const { extractWebsiteInformation, trimContentUptoMax } = require("../utils/helpers/htmlParser");
const { isValidUrl } = require("../utils/helpers/validators");

module.exports.websiteScrappingService = async (websiteUrl, isBusiness) => {
    try {
        
        if (!isValidUrl(websiteUrl)) websiteUrl = `https://${websiteUrl}`;

        console.log('Running website scrapping for', websiteUrl);

        let {
            companyServices,
            keyIndicators,
            aboutList,
            contacts,
            addresses,
            socialLinks,
            logo,
        } = await extractWebsiteInformation(websiteUrl, isBusiness);

        companyServices = trimContentUptoMax(
            companyServices.map((item) =>
                item?.replace(/\n|\r/g, '').trim(),
            ),
            10000, 
        );

        keyIndicators = trimContentUptoMax(
            keyIndicators.map((item) => item?.replace(/\n|\r/g, '').trim()),
        );

        aboutList = trimContentUptoMax(
            aboutList.map((item) => item.replace(/\n|\r/g, '').trim()),
        );
        addresses = trimContentUptoMax(
            addresses.map((item) => item.replace(/\n|\r/g, '').trim()),
        );
        contacts = contacts.map((item) => ({
            ...item,
            text: item.text.replace(/\n|\r/g, '').trim(),
        }));

        console.log('\n\n\nFrom Scrapping');
        console.log('Full aboutList List:', aboutList);
        console.log('Full contacts List:', contacts);
        console.log('Full addresses List:', addresses);
        console.log('The company offers and buys:22', companyServices);
        console.log('Key Indicators', keyIndicators);
        console.log('Social Links', socialLinks);
        console.log('Logo', logo);
        
        return {
            aboutList,
            contacts,
            addresses,
            companyServices,
            keyIndicators,
            socialLinks,
            logo
        };
    } catch (error) {
        console.log('Error in websiteScrappingService: ', error)
    }
    
    



    //   if (
    //     companyServices.length === 0 &&
    //     keyIndicators.length === 0 &&
    //     aboutList.length === 0 &&
    //     addresses.length === 0 &&
    //     contacts.length === 0 &&
    //     isEmpty(socialLinks) &&
    //     !logo
    //   ) {
    //     return {
    //       offerServices: [],
    //       buyServices: [],
    //       indicators: [],
    //       companySize: [],
    //       about: [],
    //       address: [],
    //       industry: [],
    //       keywords: [],
    //       contacts: [],
    //       generalCategories: [],
    //       socialLinks: {},
    //       logo: '',
    //     };
    //   }

    //   const chatResponse = await this.openai.chat.completions.create({
    //     model: 'gpt-3.5-turbo',
    //     messages: [
    //       {
    //         role: 'user',
    //         content: generateRecommendationsText(
    //           websiteUrl,
    //           companyServices,
    //           keyIndicators,
    //           aboutList,
    //           addresses,
    //         ),
    //       },
    //     ],
    //   });

    //   const {
    //     services: offerServices,
    //     buys: buyServices,
    //     keyIndicators: indicators,
    //     companySize,
    //     about,
    //     address,
    //     industry,
    //     keywords,
    //     generalCategories,
    //   } = extractBulletPoints(chatResponse);

    //   return {
    //     offerServices,
    //     buyServices,
    //     indicators,
    //     companySize: checkEmployeeCountFromString(companySize[0]),
    //     about,
    //     address,
    //     industry,
    //     keywords,
    //     contacts,
    //     generalCategories,
    //     socialLinks,
    //     logo,
    //   };
    // } catch (error) {
    //   console.log(error);
    //   return {
    //     offerServices: [],
    //     buyServices: [],
    //     indicators: [],
    //     companySize: [],
    //     about: [],
    //     address: [],
    //     industry: [],
    //     keywords: [],
    //     contacts: [],
    //     generalCategories: [],
    //     socialLinks: {},
    //     logo: '',
    //   };
    // }
}
