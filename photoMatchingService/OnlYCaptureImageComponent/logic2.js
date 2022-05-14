/*console.log("hello");
Webcam.attach("#idstream");

const takeSnapButton = document.querySelector(".custombutton");

takeSnapButton.addEventListener('click', function(){
    console.log("clicked");
    Webcam.snap(placeSnappedImgInProperPlace));
});

function placeSnappedImgInProperPlace(data_uri){
    const resultPlaceImgEle= document.querySelector(".result img");
    resultPlaceImgEle.src= data_uri;
}
*/

console.log("hello");
Webcam.set({
    width: 444,
    height: 333,
    dest_width: 444,
    dest_height: 333,
    image_format: 'jpeg',
    jpeg_quality: 90,
    force_flash: false,
    flip_horiz: true,
    fps: 45
    
});

Webcam.attach("#idstream");

const takeSnapButton = document.querySelector(".custombutton");

takeSnapButton.addEventListener('click', function(){
    console.log("clicked");
    Webcam.snap(placeSnappedImgInProperPlace);
});

function placeSnappedImgInProperPlace(data_uri){
    const resultPlaceImgEle= document.querySelector(".result img");
    resultPlaceImgEle.src= data_uri;
    console.log(resultPlaceImgEle.src);
}