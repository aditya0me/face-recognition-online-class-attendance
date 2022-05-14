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

const takeSnapButton = document.querySelector("#takephoto");

takeSnapButton.addEventListener('click', function () {
    // console.log("clicked");
    Webcam.snap(placeSnappedImgInProperPlace);
});

function placeSnappedImgInProperPlace(data_uri) {
    const resultPlaceImgEle = document.querySelector("#snappedImgSec");
    resultPlaceImgEle.src = data_uri;
    // console.log(resultPlaceImgEle.src);
}

document.querySelector('#snappedImgSec').addEventListener('load', async function () {
    console.log("Another image loaded");

    const loggedInUserId = document.querySelector("#useridholder").innerText.trim();
    let respFromFacematchServer = await axios.post('http://localhost:5050/matchFace',{
        "name":"dummy",
        "age":70,
        "regdNo":loggedInUserId,
        "imageConvertedToBase64String":  document.querySelector("#snappedImgSec").src,
        maxContentLength: 100000000,
        maxBodyLength: 1000000000,
    });

    console.log(respFromFacematchServer.data.pupils);

    let pst = "";
    for(let i=0;i<respFromFacematchServer.data.pupils.length;i++){
        pst+=respFromFacematchServer.data.pupils[i]+",";
    }
    document.querySelector("#peoplefound").innerHTML = `People Found In The Previous Image -${pst}`;

    // respFromFacematchServer.then(function(arrOfLabels){
    //     console.log(respFromFacematchServer);
    // });

    let idxObtainedFromPupils =respFromFacematchServer.data.pupils.findIndex(function(ele){
        return ele === loggedInUserId ;   
    });

    if(idxObtainedFromPupils != -1){
        console.log('logged in user found in the previous image');
       
        let messageFromServerForIncrementing =await axios.post('/incr',{
            "regdNo":loggedInUserId,
            maxContentLength: 100000000,
            maxBodyLength: 1000000000,
        });
        // console.log(messageFromServerForIncrementing);
        console.log(messageFromServerForIncrementing.data);
        document.querySelector('#incrmessage').innerText = messageFromServerForIncrementing.data ;

    }
    else{
        console.log('logged in user not present in the previous image ');
        document.querySelector('#incrmessage').innerText = 'You were not present in the previous image' ;
    }

});

// document.querySelector('#srcwebcamid').addEventListener('load',async function(){
//     console.log("I am from the webcam src");

 
    
// })

setInterval(function () {
    console.log('I am from setInterval');
    let event = new Event('click');
    takeSnapButton.dispatchEvent(event);
}, 10000);

document.querySelector("#takephoto").style.visibility = "hidden";


/*
function initialStep() {

    if (window.Webcam) {
        procedeFurther();
    }
    else {
        setTimeout(() => { initialStep(); }, 50);
    }
}

function procedeFurther() {
    Webcam.attach("#idstream");
    setInterval(function () {
        let event = new Event('click');
        takeSnapButton.dispatchEvent(event);
    }, 1000);
}

initialStep();
*/