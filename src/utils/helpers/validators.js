const isValidUrl = (url) => {
  const urlRegex = /^(https?:\/\/)?([\w-]+\.)+[\w-]+(\/\S*)?$/;
  return urlRegex.test(url) && url.includes('://');
};

const isInternalLink = (link, baseUrl) => {
  const linkDomain = new URL(link).origin;
  return linkDomain === baseUrl;
};

const isSocialLink = (text) => {
  const pattern = /\b((?:linkedin|facebook|instagram|twitter|youtube))(?!.*\bshare\b)\b/;
  const match = pattern.exec(text);
  return match && match[1];
};

const isLogo = (text) => {
  const pattern = /.*(logo|Logo).*\.(png|jpg|jpeg|gif|bmp|svg|webp)/;
  return pattern.test(text);
};

const arraysAreEqual = (arr1, arr2) => {
  if (!arr1) return !(arr2 && arr2.length > 0);

  if (arr1.length !== arr2.length) return false;

  for (let i = 0; i < arr1.length; i++) if (arr1[i].toString() !== arr2[i].toString()) return false;

  return true;
};

module.exports = {
  isValidUrl,
  isInternalLink,
  isSocialLink,
  isLogo,
  arraysAreEqual
};
