// looking for sequences of digits followed by any characters until it encounters a period ., a comma ,, or the words "in" or "by". It matches these patterns globally and case-insensitively within the input string.
module.exports.keyIndicatorsRegex = /(?:\b\d+\b.*?)(?=[.,]|(?:\b(?:in|by)\b))/gi;

module.exports.contactRegex =
  /((?:\+\d{1,2}\s?)?\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4})|([a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/g

module.exports.addressRegex =
  /(?:(?:\d+(?:[ ,-]\w+)+)(?:,\s+\w{2,}(?:-\w+)*)?,?\s+\d{5}(?:,\s+[A-Z]{2})?|(?:[A-Z][a-z]+(?: St\.| Ave\.| Rd\.| Blvd\.| Ln\.| Dr\.)?,\s+\w{2,}(?:-\w+)*)?\s+\d{5}(?:,\s+[A-Z]{2})?$)+$/

module.exports.urlRegex = /^(https?:\/\/)?([\w-]+\.)+[\w-]+(\/\S*)?$/

module.exports.wordRegex = /\b[\w'-]+\b/g

module.exports.mobileNumberRegex = /^\+?\d{1,3}\s?\d{3,}[-\s]?\d{3,}[-\s]?\d{4,}$/g

module.exports.gmailRegex = /\b[A-Za-z0-9._%+-]+@gmail\b/

module.exports.yahooRegex = /\b[A-Za-z0-9._%+-]+@yahoo\b/

module.exports.domainRegex = /\b[A-Za-z0-9._%+-]+@domain\b/

module.exports.infoEmailRegex = /\binfo@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/

module.exports.salesEmailRegex = /\bsales@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/

module.exports.supportEmailRegex = /\bsupport@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/

module.exports.contactEmailRegex = /\bcontact@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/

module.exports.adminEmailRegex = /\badmin@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/

module.exports.editorEmailRegex = /\beditor@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/

module.exports.marketingEmailRegex = /\bmarketing@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/

module.exports.feedbackEmailRegex = /\bfeedback@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/

module.exports.hrEmailRegex = /\bhr@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/

module.exports.teamEmailRegex = /\bteam@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/

module.exports.customerServiceEmailRegex = /\bcustomerservice@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/

module.exports.officeEmailRegex = /\boffice@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/

module.exports.mailEmailRegex = /\bmail@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/

module.exports.enquiriesEmailRegex = /\benquiries@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/

module.exports.hotmailRegex = /\b[A-Za-z0-9._%+-]+@hotmail\b/