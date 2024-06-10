const video = document.getElementById("video");
const toggleButton = document.getElementById("toggleButton");
const expressionBox = document.getElementById("expressionBox");

let isCameraOn = false;
let stream;

Promise.all([
  faceapi.nets.tinyFaceDetector.loadFromUri("/models"),
  faceapi.nets.faceLandmark68Net.loadFromUri("/models"),
  faceapi.nets.faceRecognitionNet.loadFromUri("/models"),
  faceapi.nets.faceExpressionNet.loadFromUri("/models"),
  faceapi.nets.ageGenderNet.loadFromUri("/models"),
]).then(() => {
  toggleButton.addEventListener("click", toggleCamera);
});

async function toggleCamera() {
  if (isCameraOn) {
    stopCamera();
  } else {
    await startCamera();
  }
}

async function startCamera() {
  try {
    stream = await navigator.mediaDevices.getUserMedia({
      video: true,
      audio: false,
    });
    video.srcObject = stream;
    isCameraOn = true;
    toggleButton.textContent = "Stop Camera";
    startDetection();
  } catch (error) {
    console.log(error);
  }
}

function stopCamera() {
  stream.getTracks().forEach(track => track.stop());
  video.srcObject = null;
  isCameraOn = false;
  toggleButton.textContent = "Start Camera";
}

function startDetection() {
    video.addEventListener("play", () => {
      // Clear any existing canvas before creating a new one
      const existingCanvas = document.querySelector('canvas');
      if(existingCanvas) {
        existingCanvas.remove();
      }
      
      const canvas = faceapi.createCanvasFromMedia(video);
      document.body.append(canvas);
  
      faceapi.matchDimensions(canvas, { height: video.height, width: video.width });
  
      const interval = setInterval(async () => {
        if (!isCameraOn) {
          clearInterval(interval);
          canvas.getContext("2d").clearRect(0, 0, canvas.width, canvas.height);
          return;
        }
  
        const detections = await faceapi
          .detectAllFaces(video, new faceapi.TinyFaceDetectorOptions())
          .withFaceLandmarks()
          .withFaceExpressions()
          .withAgeAndGender();
          
        canvas.getContext("2d").clearRect(0, 0, canvas.width, canvas.height);
  
        const resizedDetections = faceapi.resizeResults(detections, {
          height: video.height,
          width: video.width,
        });
  
        faceapi.draw.drawDetections(canvas, resizedDetections);
        faceapi.draw.drawFaceLandmarks(canvas, resizedDetections);
        faceapi.draw.drawFaceExpressions(canvas, resizedDetections);
  
        resizedDetections.forEach(detection => {
          const box = detection.detection.box;
          const drawBox = new faceapi.draw.DrawBox(box, {
            label: `${Math.round(detection.age)} year old ${detection.gender}`,
          });
          drawBox.draw(canvas);
  
          const expressions = detection.expressions;
          const maxValue = Math.max(...Object.values(expressions));
          const dominantExpression = Object.keys(expressions).filter(
            (item) => expressions[item] === maxValue
          )[0];
  
          expressionBox.value = `Detected expression: ${dominantExpression}`;
        });
  
        console.log(detections);
      }, 100);
    });
  }
  