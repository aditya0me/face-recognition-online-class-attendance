const tf = require('@tensorflow/tfjs-node');

const canvas = require("canvas");

//const faceapi=require("face-api.js");
const faceapi = require("@vladmandic/face-api");

const { Canvas, Image, ImageData } = canvas
faceapi.env.monkeyPatch({ Canvas, Image, ImageData });
let globalvar;

const fs=require('fs');
const path=require('path');
const express = require('express');
const { fileSystem } = require('@tensorflow/tfjs-node/dist/io');

const cors = require('cors');
const app = express();

app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(cors());

app.post('/matchFace', async function (req, res) {
    // console.log(req.body);
    if(  !fs.existsSync( path.join(__dirname,"requestedImageForProcessing", req.body.regdNo) ) )  {
      fs.mkdirSync(path.join(__dirname,"requestedImageForProcessing", req.body.regdNo));
    }
    let pathForTheCurrentImage = path.join(__dirname,"requestedImageForProcessing", req.body.regdNo,"temp.jpeg");
    makeTheImageFromBase64String(pathForTheCurrentImage,req.body.imageConvertedToBase64String); //makeTheImageFromBase64String(locationPath, Thebase4String);

    let image = await canvas.loadImage(pathForTheCurrentImage);
    console.log(image);

    const detections = await faceapi.detectAllFaces(image).withFaceLandmarks().withFaceDescriptors();
    const results = detections.map( d=>globalvar.findBestMatch(d.descriptor)  );

    const toBeSend = {
        pupils:[]
    }
    results.forEach(person=>{
         console.log(person.label);
         toBeSend.pupils.push(person.label);
    });

    // res.send('My response for /matchFace POST request');
    res.send(toBeSend);
});

app.listen(5050, async function () {
    let stringObtained =await initailizeAndLoad();
    console.log('------------------------- stringObtained-----------------------',stringObtained);
    console.log("server started listening on port 5050");
});


function makeTheImageFromBase64String(pathForTheCurrentImage,myBase64String){
    console.log(pathForTheCurrentImage);
    
    myBase64String = myBase64String.slice(23);
     fs.writeFileSync("./movies.txt",myBase64String);
    let buff = new Buffer(myBase64String,'base64');
    fs.writeFileSync(pathForTheCurrentImage,buff);

}


async function initailizeAndLoad() {
    await faceapi.nets.faceRecognitionNet.loadFromDisk('./Face-Recognition-JavaScript-master/models');
    await faceapi.nets.faceLandmark68Net.loadFromDisk('./Face-Recognition-JavaScript-master/models');
    await faceapi.nets.ssdMobilenetv1.loadFromDisk('./Face-Recognition-JavaScript-master/models');

    const labeledFaceDescriptors = await loadLabeledImages();
    // const faceMatcher = new faceapi.FaceMatcher(labeledFaceDescriptors, 0.6);
    globalvar = new faceapi.FaceMatcher(labeledFaceDescriptors, 0.6);
    return 'loaded from disk';
}


function loadLabeledImages() {
	const labels = ['Black Widow', 'Captain America', 'Captain Marvel', 'Hawkeye', 'Jim Rhodes', 'Thor', 'Tony Stark','Obama']
  noOfImagesToBeTrainedForOnePerson = 2
	return Promise.all(
	  labels.map(async label => {
		const descriptions = []
		for (let i = 1; i <= noOfImagesToBeTrainedForOnePerson; i++) {
		  const img = await canvas.loadImage(`./labeled_images/${label}/${i}.jpg`)
		  const detections = await faceapi.detectSingleFace(img).withFaceLandmarks().withFaceDescriptor()
		  descriptions.push(detections.descriptor)
		}
  
		return new faceapi.LabeledFaceDescriptors(label, descriptions)
	  })
	)
  }
