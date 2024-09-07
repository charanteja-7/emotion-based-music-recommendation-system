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

        expressionBox.value = `${dominantExpression}`;
      });
    }, 100);
  });
}

const emotionGenreMapping = {
  happy: ['happy', 'latino', 'pop'],
  sad: ['sad', 'acoustic', 'blues'],
  angry: ['metal', 'rock', 'punk'],
  neutral: ['pop', 'classical', 'jazz'],
  surprise: ['electronic', 'k-pop', 'dance'],
  fearful: ['classical', 'ambient', 'new-age']
};

async function getRecommendations(emotion) {
    try {
      const token = YOUR_SPOTIFY_TOKEN; 
      const response = await fetch(`https://api.spotify.com/v1/search?q=${emotion}&type=track&limit=50`, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      const data = await response.json();
      displayRecommendations(data.tracks.items);
    } catch (error) {
      console.error('Error fetching recommendations:', error);
    }
  }
  

function displayRecommendations(tracks) {
  const recommendationsDiv = document.getElementById('recommendations');
  recommendationsDiv.innerHTML = ''; // Clear previous recommendations
  let rowDiv = document.createElement('div');
  rowDiv.classList.add('row');

  tracks.forEach((track, index) => {
    if (index > 0 && index % 4 === 0) {
      recommendationsDiv.appendChild(rowDiv);
      rowDiv = document.createElement('div');
      rowDiv.classList.add('row');
    }

    const trackElement = document.createElement('div');
    trackElement.classList.add('track');

    const imageElement = document.createElement('img');
    imageElement.src = track.album.images[0].url;
    imageElement.alt = track.name;
    imageElement.classList.add('song-image');
    trackElement.appendChild(imageElement);

    const nameElement = document.createElement('p');
    nameElement.textContent = track.name;
    nameElement.classList.add('song-name');
    trackElement.appendChild(nameElement);

    imageElement.addEventListener('click', () => {
      openSpotify(track.external_urls.spotify);
    });

    rowDiv.appendChild(trackElement);
  });
  recommendationsDiv.appendChild(rowDiv);
}

function openSpotify(spotifyUrl) {
  window.open(spotifyUrl, '_blank');
}

// Event listeners for emotion buttons
document.getElementById('search').addEventListener('click', () => getRecommendations(expressionBox.value));
document.getElementById('happy').addEventListener('click', () => getRecommendations('happy'));
document.getElementById('sad').addEventListener('click', () => getRecommendations('sad'));
document.getElementById('angry').addEventListener('click', () => getRecommendations('angry'));
document.getElementById('neutral').addEventListener('click', () => getRecommendations('neutral'));
document.getElementById('surprise').addEventListener('click', () => getRecommendations('surprise'));
document.getElementById('fearful').addEventListener('click', () => getRecommendations('fearful'));
