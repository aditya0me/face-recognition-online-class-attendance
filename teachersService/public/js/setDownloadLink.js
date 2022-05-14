let linkFromLabel = document.querySelector("#labelForLink").innerText;
console.log(linkFromLabel)

document.querySelector("#downloadForm").action = linkFromLabel
