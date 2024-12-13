module.exports.generateRecommendationsText = (
  websiteUrl,
  services,
  keyIndicators,
  aboutList,
  addresses
) =>
  `Extract the services provided by "${websiteUrl}" from these services: ${services}. Present the services in a numbered format under the heading "services:".
  Based on the company's website "${websiteUrl}", it's data and the provided services, suggest minimum 10 products or services that this company should buy, and exclude existing services. Present these recommendations under the heading "buys:".
  ${
    keyIndicators.length
      ? `Use these key Indicators ${keyIndicators} for "${websiteUrl}" and remove redundant and raw data from key Indicators. Present the filtered key indicators in a numbered format under the heading "keyIndicators:".
      Extract Company size or any such relevant information exmple number of employees etc from ${keyIndicators} if find place it under the heading "companySize:".`
      : null
  } 
   ${
     aboutList.length
       ? `Provide the complete paragraph of data about this company ${websiteUrl} from this data: ${aboutList} and place it under the heading "about:".`
       : null
   }
   ${
     addresses.length
       ? `Provide me the complete address paragraph of this company: "${websiteUrl}" from this address data ${addresses} and place it under the "address:" heading.`
       : null
   } 
   Based on the provided information and this about data: "${aboutList}". determine the industry in which "${websiteUrl}" company operates? Provide the information under heading "industry:".
   Based on the data provided above, give some keywords and Present the keywords in a numbered format under the heading "keywords:"
   Give me two general category names for "services:" and "buys:" from above data, and place only two general categories names under the heading "generalCategories:".
  `;
