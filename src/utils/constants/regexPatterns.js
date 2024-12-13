// looking for sequences of digits followed by any characters until it encounters a period ., a comma ,, or the words "in" or "by". It matches these patterns globally and case-insensitively within the input string.
module.exports.keyIndicatorsRegex = /(?:\b\d+\b.*?)(?=[.,]|(?:\b(?:in|by)\b))/gi;

module.exports.contactRegex =
  /((?:\+\d{1,2}\s?)?\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4})|([a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/g

module.exports.addressRegex =
  /(?:(?:\d+(?:[ ,-]\w+)+)(?:,\s+\w{2,}(?:-\w+)*)?,?\s+\d{5}(?:,\s+[A-Z]{2})?|(?:[A-Z][a-z]+(?: St\.| Ave\.| Rd\.| Blvd\.| Ln\.| Dr\.)?,\s+\w{2,}(?:-\w+)*)?\s+\d{5}(?:,\s+[A-Z]{2})?$)+$/

module.exports.urlRegex = /^(https?:\/\/)?([\w-]+\.)+[\w-]+(\/\S*)?$/

module.exports.wordRegex = /\b[\w'-]+\b/g

module.exports.mobileNumberRegex = /^\+?\d{1,3}\s?\d{3,}[-\s]?\d{3,}[-\s]?\d{4,}$/g