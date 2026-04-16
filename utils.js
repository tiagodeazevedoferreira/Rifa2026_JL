function getDirectDriveLink(link) {
  if (!link) return '';
  let id = link.match(/[-\w]{25,}/);
  if (id) return `https://drive.google.com/uc?id=${id[0]}`;
  return link;
}