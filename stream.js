const video = document.querySelector("#video");
const canvas = document.querySelector("#tracking");
const c = canvas.getContext("2d");

/* virtual canvas - not appended to the DOM */
const drawing = document.createElement("canvas");
const dc = canvas.getContext("2d");

const slider = document.querySelector("#myRange");
const confidence = document.querySelector("#confidence");
const resetConfidence = document.querySelector("#resetConfidence");
const triggerConf = document.querySelector("#triggerConfidence");

let model;

let keys = [];

const modelParams = {
	flipHorizontal: true, // flip e.g for video
	imageScaleFactor: 0.7, // reduce input image size for gains in speed.
	maxNumBoxes: 20, // maximum number of boxes to detect
	iouThreshold: 0.5, // ioU threshold for non-max suppression
	scoreThreshold: 0.7 // confidence threshold for predictions.
};

class Key {
	constructor(soundID, sound, path) {
		this.path = path;
		this.soundID = soundID;
		this.sound = sound;
	}
	loadSound() {
		return createjs.Sound.registerSound(this.sound, this.soundID);
	}
	playSound() {
		return createjs.Sound.play(this.soundID);
	}
}
Path2D.prototype.roundRect = function(x, y, w, h, r) {
	if (w < 2 * r) r = w / 2;
	if (h < 2 * r) r = h / 2;
	this.moveTo(x + r, y);
	this.arcTo(x + w, y, x + w, y + h, r);
	this.arcTo(x + w, y + h, x, y + h, r);
	this.arcTo(x, y + h, x, y, r);
	this.arcTo(x, y, x + w, y, r);
	this.closePath();
	return this;
};

setListeners();
initNotes();
stream();

async function stream() {
	// Load the model.
	try {
		await handTrack.startVideo(video);
		console.log("Video started");
		model = await handTrack.load(modelParams);
		video.style.display = "none";
		canvas.style.display = "inline";
		runDetection();
	} catch (e) {
		console.log(e);
	}
}

async function runDetection() {
	try {
		requestAnimationFrame(runDetection);
		let predictions = await model.detect(video);
		let circles = [];

		for (prediction of predictions) {
			let x = prediction.bbox[0] + prediction.bbox[2] / 2;
			let y = prediction.bbox[1] + prediction.bbox[3] / 2;
			for (key of keys) {
				if (c.isPointInPath(key.path, x, y)) {
					if (!key.instance || !key.instance.playing) {
						key.instance = key.playSound();

						key.instance.playing = true;

						key.instance.on("complete", function() {
							this.playing = false;
						});
					}
				}
				circle = new Path2D();
				circle.moveTo(drawing.width / 2, drawing.height / 2);
				circle.lineTo(x, y);
				circle.arc(x, y, 5, 0, 2 * Math.PI);
				circles.push(circle);
			}
		}

		model.renderPredictions(predictions, canvas, c, video);

		renderNotes();

		dc.lineWidth = 2;
		dc.fillStyle = "white";
		for (circle of circles) dc.fill(circle);

		c.drawImage(drawing, 0, 0, 200, 200);
	} catch (e) {
		console.log(e);
	}
}

function initNotes() {
	drawing.width = canvas.width;
	drawing.height = canvas.height;

	let square = 150;
	let hb = Math.round((drawing.width - 3 * square) / 4);
	let vb = Math.round((drawing.height - 2 * square) / 3);

	console.log(hb);
	console.log(vb);

	// TOP LEFT
	let drums = new Key("drums", "sounds/drums.mp3");
	drums.path = new Path2D();
	drums.path.roundRect(hb, vb, 150, 150, 15);
	drums.color = "rgba(0, 245, 251, 0.5)";

	// TOP MIDDLE
	let maracas = new Key("maracas", "sounds/maracas.mp3");
	maracas.path = new Path2D();
	maracas.path.roundRect(2 * hb + square, vb, 150, 150, 15);
	maracas.color = "rgba(150, 0, 255, 0.5)";

	// TOP RIGHT
	let bronxSynth = new Key("bronxSynth", "sounds/bronxSynth.mp3");
	bronxSynth.path = new Path2D();
	bronxSynth.path.roundRect(3 * hb + 2 * square, vb, 150, 150, 15);
	bronxSynth.color = "rgba(255, 241, 0, 0.5)";

	// BOTTOM LEFT
	let bass = new Key("bass", "sounds/bass.mp3");
	bass.path = new Path2D();
	bass.path.roundRect(hb, 2 * vb + square, 150, 150, 15);
	bass.color = "rgba(255, 0, 227, 0.5)";

	// BOTTOM MIDDLE
	let guitarStrum = new Key("guitarStrum", "sounds/guitarStrum.mp3");
	guitarStrum.path = new Path2D();
	guitarStrum.path.roundRect(2 * hb + square, 2 * vb + square, 150, 150, 15);
	guitarStrum.color = "rgba(56, 255, 18, 0.5)";

	// BOTTOM RIGHT
	let synth = new Key("synth", "sounds/synth.mp3");
	synth.path = new Path2D();
	synth.path.roundRect(3 * hb + 2 * square, 2 * vb + square, 150, 150, 15);
	synth.color = "rgba(25, 0, 160, 0.5)";

	keys.push(drums, maracas, bronxSynth, bass, guitarStrum, synth);
}

function renderNotes() {
	dc.fillStyle = "rgba(6, 6, 6, 0.5)";
	dc.fillRect(0, 0, drawing.width, drawing.height);

	for (key of keys) {
		dc.fillStyle = key.color;
		dc.fill(key.path);
		key.loadSound();
	}
}

function setListeners() {
	slider.oninput = function() {
		confidence.textContent = this.value;
		modelParams.scoreThreshold = this.value / 100;
		model.setModelParameters(modelParams);
	};

	resetConfidence.addEventListener("click", () => {
		let resetVal = 70;
		confidence.textContent = resetVal;
		slider.value = resetVal;
		modelParams.scoreThreshold = resetVal / 100;
		model.setModelParameters(modelParams);
	});
}
