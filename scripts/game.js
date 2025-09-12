/*
  Copyright (c) 2025 Kevin Ruffin
  Copyright (c) 2015 Steven Lambert in sections marked.

  This program is free software: you can redistribute it and/or modify it under 
  the terms of the GNU Affero General Public License as published by the Free 
  Software Foundation, either version 3 of the License, or (at your option) any 
  later version.

  This program is distributed in the hope that it will be useful, but WITHOUT ANY
  WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS FOR A
  PARTICULAR PURPOSE. See the GNU Affero General Public License for more details.

  You should have received a copy of the GNU Affero General Public License along 
  with this program. If not, see <https://www.gnu.org/licenses/>. 
*/
import {CPlayer} from './player-small.js';
import {Blobb as Blob} from './Blob.js';

let canvas = document.getElementById("game");
let context = canvas.getContext('2d');
let _cscale = 6;
context.imageSmoothingEnabled = false;

let resizeFunc = function() {
	canvas.width = window.innerWidth;
	canvas.height = window.innerHeight;
	context.scale(_cscale, _cscale);
	context.imageSmoothingEnabled = false;
}
resizeFunc();
window.addEventListener('resize', resizeFunc);

var pressedKeys = {};
const keydown_event = function(evt) {
	pressedKeys[evt.code] = true;
}
const keyup_event = function(evt) {
	pressedKeys[evt.code] = false;
}
window.addEventListener('keydown', keydown_event);
window.addEventListener('keyup', keyup_event);

function keyPressed(key) {
	return pressedKeys[key];
}

const createAudio = function(args) {
	// let sdat = Object.assign({ // doesn't reduce size
	// 	loop: false,
	// 	rowLen: 5513,   // In sample lengths
  //   patternLen: 1,  // Rows per pattern
  //   endPattern: 0,  // End pattern
  //   numChannels: 1  // Number of channels
	// }, args);
	var cplayer = new CPlayer()
  args = Object.assign({
    loop: false,
    rowLen: 5513,   // In sample lengths
    patternLen: 1,  // Rows per pattern
    endPattern: 0,  // End pattern
    numChannels: 1  // Number of channels
  },args);
	cplayer.init(args);
	while(cplayer.generate() < 1) {}
	var wave = cplayer.createWave();
	var audio = document.createElement("audio");
  audio.src = URL.createObjectURL(new Blob([wave], {type: "audio/wav"}));
  audio.loop = args.loop != null ? args.loop : true;
  if (args.volume != null) {
  	audio.volume = args.volume;
  }
  audio.tryplay = function () {
  	window.addEventListener('focus', () => {
	    if (audio.paused) {
	    	audio.play();
	    }
	  });
	  window.addEventListener('blur', () => {
	    if (!audio.paused) {
	    	audio.pause();
	    }
	  });
	  audio._tryplay();
  }
  audio._tryplay = function () {
		audio.play().catch(() => {
			requestAnimationFrame(audio._tryplay);
		});
	}

  return audio;
}
const randRange = function(mi, mx) {
	return Math.random() * (mx - mi) + mi;
}
const dot = function(v1, v2) {
	return v1.x * v2.x + v1.y * v2.y;
}
//// Get a value between 0 and 1.
const noise = function(pos) {
	return (((Math.sin(dot(pos, {x:12.9898, y:78.233})) * 43758.5453) % 1) + 1) / 2;
}
const cloneAnimations = function(anim_obj) {
	let anims = {};
	for (let key in anim_obj) {
		anims[key] = anim_obj[key].clone();
	}
	return anims;
};
const getColorKey = function(r, g, b, noCell) {
  // Jack-ass advertisers ruining the world yet again:
  // https://www.h3xed.com/programming/javascript-canvas-getimagedata-pixel-colors-slightly-off-in-firefox
  // Since pixels are randomly jittered by a little bit, just box things in cells of 10 so 
  // the jitter is effectively ignored. Lose some resolution, but should work for the government.
  const COLOR_CELL_SIZE = noCell ? 1 : 10;
  return parseInt(Math.floor(r/COLOR_CELL_SIZE)*COLOR_CELL_SIZE).toString(16).padStart(2, '0') +
         parseInt(Math.floor(g/COLOR_CELL_SIZE)*COLOR_CELL_SIZE).toString(16).padStart(2, '0') +
         parseInt(Math.floor(b/COLOR_CELL_SIZE)*COLOR_CELL_SIZE).toString(16).padStart(2, '0');
};
const parseColorKey = function(key) {
  let rgb = key.match(/([a-fA-F0-9]{2})([a-fA-F0-9]{2})([a-fA-F0-9]{2})/);
  return [
    parseInt(rgb[1], 16),
    parseInt(rgb[2], 16),
    parseInt(rgb[3], 16)
  ];
};
const recolorImage = function(inimg, palette) {
  var ocanvas = new OffscreenCanvas(inimg.width, inimg.height);
  let ctx = ocanvas.getContext('2d');
  // ctx.imageSmoothingEnabled = false;
  ctx.drawImage(inimg, 0, 0);
  let pixdata = ctx.getImageData(0, 0, inimg.width, inimg.height);

  for (let pidx = 0; pidx < pixdata.data.length; pidx += 4) {
    let key = getColorKey(pixdata.data[pidx], pixdata.data[pidx+1], pixdata.data[pidx+2]);

    if (Object.keys(palette).includes(key)) {
      // let rgb = palette[key].match(/([a-fA-F0-9]{2})([a-fA-F0-9]{2})([a-fA-F0-9]{2})/);
      // pixdata.data[pidx    ] = parseInt(rgb[1], 16);
      // pixdata.data[pidx + 1] = parseInt(rgb[2], 16);
      // pixdata.data[pidx + 2] = parseInt(rgb[3], 16);
      let rgb = parseColorKey(palette[key]);
      pixdata.data[pidx    ] = rgb[0];
      pixdata.data[pidx + 1] = rgb[1];
      pixdata.data[pidx + 2] = rgb[2];
    }
  }

  ctx.putImageData(pixdata, 0, 0);

  let oimg = ocanvas.transferToImageBitmap();

  return oimg;
};

const _getClosestTargetInRange = function (toignore) {
	switch(this.targetType) {
	case 1:
		let closest = null;
		let cdist = Infinity;
		let _enemies = _espawner.getEnemies();
		for (let eidx = 0; eidx < _enemies.length; eidx++) {
			let e = _enemies[eidx];
			if (toignore == e) { continue; }
			// if (e.curHealth <= 0) { continue; }
			let d = dist(this.world, e.world);
			if (d < cdist && d <= this.maxAttackRange) {
				cdist = d;
				closest = { obj: e, dist: d, dir: dir(this.world, e.world) };
			}
		}
		return closest;
	case 2:
		let pdist = dist(this.world, _player.world);
		if (pdist <= this.maxAttackRange) {
			return { obj: _player, dist: pdist, dir: dir(this.world, _player.world) };
		}
		return null;
	}
	return null;
};

class GameMap {
	constructor(properties = {
		x: 0,
		y: 0,
		world: {x:0,y:0,width:0,height:0,scaleX: 1,scaleY: 1},
		objects: [],
		animations: null,
		grass: null,
	}) {
		Object.assign(this, properties);
		if (this.animations != null) {
			this.animations = cloneAnimations(this.animations);
			this.grass = [];

			//// Hack to prevent GPU tearing/wrap pixels
			//// https://stackoverflow.com/questions/60908444/canvas-drawimage-drawing-unwanted-pixels-when-stretching
			Object.values(this.animations).forEach( (v) => {
				let row = (v.frames[0] / v.spriteSheet._f) | 0;
				let col = (v.frames[0] % v.spriteSheet._f) | 0;
				let p = createImageBitmap(
					v.spriteSheet.image,
					col * v.width,
					row * v.height,
					v.width,
					v.height,
				);
				p.then( (bm) => {
					this.grass.push(bm);
				});
			});

			while (this.grass.length < this.animations.length) {}
			// this.grass = [
			// 	this.animations[Object.keys(this.animations)[0]],
			// 	this.animations[Object.keys(this.animations)[1]],
			// ];
		}
	}

	render() {
		const CELL_WIDTH = 8;
		if (this.grass != null) {
			let full = {h: canvas.height / _cscale / CELL_WIDTH,
									w: canvas.width / _cscale / CELL_WIDTH};
			// let half = {h: full.h / 2,
			// 						w: full.w / 2};
			
			for (let y = 0; y < full.h; y++) {
				for (let x = 0; x < full.w; x++) {
					let cellx = Math.floor(this.x / CELL_WIDTH);
					let celly = Math.floor(this.y / CELL_WIDTH);
					let n = noise({x: cellx + x, y: celly + y});
					if (n > 0.85) {
						// Draw some grass
						let fdir = ((n + noise({x: cellx + x + 1000, y: celly + y + 1000}))/2 > 0.5) ? 1 : -1;
						
						context.save();
						let pgrass = this.grass[0];
						if (n > 0.95) {
							pgrass = this.grass[2];
						} else if (n >.9) { 
							pgrass = this.grass[1] 
						};
						let dx = this.x - cellx * CELL_WIDTH;
						let dy = this.y - celly * CELL_WIDTH;
						let sx = x * CELL_WIDTH - dx;
						let sy = y * CELL_WIDTH - dy;
						context.translate(sx, sy);
						let scaleby = Math.min(.8, Math.max(.5, (n + noise({x: cellx + x + 2000, y: celly + y + 2000}))/2));
						context.scale(fdir * scaleby, 1 * scaleby);
						// let row = (pgrass.frames[pgrass._f] / pgrass.spriteSheet._f) | 0;
						// let col = pgrass.frames[pgrass._f] % pgrass.spriteSheet._f | 0;
						
						// context.drawImage(
						// 	pgrass.spriteSheet.image,
						// 	pgrass.margin + col * pgrass.width + (col * 2 + 1) * pgrass.spacing,
						// 	pgrass.margin + row * pgrass.height + (row * 2 + 1) * pgrass.spacing,
						// 	pgrass.width,
						// 	pgrass.height,
						// 	0,
						// 	0,
						// 	pgrass.width, //* fdir * -1,
						// 	pgrass.height
						// );
						context.drawImage(
							pgrass,
							0,
							0,
							pgrass.width,
							pgrass.height,
							0,
							0,
							pgrass.width * fdir, //* fdir * -1,
							pgrass.height
						);
						context.restore();
					}
				}
			}
		}

		context.save();
		context.translate(-this.x, -this.y); // Camera
		for (let idx = 0; idx < this.objects.length; idx++) {
			this.objects[idx].render();
		}
		context.restore();
	}
	addChild(c) {
  	let arr = this.objects || [];
  	c.parent = this;
		arr.push(c);
		this.objects = arr;
  }
  removeChild(c) {
		let arr = this.objects || [];
		let idx = arr.indexOf(c);
		if (idx >= 0) {
			arr.splice(idx, 1);
		}
		c.parent = null;
  }
  reset() {
  	this.objects = [];
  }
  update(step) {
  	this.x = _player.x - canvas.width / 2 / _cscale;
		this.y = _player.y - canvas.height / 2 / _cscale;
  	(this.grass || []).forEach(g => g.update && g.update(step));
  	(this.objects || []).forEach(o => o.update && o.update(step));
  }
};

/***** Constants ******/
const FRAME_DT = 1.0/60.0;
let _gametime = 0;
let _win = false;
let _loop = null;
let _map = null;
let _ui = {
	x: 0,
	y: 14,
	cardSeparation: 4,
	objects: [],
	reset: function() {
		this.objects = [];
	},
	render: function() {
		context.save();
		if (this.x || this.y) { context.translate(this.x, this.y); }

		for (let idx = 0; idx < this.objects.length; idx++) {
			this.objects[idx].render();
			context.translate(this.objects[idx].cardWidth + this.cardSeparation, 0);
		}
		// (this.objects || []).forEach(o => o.render && o.render());
		context.restore();
		
	},
	addChild: function(c) {
  	let arr = this.objects || [];
  	c.parent = this;
		arr.push(c);
		this.objects = arr;
  },
  removeChild: function(c) {
		let arr = this.objects || [];
		let idx = arr.indexOf(c);
		if (idx >= 0) {
			arr.splice(idx, 1);
		}
		c.parent = null;
  },
  update: function(step) {
  	let width = 0;
  	(this.objects || []).forEach(o => {
  		o.update && o.update(step);
  		width += o.cardWidth + o.border.l + o.border.r + this.cardSeparation;
  	});
  	this.x = canvas.width / 2 / _cscale - width / 2;
  }
};
let _player = null;
let _boss = null;
let _espawner = null;
// let _enemies = [];
let _imageCache = {};
let _allSpritesheets = [];
// let _bulletSpritesheets = [];
// let _uiSpritesheets = [];
// let _mouse_pos = {x: 0, y: 0};
let _backgroundColor = "#334e1b";//"#1d4e1b";//"#256022";//"#315282";
let _sounds = {
	'background': createAudio({
    loop: true,
    songData: [
      { // Instrument 0
        i: [
        2, // OSC1_WAVEFORM
        100, // OSC1_VOL
        128, // OSC1_SEMI
        0, // OSC1_XENV
        3, // OSC2_WAVEFORM
        201, // OSC2_VOL
        128, // OSC2_SEMI
        0, // OSC2_DETUNE
        0, // OSC2_XENV
        0, // NOISE_VOL
        5, // ENV_ATTACK
        6, // ENV_SUSTAIN
        58, // ENV_RELEASE
        0, // ENV_EXP_DECAY
        0, // ARP_CHORD
        0, // ARP_SPEED
        0, // LFO_WAVEFORM
        195, // LFO_AMT
        6, // LFO_FREQ
        1, // LFO_FX_FREQ
        2, // FX_FILTER
        135, // FX_FREQ
        0, // FX_RESONANCE
        0, // FX_DIST
        32, // FX_DRIVE
        147, // FX_PAN_AMT
        6, // FX_PAN_FREQ
        121, // FX_DELAY_AMT
        6 // FX_DELAY_TIME
        ],
        // Patterns
        p: [1],
        // Columns
        c: [
          {n: [139,,,,137,,,,139,,,,140,,,,,,,,135],
           f: []}
        ]
      },
    ],
    // rowLen: 5513,   // In sample lengths
    patternLen: 32,  // Rows per pattern
    // endPattern: 0,  // End pattern
    // numChannels: 1  // Number of channels
  }),
	'edie': createAudio({
		// loop: false,
    songData: [
      { // Instrument 0
        i: [
        0, // OSC1_WAVEFORM
        255, // OSC1_VOL
        116, // OSC1_SEMI
        64, // OSC1_XENV
        0, // OSC2_WAVEFORM
        255, // OSC2_VOL
        120, // OSC2_SEMI
        0, // OSC2_DETUNE
        64, // OSC2_XENV
        127, // NOISE_VOL
        4, // ENV_ATTACK
        6, // ENV_SUSTAIN
        35, // ENV_RELEASE
        0, // ENV_EXP_DECAY
        0, // ARP_CHORD
        0, // ARP_SPEED
        0, // LFO_WAVEFORM
        0, // LFO_AMT
        0, // LFO_FREQ
        0, // LFO_FX_FREQ
        2, // FX_FILTER
        14, // FX_FREQ
        0, // FX_RESONANCE
        10, // FX_DIST
        32, // FX_DRIVE
        0, // FX_PAN_AMT
        0, // FX_PAN_FREQ
        0, // FX_DELAY_AMT
        0 // FX_DELAY_TIME
        ],
        // Patterns
        p: [1],
        // Columns
        c: [
          {n: [156],
           f: []}
        ]
      },
    ],
    // rowLen: 5513,   // In sample lengths
    // patternLen: 1,  // Rows per pattern
    // endPattern: 0,  // End pattern
    // numChannels: 1  // Number of channels
  }),
  'ehit': createAudio({
		// loop: false,
    songData: [
      { // Instrument 0
        i: [
        0, // OSC1_WAVEFORM
        255, // OSC1_VOL
        116, // OSC1_SEMI
        79, // OSC1_XENV
        0, // OSC2_WAVEFORM
        255, // OSC2_VOL
        116, // OSC2_SEMI
        0, // OSC2_DETUNE
        83, // OSC2_XENV
        0, // NOISE_VOL
        4, // ENV_ATTACK
        6, // ENV_SUSTAIN
        69, // ENV_RELEASE
        52, // ENV_EXP_DECAY
        0, // ARP_CHORD
        0, // ARP_SPEED
        0, // LFO_WAVEFORM
        0, // LFO_AMT
        0, // LFO_FREQ
        0, // LFO_FX_FREQ
        2, // FX_FILTER
        14, // FX_FREQ
        0, // FX_RESONANCE
        0, // FX_DIST
        32, // FX_DRIVE
        0, // FX_PAN_AMT
        0, // FX_PAN_FREQ
        0, // FX_DELAY_AMT
        0 // FX_DELAY_TIME
        ],
        // Patterns
        p: [1],
        // Columns
        c: [
          {n: [151],
           f: []}
        ]
      },
    ],
    // rowLen: 5513,   // In sample lengths
    // patternLen: 1,  // Rows per pattern
    // endPattern: 0,  // End pattern
    // numChannels: 1  // Number of channels
	}),
  'pickup': createAudio({
    // loop: false,
    songData: [
        { // Instrument 0
          i: [
          3, // OSC1_WAVEFORM
          194, // OSC1_VOL
          128, // OSC1_SEMI
          0, // OSC1_XENV
          2, // OSC2_WAVEFORM
          198, // OSC2_VOL
          128, // OSC2_SEMI
          6, // OSC2_DETUNE
          0, // OSC2_XENV
          0, // NOISE_VOL
          12, // ENV_ATTACK
          12, // ENV_SUSTAIN
          33, // ENV_RELEASE
          0, // ENV_EXP_DECAY
          0, // ARP_CHORD
          0, // ARP_SPEED
          0, // LFO_WAVEFORM
          61, // LFO_AMT
          4, // LFO_FREQ
          1, // LFO_FX_FREQ
          2, // FX_FILTER
          109, // FX_FREQ
          86, // FX_RESONANCE
          7, // FX_DIST
          32, // FX_DRIVE
          112, // FX_PAN_AMT
          3, // FX_PAN_FREQ
          67, // FX_DELAY_AMT
          2 // FX_DELAY_TIME
          ],
          // Patterns
          p: [1],
          // Columns
          c: [
            {n: [182],
             f: []}
          ]
        },
      ],
    // rowLen: 5513,   // In sample lengths
    // patternLen: 1,  // Rows per pattern
    // endPattern: 0,  // End pattern
    // numChannels: 1  // Number of channels
  }),
	'gshoot': createAudio({
		// loop: false,
		volume: .5,
    songData: [
      { // Instrument 0
        i: [
        0, // OSC1_WAVEFORM
        192, // OSC1_VOL
        104, // OSC1_SEMI
        64, // OSC1_XENV
        0, // OSC2_WAVEFORM
        80, // OSC2_VOL
        99, // OSC2_SEMI
        0, // OSC2_DETUNE
        0, // OSC2_XENV
        0, // NOISE_VOL
        4, // ENV_ATTACK
        0, // ENV_SUSTAIN
        66, // ENV_RELEASE
        0, // ENV_EXP_DECAY
        0, // ARP_CHORD
        0, // ARP_SPEED
        3, // LFO_WAVEFORM
        0, // LFO_AMT
        0, // LFO_FREQ
        0, // LFO_FX_FREQ
        1, // FX_FILTER
        0, // FX_FREQ
        1, // FX_RESONANCE
        2, // FX_DIST
        32, // FX_DRIVE
        37, // FX_PAN_AMT
        4, // FX_PAN_FREQ
        0, // FX_DELAY_AMT
        0 // FX_DELAY_TIME
        ],
        // Patterns
        p: [1],
        // Columns
        c: [
          {n: [175],
           f: []}
        ]
      },
    ],
    // rowLen: 5513,   // In sample lengths
    // patternLen: 1,  // Rows per pattern
    // endPattern: 0,  // End pattern
    // numChannels: 1  // Number of channels
  }),
  'lbounce': createAudio({
  	// loop: false,
    songData: [
      { // Instrument 0
        i: [
        0, // OSC1_WAVEFORM
        192, // OSC1_VOL
        104, // OSC1_SEMI
        64, // OSC1_XENV
        0, // OSC2_WAVEFORM
        80, // OSC2_VOL
        99, // OSC2_SEMI
        0, // OSC2_DETUNE
        0, // OSC2_XENV
        0, // NOISE_VOL
        4, // ENV_ATTACK
        0, // ENV_SUSTAIN
        66, // ENV_RELEASE
        0, // ENV_EXP_DECAY
        0, // ARP_CHORD
        0, // ARP_SPEED
        3, // LFO_WAVEFORM
        0, // LFO_AMT
        0, // LFO_FREQ
        0, // LFO_FX_FREQ
        1, // FX_FILTER
        0, // FX_FREQ
        1, // FX_RESONANCE
        2, // FX_DIST
        32, // FX_DRIVE
        37, // FX_PAN_AMT
        4, // FX_PAN_FREQ
        0, // FX_DELAY_AMT
        0 // FX_DELAY_TIME
        ],
        // Patterns
        p: [1],
        // Columns
        c: [
          {n: [182],
           f: []}
        ]
      },
    ],
    // rowLen: 5513,   // In sample lengths
    // patternLen: 1,  // Rows per pattern
    // endPattern: 0,  // End pattern
    // numChannels: 1  // Number of channels
  }),
  'lvlup': createAudio({
  	// loop: false,
    songData: [
      { // Instrument 0
        i: [
        0, // OSC1_WAVEFORM
        255, // OSC1_VOL
        152, // OSC1_SEMI
        0, // OSC1_XENV
        0, // OSC2_WAVEFORM
        255, // OSC2_VOL
        152, // OSC2_SEMI
        12, // OSC2_DETUNE
        0, // OSC2_XENV
        0, // NOISE_VOL
        2, // ENV_ATTACK
        0, // ENV_SUSTAIN
        60, // ENV_RELEASE
        0, // ENV_EXP_DECAY
        0, // ARP_CHORD
        0, // ARP_SPEED
        0, // LFO_WAVEFORM
        0, // LFO_AMT
        0, // LFO_FREQ
        0, // LFO_FX_FREQ
        2, // FX_FILTER
        255, // FX_FREQ
        0, // FX_RESONANCE
        0, // FX_DIST
        32, // FX_DRIVE
        47, // FX_PAN_AMT
        3, // FX_PAN_FREQ
        157, // FX_DELAY_AMT
        2 // FX_DELAY_TIME
        ],
        // Patterns
        p: [1],
        // Columns
        c: [
          {n: [166,,168,,170,,159],
           f: []}
        ]
      },
    ],
    // rowLen: 5513,   // In sample lengths
    patternLen: 12,  // Rows per pattern
    // endPattern: 0,  // End pattern
    // numChannels: 1  // Number of channels
  }),
  'gover': createAudio({
  	// loop: false,
    songData: [
      { // Instrument 0
        i: [
        0, // OSC1_WAVEFORM
        214, // OSC1_VOL
        104, // OSC1_SEMI
        64, // OSC1_XENV
        0, // OSC2_WAVEFORM
        204, // OSC2_VOL
        104, // OSC2_SEMI
        0, // OSC2_DETUNE
        64, // OSC2_XENV
        229, // NOISE_VOL
        4, // ENV_ATTACK
        40, // ENV_SUSTAIN
        43, // ENV_RELEASE
        51, // ENV_EXP_DECAY
        0, // ARP_CHORD
        0, // ARP_SPEED
        0, // LFO_WAVEFORM
        231, // LFO_AMT
        6, // LFO_FREQ
        1, // LFO_FX_FREQ
        3, // FX_FILTER
        183, // FX_FREQ
        15, // FX_RESONANCE
        0, // FX_DIST
        32, // FX_DRIVE
        232, // FX_PAN_AMT
        4, // FX_PAN_FREQ
        74, // FX_DELAY_AMT
        6 // FX_DELAY_TIME
        ],
        // Patterns
        p: [1],
        // Columns
        c: [
          {n: [159],
           f: []}
        ]
      },
    ],
    // rowLen: 5513,   // In sample lengths
    patternLen: 8,  // Rows per pattern
    // endPattern: 0,  // End pattern
    // numChannels: 1  // Number of channels
  }),
  'gwin': createAudio({
    songData: [
      { // Instrument 0
        i: [
        3, // OSC1_WAVEFORM
        100, // OSC1_VOL
        128, // OSC1_SEMI
        0, // OSC1_XENV
        3, // OSC2_WAVEFORM
        201, // OSC2_VOL
        128, // OSC2_SEMI
        2, // OSC2_DETUNE
        0, // OSC2_XENV
        0, // NOISE_VOL
        0, // ENV_ATTACK
        6, // ENV_SUSTAIN
        49, // ENV_RELEASE
        0, // ENV_EXP_DECAY
        0, // ARP_CHORD
        0, // ARP_SPEED
        0, // LFO_WAVEFORM
        139, // LFO_AMT
        4, // LFO_FREQ
        1, // LFO_FX_FREQ
        3, // FX_FILTER
        30, // FX_FREQ
        184, // FX_RESONANCE
        119, // FX_DIST
        244, // FX_DRIVE
        147, // FX_PAN_AMT
        6, // FX_PAN_FREQ
        84, // FX_DELAY_AMT
        6 // FX_DELAY_TIME
        ],
        // Patterns
        p: [1],
        // Columns
        c: [
          {n: [156,,154,,156,,158],
           f: []}
        ]
      },
    ],
    patternLen: 8,
  }),
};
let _items = null;//{
	// 'pew': {}, // Populated on load
	// 'flame': {},
	// 'magnet': {},
//};
let _itemFlavors; // d == damage, support == support; weird what saves chars and what adds them.
const populateItems = function() {
	_items = {
		'pew': function () {return createGun({
			itemType: 'pew',
			itemFlavor: 'd',
			level: 1,
			maxLevel: 6,
			x: 0,
			y: 0,
			// width: 1,
			// height: 1,
			// color: '#AA869400',
			scaleX: 1,
			scaleY: 1,
			bulletSpeed: 25,
			reloadTime: 2.0,
			shootSound: _sounds['gshoot'],
			damage: 1,
			icon: _allSpritesheets[5].animations,
			iconWidth: 4,
			iconHeight: 4,
			bulletArgs: {
				width: 4,
				height: 4,
				hurtHeight: 1,
				hurtWidth: 1,
				animations: _allSpritesheets[5].animations,
				removeOnHit: true,
			}
		})},
		'flame': function () {return createGun({
			itemType: 'flame',
			itemFlavor: 'd',
			level: 1,
			maxLevel: 6,
			x: 0,
			y: 0,
			scaleX: 1,
			scaleY: 1,
			bulletSpeed: 2,
			// color: '#00000000',
			// width: 1,
			// height: 1,
			anchor: {x: 0.5, y: 0.5},
			flames: [],
			maxFlames: 1,
			flameDist: 16,
			time: 0,
			icon: _allSpritesheets[7].animations,
			bulletArgs: {
				width: 8,
				height: 8,
				scaleX: .75,
				scaleY: .75,
				hurtHeight: 4,
				hurtWidth: 4,
				anchor: {x: 0.5, y: 0.5},
				ttl: Infinity,
				removeOnHit: false,
				animations: _allSpritesheets[7].animations,
			},
			aiTransitions: {
				'spawnFlames': [
					{ method: 'updateFlames', args: []},
					{ method: 'fire', args: []},
					{ method: 'addFlame', args: []},
					{ method: 'changeState', args: ['reloadg']},
				],
				'reloadg': [
					{ method: 'updateFlames', args: []},
					{ method: 'reload', args: []},
					{ method: 'changeState', args: ['spawnFlames']},
				],
				// 'idle': [
				// 	{ method: 'updateFlames', args: []},
				// 	{ method: 'changeState', args: ['spawnFlames']},
				// ],
			},
			aiState: 'reloadg',
			addFlame: function(f) {
				this.addChild(f);
				// if (this.objects.length >= this.maxFlames) {
				// 	this.changeState('idle');
				// }
				return true;
			},
			updateFlames: function() {
				this.time += FRAME_DT;
				let wp = {x: this.parent?.world?.x | 0 + this.x,
									y: this.parent?.world?.y | 0 + this.y};
				for (let fidx = 0; fidx < this.objects?.length | 0; fidx++) {
					let f = this.objects[fidx];
					f.speed = this.bulletSpeed + (1 - 1/this.level)*this.bulletSpeed;
					f.damage = this.damage * (1 + this.level);//this.damage * this.level;
					const MAX_IN_RING = 3;
					let layer = Math.floor(fidx / MAX_IN_RING);
					let leftover = fidx - layer*MAX_IN_RING; // keep max of 3
					let numinlayer = this.objects.length - layer * MAX_IN_RING;
					let offset = leftover * Math.PI * 2 / Math.min(MAX_IN_RING, numinlayer);
					// let offset = (layer + 1) * fidx * Math.PI * 2 / this.objects.length;
					let spindir = (layer % 2 == 0) ? 1 : -1;
					let d = rotate({x: this.flameDist - layer*4*Math.sin(this.time*f.speed), y: 0}, offset + spindir * this.time * f.speed);
					// let offset = fidx * Math.PI * 2 / this.objects.length;
					// let d = rotate({x: this.flameDist, y: 0}, offset + this.time * f.speed);

					f.x = d.x;//wp.x + d.x;
					f.y = d.y;//wp.y + d.y;
				}
				this.maxFlames = this.level;
				return ((this.objects?.length | 0) < this.maxFlames) ? {dir: {x: 0, y: 0}} : null;
			}
		})},
		'magnet': function () {return {
			itemType: 'magnet',
			itemFlavor: 'support',
			level: 1,
			maxLevel: 2,
			// width: 1,
			// height: 1,
			scaleX: .5,
			scaleY: .5,
			world: {x:0,y:0,width:0,height:0,scaleX:1,scaleY:1},
			icon: _allSpritesheets[14].animations,
			update: function(dt) {
				let parent = this.parent?.world || {x:0,y:0,width:0,height:0,scaleX:1,scaleY:1/*,dirty:true*/};
				this.world.scaleX = this.scaleX * parent.scaleX;
				this.world.scaleY = this.scaleY * parent.scaleY;
				this.world.x = this.x + parent.x;
				this.world.y = this.y + parent.y;
				this.world.width = this.width * parent.scaleX;
				this.world.height = this.height * parent.scaleY;

				if (!this.attractionRange) {
					this.attractionRange = this.parent?.attractionRange;
				}
        if (!this.attractionSpeed) {
          this.attractionSpeed = this.parent?.attractspeed;
        }
				this.parent.attractionRange = this.attractionRange * (1 + this.level);
        this.parent.attractspeed = this.attractionSpeed + (40 * this.level);
			},
		}},
		'hiheel': function () {return {
			itemType: 'hiheel',
			itemFlavor: 'support',
			level: 1,
			maxLevel: 2,
			// width: 1,
			// height: 1,
			scaleX: .5,
			scaleY: .5,
			world: {x:0,y:0,width:0,height:0,scaleX:1,scaleY:1},
			icon: _allSpritesheets[15].animations,
			update: function(dt) {
				let parent = this.parent?.world || {x:0,y:0,width:0,height:0,scaleX:1,scaleY:1/*,dirty:true*/};
				this.world.scaleX = this.scaleX * parent.scaleX;
				this.world.scaleY = this.scaleY * parent.scaleY;
				this.world.x = this.x + parent.x;
				this.world.y = this.y + parent.y;
				this.world.width = this.width * parent.scaleX;
				this.world.height = this.height * parent.scaleY;

				if (!this.speed) {
					this.speed = this.parent?.speed;
				} else {
					this.parent.speed = this.speed + this.level * 5;
				}
			},
		}},
		'ltn': function () {return createGun({
			itemType: 'ltn',
			itemFlavor: 'd',
			level: 1,
			maxLevel: 6,
			x: 0,
			y: 0,
			// width: 1,
			// height: 1,
			// color: '#AA869400',
			scaleX: 1,
			scaleY: 1,
			bounceAmt: 1,
			bulletSpeed: 40,
			reloadTime: 4.0,
			shootSound: _sounds['gshoot'],
			damage: 1,
			icon: _allSpritesheets[6].animations,
			iconWidth: 4,
			iconHeight: 4,
			bulletArgs: {
				width: 4,
				height: 4,
				hurtHeight: 1,
				hurtWidth: 1,
				animations: _allSpritesheets[6].animations,
				maxAttackRange: 40,
			},
			reload: function () {
				let rt = Math.max(FRAME_DT, this.reloadTime - 0.03*this.level*this.level);
				return this.aiDeltaUpdate(rt);
			},
			fire: function(tar) {
				if (tar == null) {
					return null;
				}
				// console.log('Fired gun: ', tar);
				let b = createBullet(Object.assign({
					x: this.world.x,
					y: this.world.y,
					speed: this.bulletSpeed + (1 - 1/this.level)*this.bulletSpeed,
					//direction: tar.dir,
					target: tar.obj,
					ttl: (1.0 / FRAME_DT) * 5, // 5 seconds
					// color: '#00FF00',
					width: 1,
					height: 1,
					scaleX: 1,
					scaleY: 1,
					bounceAmt: this.bounceAmt + this.level,
					targetType: this.targetType,
					// level: this.level,
					damage: this.damage * (((this.targetType == 1) ? 1 : 0) + this.level),
					getClosestTargetInRange: _getClosestTargetInRange,
					update: function(step) {
						if (!this.target || this.target?.curHealth <= 0 || dist(this.target, this) > this.maxAttackRange) {//pick a new target
							this.target = this.getClosestTargetInRange(this.target)?.obj;
						} else {
							this.direction = dir(this.world, this.target.world);
							this.dx = this.direction.x * this.speed;
							this.dy = this.direction.y * this.speed;
							this.advance(step);
							switch(this.targetType) {
							case 1:
								if (this.hurtBox.intersects(this.target.hurtBox)) {
									this.target?.takeDamage && this.target.takeDamage(this.damage);
									this.bounceAmt -= 1;
									this.target = this.getClosestTargetInRange(this.target)?.obj;
                  if (this.bounceAmt > 0) {
                    _sounds['lbounce'].play();
                  }
								}
								break;
							}
						}
						if (this.ttl <= 0 || this.bounceAmt <= 0 || this.target == null) {
							_map.removeChild(this);
						}
					}
				}, this.bulletArgs));
				// _map.addChild(b);
				this.shootSound && this.shootSound.play();
				return b;
			}
		})},
	};
	_itemFlavors = {
		'pew': 'd',
		'flame': 'd',
		'magnet': 'support',
		'hiheel': 'support',
		'ltn': 'd'
	};
};

/*** End Constants ****/
// canvas.addEventListener('mousemove', (evt) => {
// 	let rect = canvas.getBoundingClientRect();
// 	_mouse_pos = {
// 		x: (evt.clientX - rect.left) / _cscale + _map.x,
// 		y: (evt.clientY - rect.top) / _cscale + _map.y
// 	};
// });

const clamp = function(v, min, max) {
	return Math.min(Math.max(v, min), max);
};

const loadImage = function(url) {
	return new Promise( (resolve, reject) => {
		if (_imageCache[url]) {
			return resolve(_imageCache[url]);
		}

		let image = new Image();
		image.onload = function () {
			let fullUrl = new URL(url, window.location.href).href;
			_imageCache[url] = _imageCache[fullUrl] = this;
			resolve(this);
		};
		image.onerror = function() {
			reject(url);
		};
		image.src = url;
	});
};

const load = function( ...urls ) {
	return Promise.all(urls.map(asset => {return loadImage(asset);}));
};

const normalize = function(v) {
	let len = Math.sqrt(v.x * v.x + v.y * v.y);
	return {
		x: v.x / (len != 0 ? len : 1),
		y: v.y / (len != 0 ? len : 1)
	};
};
const dist = function(v1,v2) {
	var tmp = {x: v1.x - v2.x, y: v1.y - v2.y};
	return Math.sqrt((tmp.x * tmp.x) + (tmp.y * tmp.y));
};
const dir = function(v1, v2) { // direction vector from v1 to v2
	return normalize({x: v2.x - v1.x, y: v2.y - v1.y});
};
const rotate = function(v1, a) {
	let c = Math.cos(a);
	let s = Math.sin(a);
	return {
		x: c * v1.x - s * v1.y,
		y: s * v1.x + c * v1.y,
	};
};
const vright = function(v1) {
	return {x: -v1.y, y: v1.x};
};
const drawText = function (txt, pos, font/*="22px serif"*/) {
	context.save();
	context.font = font;
	context.fillText(txt, pos.x, pos.y);
	context.restore();
};

class MySprite {
	/**
	 * Hacked up and heavily modified version of Kontra's Sprite class.
	 * 
	 * The MIT License (MIT)
	 * 
	 * Copyright (c) 2015 Steven Lambert
	 * 
	 * Permission is hereby granted, free of charge, to any person obtaining a copy
	 * of this software and associated documentation files (the "Software"), to deal
	 * in the Software without restriction, including without limitation the rights
	 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
	 * copies of the Software, and to permit persons to whom the Software is
	 * furnished to do so, subject to the following conditions:
	 * 
	 * The above copyright notice and this permission notice shall be included in
	 * all copies or substantial portions of the Software.
	 * 
	 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
	 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
	 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
	 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
	 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
	 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
	 * THE SOFTWARE.
	 */
  constructor(properties) {
    this.init(properties);
    this.initialize();
  }

  init(properties) {
  	Object.assign(this,{
  		x:0,y:0,dx:0,dy:0,ddx:0,ddy:0,anchor:{x:0,y:0},ttl:Infinity,scaleX:1,scaleY:1,parent:null,visible:true,
  		world:{x:0,y:0,width:0,height:0,scaleX: properties.scaleX || 1,scaleY: properties.scaleY || 1},
  		hurtWidth:0, hurtHeight:0,flipy:false,flipx:false,
  	});
    Object.assign(this, properties);

    if ('animations' in properties) {
    	this.animations = cloneAnimations(properties.animations);
    	this.currentAnimation = this.animations[Object.keys(this.animations)[0]];
    	this.width = this.currentAnimation.width;
    	this.height = this.currentAnimation.height;
    }
    this.hurtBox = new MyBoundingRect({
    	parent: this,
    	center: {x: 0, y: 0},
    	width: this.hurtWidth,
    	height: this.hurtHeight,
    })
  }

  initialize() {}

  isAlive() {
    return this.ttl > 0;
  }

  addChild(c) {
  	let arr = this.objects || [];
  	c.parent = this;
		arr.push(c);
		this.objects = arr;
  }

  removeChild(c) {
		let arr = this.objects || [];
		let idx = arr.indexOf(c);
		if (idx >= 0) {
			arr.splice(idx, 1);
		}
		c.parent = null;
  }

  update(dt=FRAME_DT) {
  	this.advance(dt);
  }

  advance(dt=FRAME_DT) {
	  this.dx += this.ddx * dt;
	  this.dy += this.ddy * dt;

	  this.x += this.dx * dt;
	  this.y += this.dy * dt;
	  // if (Math.abs(this.dx) > 0 || Math.abs(this.dy) > 0) {
	  // 	this.world.dirty = true; // DEBT: assumes only the x/y pos changes
	  // }

	  this.ttl--;
		this.currentAnimation?.update(dt);

		let parent = this.parent?.world || {x:0,y:0,width:0,height:0,scaleX:1,scaleY:1/*,dirty:true*/};
		// if (parent.dirty) {
			this.world.scaleX = this.scaleX * parent.scaleX;
			this.world.scaleY = this.scaleY * parent.scaleY;
			this.world.x = this.x + parent.x;
			this.world.y = this.y + parent.y;
			this.world.width = this.width * parent.scaleX;
			this.world.height = this.height * parent.scaleY;
			// this.world.dirty = true;
		// } else {
		// 	this.world.dirty = false;
		// }

		(this.objects || []).forEach(o => o.update && o.update(dt));
	}

	playAnimation(name) {
	  this.currentAnimation?.stop();
	  this.currentAnimation = this.animations[name];
	  this.currentAnimation.start();
	}

	render() {
		if (!this.visible) { return; }
		context.save();
		if (this.x || this.y) { context.translate(this.x, this.y); }

		context.save();
		if ('currentAnimation' in this) {
			let row = (this.currentAnimation.frames[this.currentAnimation._f] / this.currentAnimation.spriteSheet._f) | 0;
			let col = this.currentAnimation.frames[this.currentAnimation._f] % this.currentAnimation.spriteSheet._f | 0;
			// let fdir = ('facing_dir' in this) ? this.facing_dir : -1;
			let fx = (this.flipx ? -1 : 1);
			let fy = (this.flipy ? -1 : 1);
			context.scale(fx * this.scaleX, fy * this.scaleY);
			// if (fdir > 0) {
			// 	context.scale(-this.scaleX, this.scaleY * fy);
			// } else {
			// 	context.scale(this.scaleX, this.scaleY * fy);
			// }
			context.filter = (this?.invert) ? 'invert(1)' : '';
			// context.translate(fdir * this.currentAnimation.width * this.anchor.x, -1 * fy * this.currentAnimation.height * this.anchor.y);
			context.translate(-1 * fx * this.currentAnimation.width * this.anchor.x, -1 * fy * this.currentAnimation.height * this.anchor.y);
			context.drawImage(
				this.currentAnimation.spriteSheet.image,
				this.currentAnimation.margin + col * this.currentAnimation.width + (col * 2 + 1) * this.currentAnimation.spacing,
				this.currentAnimation.margin + row * this.currentAnimation.height + (row * 2 + 1) * this.currentAnimation.spacing,
				this.currentAnimation.width,
				this.currentAnimation.height,
				0,
				0,
				this.currentAnimation.width * fx,
				this.currentAnimation.height * fy,
				// this.currentAnimation.width * fdir * -1,
				// this.currentAnimation.height * (this.flipy ? -1 : 1),
			);
		// } else if ('image' in this) {
		// 	context.scale(this.scaleX, this.scaleY);
		// 	context.translate(-this.image.width * this.anchor.x, -this.image.height * this.anchor.y);
		// 	context.drawImage(this.image, 0, 0, this.image.width, this.image.height);
		}/* else if ('color' in this) {
			context.translate(-this.width * this.anchor.x, -this.height * this.anchor.y);
			context.fillStyle = this.color;
			if (this.shape == 'circle') {
				context.beginPath();
				context.arc(this.width * this.anchor.x, this.height * this.anchor.y, Math.min(this.width, this.height) * .5, 2 * Math.PI, false);
				context.fill();
			} else {
				context.fillRect(0, 0, this.width, this.height);
			}
		}*/

		context.restore();
		(this.objects || []).forEach(o => o.render && o.render());
		
		context.restore();
	}
};

class MyBoundingRect {
	constructor({
		parent,
		center,
		width,
		height
	} = {}) {
		this.center = center;
		//this.topleft = topleft;
		this.width = width;
		this.height = height;
		this.parent = parent;
	}

	getWorldPos() {
		return {x: this.center.x + this.parent?.world?.x | 0,
						y: this.center.y + this.parent?.world?.y | 0};
	}

	intersects(rect) {
		let twp = this.getWorldPos();
		let rwp = rect.getWorldPos();
		return (Math.abs(twp.x - rwp.x) * 2 < (this.width + rect.width)) &&
				(Math.abs(twp.y - rwp.y) * 2 < (this.height + rect.height));

	}

	//// Gets the closest point of intersection on the provided rect.
	//// Returns the intersection point {x,y} or null if no intersection.
	// intersectionPoint(rect) {
	// 	if (intersects(rect)) {
	// 		let twp = this.getWorldPos();
	// 		let rwp = rect.getWorldPos();
	// 		let dx = rwp.x - twp.x;
	// 		let dy = rwp.y - twp.y;

	// 		let pt = {
	// 			x: rwp.x + Math.sign(dx) * Math.min(rect.width / 2., Math.abs(dx)),
	// 			y: rwp.y + Math.sign(dy) * Math.min(rect.height / 2., Math.abs(dy))
	// 		};
	// 		return pt;
	// 	}
	// 	return null;
	// }
}

class MyGameLoop {
	/**
	 * Hacked up and heavily modified version of Kontra's GameLoop object.
	 * 
	 * The MIT License (MIT)
	 * 
	 * Copyright (c) 2015 Steven Lambert
	 * 
	 * Permission is hereby granted, free of charge, to any person obtaining a copy
	 * of this software and associated documentation files (the "Software"), to deal
	 * in the Software without restriction, including without limitation the rights
	 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
	 * copies of the Software, and to permit persons to whom the Software is
	 * furnished to do so, subject to the following conditions:
	 * 
	 * The above copyright notice and this permission notice shall be included in
	 * all copies or substantial portions of the Software.
	 * 
	 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
	 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
	 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
	 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
	 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
	 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
	 * THE SOFTWARE.
	 */
	constructor(properties) {
    this.fps = 60;
    Object.assign(this, properties);
    this.isStopped = true;

    // animation variables
    this.accumulator = 0;
    this.delta = 1e3 / this.fps; // delta between performance.now timings (in ms)
    this.step = 1 / this.fps;
    this.last = null;
    this.rAF = null;
    // this.now = null;
    this.dt = null;
    this.focused = true;

    window.addEventListener('focus', () => {
      this.focused = true;
    });
    window.addEventListener('blur', () => {
      this.focused = false;
    });
  }

  // clearFn() {
  // 	context.clearRect(0, 0, canvas.width, canvas.height);
	// }

  frame() {
  	if (this.isStopped) {return;}

    // don't update the frame if tab isn't focused
    if (!this.focused) {
    	this.rAF = requestAnimationFrame(this.frame.bind(this));
    	return;
    }

    let now = performance.now();
    this.dt = now - this.last;
    this.last = now;

    // prevent updating the game with a very large dt if the game
    // were to lose focus and then regain focus later
    if (this.dt > 1e3) {
    	this.rAF = requestAnimationFrame(this.frame.bind(this));
      return;
    }

    this.accumulator += this.dt;

    while (this.accumulator >= this.delta) {
      // emit('tick');
      this.update(this.step);
      if (this.isStopped) { break;} // Prevent additional updates if the loop was stopped inside the update.

      this.accumulator -= this.delta;
    }

    // this.clearFn();
    context.clearRect(0, 0, canvas.width, canvas.height);
    this.render();
    // Do this at the end; the browser is an asshole and will call this
    // the next refresh - debugger and religion be damned.
    // It will be multi-threaded and it will cause random issues due to
    // contention among threads.
    // Long story short, the browser will not wait for this function to
    // finish before calling it again.
    this.rAF = requestAnimationFrame(this.frame.bind(this));
  }

  start() {
  	if (this.isStopped) {
	    this.last = performance.now();
	    this.isStopped = false;
	    this.rAF = requestAnimationFrame(this.frame.bind(this));
  	}
  }

  stop() {
    this.isStopped = true;
    cancelAnimationFrame(this.rAF);
  }

  update() {}

  fill_canvas(color, operation='destination-under', details=null) {
		context.save();
		context.globalCompositeOperation = operation;
		context.fillStyle = color;
		if (details) {
			context.fillRect(details.x, details.y, details.width, details.height);
		} else {
			context.fillRect(0, 0, canvas.width, canvas.height);
		}
		context.restore();
	}

  renderInside() {}
  render() {
  	this.fill_canvas(_backgroundColor, 'source-over');//#2c4875
		this.renderInside();
		//this.fill_canvas('#000000', 'source-over', {x:0, y:0, 						width:canvas.width, height:height_offset});
		//this.fill_canvas('#000000', 'source-over', {x:0, y:height_offset+480/cscale, width:canvas.width, height:height_offset});
  }
}

class MyAnimation {
	/**
	 * Hacked up and modified version of Kontra's GameLoop object.
	 * 
	 * The MIT License (MIT)
	 * 
	 * Copyright (c) 2015 Steven Lambert
	 * 
	 * Permission is hereby granted, free of charge, to any person obtaining a copy
	 * of this software and associated documentation files (the "Software"), to deal
	 * in the Software without restriction, including without limitation the rights
	 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
	 * copies of the Software, and to permit persons to whom the Software is
	 * furnished to do so, subject to the following conditions:
	 * 
	 * The above copyright notice and this permission notice shall be included in
	 * all copies or substantial portions of the Software.
	 * 
	 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
	 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
	 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
	 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
	 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
	 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
	 * THE SOFTWARE.
	 */
	constructor({ spriteSheet, frames, frameRate, loop = true, name }) {
			let {
				width,
				height,
				spacing = 0,
				margin = 0
			} = spriteSheet.frame;

			Object.assign(this, {
				spriteSheet,
				frames,
				frameRate,
				loop,
				name,
				width,
				height,
				spacing,
				margin,
				isStopped: false,

				// f = frame, a = accumulator
				_f: 0,
				_a: 0
			});
    }

    clone() {
			return new MyAnimation(this);
    }

    start() {
			this.isStopped = false;

			if (!this.loop) {
				this.reset();
			}
    }

    stop() {
			this.isStopped = true;
    }

    reset() {
			this._f = 0;
			this._a = 0;
    }

    update(dt = 1 / 60) {
			if (this.isStopped) {
				return;
			}

			// if the animation doesn't loop we stop at the last frame
			if (!this.loop && this._f == this.frames.length - 1) {
				this.stop();
				return;
			}

			this._a += dt;

	      // update to the next frame if it's time
			while (this._a * this.frameRate >= 1) {
				this._f = ++this._f % this.frames.length;
				this._a -= 1 / this.frameRate;
			}
    }

    render({
			x,
			y,
			width = this.width,
			height = this.height,
			context = context
	    }) {
			// get the row and col of the frame
			let row = (this.frames[this._f] / this.spriteSheet._f) | 0;
			let col = this.frames[this._f] % this.spriteSheet._f | 0;

			context.drawImage(
				this.spriteSheet.image,
				this.margin + col * this.width + (col * 2 + 1) * this.spacing,
				this.margin + row * this.height + (row * 2 + 1) * this.spacing,
				this.width,
				this.height,
				x,
				y,
				width,
				height
			);
    }
}

class MySpriteSheet {
	/**
	 * Hacked up and modified version of Kontra's GameLoop object.
	 * 
	 * The MIT License (MIT)
	 * 
	 * Copyright (c) 2015 Steven Lambert
	 * 
	 * Permission is hereby granted, free of charge, to any person obtaining a copy
	 * of this software and associated documentation files (the "Software"), to deal
	 * in the Software without restriction, including without limitation the rights
	 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
	 * copies of the Software, and to permit persons to whom the Software is
	 * furnished to do so, subject to the following conditions:
	 * 
	 * The above copyright notice and this permission notice shall be included in
	 * all copies or substantial portions of the Software.
	 * 
	 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
	 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
	 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
	 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
	 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
	 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
	 * THE SOFTWARE.
	 */
	constructor({
		image, 
		frameWidth, 
		frameHeight, 
		spacing = 0, 
		margin = 0, 
		animations
	} = {}) {
		this.animations = {};
		this.image = image;
		this.frame = {
			width: frameWidth,
			height: frameHeight,
			spacing,
			margin,
		};
		this._f = ((image.width - margin) / frameWidth) | 0;
		this.createAnimations(animations);
	}

	parseFrames(consecutiveFrames) {
		// return a single number frame
		// @see https://github.com/jed/140bytes/wiki/Byte-saving-techniques#coercion-to-test-for-types
		if (+consecutiveFrames == consecutiveFrames) {
			return consecutiveFrames;
		}

		let sequence = [];
		let frames = consecutiveFrames.split('..');

		// coerce string to number
		// @see https://github.com/jed/140bytes/wiki/Byte-saving-techniques#coercion-to-test-for-types
		let start = +frames[0];
		let end = +frames[1];
		let i = start;

		// ascending frame order
		if (start < end) {
			for (; i <= end; i++) {
				sequence.push(i);
			}
		}
		// descending order
		else {
			for (; i >= end; i--) {
				sequence.push(i);
			}
		}

		return sequence;
	}

	createAnimations(animations) {
		let sequence, name;

		for (name in animations) {
			let { frames, frameRate, loop } = animations[name];

			// array that holds the order of the animation
			sequence = [];

			// @ifdef DEBUG
			// if (frames == undefined) {
			// 	throw Error(
			// 	'Animation ' + name + ' must provide a frames property'
			// 	);
			// }
			// @endif

			// add new frames to the end of the array
			[].concat(frames).map(frame => {
				sequence = sequence.concat(this.parseFrames(frame));
			});

			this.animations[name] = new MyAnimation({
				spriteSheet: this,
				frames: sequence,
				frameRate,
				loop,
				name
			});
		}
	}
}

class HealthBar {
	constructor(properties) {
    Object.assign(this, Object.assign({
    	maxValue: 100, minValue: 0, value: 0,
    	x:0,y:0,anchor:{x:0,y:0},scaleX:1,scaleY:1,parent:null,visible:true,width:1,height:1,
  		world:{x:0,y:0,width:0,height:0,scaleX: properties.scaleX || 1,scaleY: properties.scaleY || 1},
    }, properties));
  
    if ('animations' in properties) {
    	this.animations = cloneAnimations(properties.animations);
    	Object.keys(this.animations).map((k) => {
    		let s = new MySprite({
    			width: 12,
    			height: 4,
    			animations: cloneAnimations(properties.animations),
    			flipy: properties.flipy || false,
    		});
    		s.playAnimation(k);
    		return s;
    	}).forEach((s) => {
    		this.addChild(s);
    	});
    	this.width = Math.max(this.width, 12);
    	this.height = Math.max(this.height, 4);
    }
  }

  addChild(c) {
  	let arr = this.objects || [];
  	c.parent = this;
		arr.push(c);
		this.objects = arr;
  }

  removeChild(c) {
		let arr = this.objects || [];
		let idx = arr.indexOf(c);
		if (idx >= 0) {
			arr.splice(idx, 1);
		}
		c.parent = null;
  }

  update(dt=FRAME_DT) {
  	this.advance(dt);
  }

  advance(dt=FRAME_DT) {
		let parent = this.parent?.world || {x:0,y:0,width:0,height:0,scaleX:1,scaleY:1};
		this.world.scaleX = this.scaleX * parent.scaleX;
		this.world.scaleY = this.scaleY * parent.scaleY;
		this.world.x = this.x + parent.x;
		this.world.y = this.y + parent.y;
		this.world.width = this.width * parent.scaleX;
		this.world.height = this.height * parent.scaleY;
		this.world.dirty = true;

		let amtfilled = this.value / (this.maxValue - this.minValue);
		this.objects[1].scaleX = amtfilled;
		(this.objects || []).forEach(o => o.update && o.update(dt));
	}

	render() {
		if (!this.visible) { return; }

		context.save();
		// if (this.x || this.y) { 
			context.translate(this.x - this.width * this.anchor.x * this.scaleX, 
												this.y - this.height * this.anchor.y * this.scaleY); 
		// }
		context.scale(this.scaleX, this.scaleY);

		(this.objects || []).forEach(o => o.render && o.render());
		context.restore();
	}
}

class Pickup extends MySprite {
	constructor(properties) {
    super(Object.assign({
    	shinedx: 0,
    	shinetime: 5,
    	// attractspeed: 40,
		}, properties));
  }

  pickup() {return false;}
  update(dt) {
  	let pdist = dist(_player.world, this.world);
  	if (pdist <= _player.attractionRange) {
  		// Move toward player
  		let d = dir(this.world, _player.world);
      let speed = (_player.attractionSpeed / 2 + (1 - pdist / _player.attractionRange) * _player.attractionSpeed * .75);
  		this.dx = d.x * speed;
  		this.dy = d.y * speed;
  	} else {
  		this.dx = 0;
  		this.dy = 0;
  	}

  	this.advance(dt);
  	if (_player.hurtBox.intersects(this.hurtBox) && this.pickup()) {
  		_map.removeChild(this);
  	}

  	this.shinedx += dt;
  	if (this.shinedx >= this.shinetime) {
  		this.shinedx = 0;
  		this.playAnimation('shine');
  	}
  }
}

class ItemCard {
	constructor(properties) {
    Object.assign(this, (Object.assign({
    	icon: null,
    	cardWidth: 8,
    	cardHeight: 8,
    	border: {l: 1, r: 2, b: -.5, t: -.5},
    	color: '#333333',
    	borderColor: '#000000',
    	emptyColor: '#000000',//'#555555',
    	filledColor: '#00FF00',
    	anchor: {x: .5, y: .5},
    	banchor: {x: .26, y: .5},
    	world:{x:0,y:0,width:0,height:0,scaleX: properties.scaleX || 1,scaleY: properties.scaleY || 1},
		}, properties)));
		
		this.icon = cloneAnimations(this.icon);
		this.frame = this.icon[Object.keys(this.icon)[0]];
		//this.frame.update(FRAME_DT);
		this.frameCoords = {y: (this.frame.frames[0] / this.frame.spriteSheet._f) | 0,
												x: (this.frame.frames[0] % this.frame.spriteSheet._f) | 0};
		this.scale = {x: ((this.cardWidth - 3) / this.frame.width), 
									y: ((this.cardHeight - 3) / this.frame.height)};
		this.iconSize = {	x: this.frame.width * this.scale.x, 
											y: this.frame.height * this.scale.y };
  }

  update(dt) {
  	this.frame.update(dt)
  }

  render() {
  	context.save();
		// if (this.x || this.y) { context.translate(this.x, this.y); }

		context.save();
		let awidth = this.cardWidth + this.border.l + this.border.r;
		let aheight = this.cardHeight + this.border.t + this.border.b;
		context.translate(-awidth * this.banchor.x, -aheight * this.banchor.y);
		context.fillStyle = this.borderColor;
		context.fillRect(0, 0, awidth, aheight);
		context.fillStyle = this.color;
		context.translate(0.1, 0.1);
		context.fillRect(0, 0, awidth-.2, aheight-.2);
		context.restore();

		// let w = this?.iconWidth || this.width;
		// let h = this?.iconHeight || this.height;
		// let sx = 1 / (2 / w);
		// let sy = 1 / (2 / h)
		let sx = 1;
		let sy = 1;
		for (let i = 1; i <= this.item.maxLevel; i++) {
			context.fillStyle = this.emptyColor;
			let col = Math.floor(i / 4);
			context.fillRect(
				-awidth * this.banchor.x + this.cardWidth + 2*(col-1), 
				-aheight * this.banchor.y + .65 + (1.5 + .5) * (i-col*3-1), 
				1.5,1.5);
		
			context.fillStyle = (i <= this.item.level) ? this.filledColor : '#555555';
			context.fillRect(
				-awidth * this.banchor.x + this.cardWidth + 2*(col-1) + .1, 
				-aheight * this.banchor.y + 0.65 + (1.5 + .5) * (i-col*3-1) + .1,
				1.3,1.3);
		}

		context.scale(this.scale.x, this.scale.y);
		context.translate(-this.frame.width * this.anchor.x, -this.frame.height * this.anchor.y);
		context.drawImage(
			this.frame.spriteSheet.image,
			this.frame.margin + this.frameCoords.x * this.frame.width + (this.frameCoords.x * 2 + 1) * this.frame.spacing,
			this.frame.margin + this.frameCoords.y * this.frame.height + (this.frameCoords.y * 2 + 1) * this.frame.spacing,
			this.frame.width,
			this.frame.height,
			0,
			0,
			this.frame.width,
			this.frame.height
		);

		context.restore();
  }
}

const createXpPickup = function(args) {
	return new Pickup(Object.assign({
		animations: _allSpritesheets[12].animations,
		anchor: {x: .5, y: .5},
		score: 1,
		// width: 4,
		// height: 4,
		hurtWidth: 4,
		hurtHeight: 4,
		scaleX: 1,
		scaleY: 1,
		pickup: function() {
			_player.score += this.score;
			_player.addXp(this.score);
			_sounds['pickup'].play();
			return true;
		}
	}, args));
}

const createBigXpPickup = function(args) {
	return createXpPickup(Object.assign({
		animations: _allSpritesheets[16].animations,
		pickup: function() {
			_player.score += this.score;
			_sounds['pickup'].play();
			_win = true;
			return true;
		}
	}, args));
}

const createExplosion = function(args) {
	return new MySprite(Object.assign({
		x: 0,
		y: 0,
		// width: 16,
		// height: 16,
		anchor: {x: .5, y: .5},
		animations: _allSpritesheets[8].animations,
		ttl: 30,
		update: function() {
			this.advance();
			if (this.ttl <= 0) {
				_map.removeChild(this);
			}
		}
	}, args));
}

const createBullet = function(args) {
	return new MySprite(Object.assign({
		targetType: 1, // 1 = enemies, 2 = player
		direction: {x: 1.0, y: 0.0},
		speed: 5,
		hurtWidth: 1,
		hurtHeight: 1,
		damage: 1,
		removeOnHit: true,
		cooldown: 0.5,
		dt: 0,
		update: function(step) {
			this.dt -= step;
			this.dx = this.direction.x * this.speed;
			this.dy = this.direction.y * this.speed;
			this.advance(step);
			if (this.dt <= 0) {
				switch(this.targetType) {
				case 1:
					let _enemies = _espawner.getEnemies();
					for (let eidx = 0; eidx < _enemies.length; eidx++) {
						let e = _enemies[eidx];
						// if (e.curHealth <= 0) { continue; }
						if (this.hurtBox.intersects(e.hurtBox)) {
							e?.takeDamage && e.takeDamage(this.damage);
							if (this.removeOnHit) {
								this.ttl = 0;
								break;
							}
							this.dt = this.cooldown;
						}
					}
					break;
				case 2:
					if(this.hurtBox.intersects(_player.hurtBox)) {
						_player?.takeDamage && _player?.takeDamage(this.damage);
						if (this.removeOnHit) {
							this.ttl = 0;
							break;
						}
						this.dt = this.cooldown;
					}
					break;
				default:

				}
			}

			if (this.ttl <= 0) {
				_map.removeChild(this);
			}
		}
	}, args));
};

const createStatefulActor = function(args) {
	return new MySprite(Object.assign({
		aiTransitions: {
			// 'noop': [
			// ],
		},
		aiState: 'n',
		aiDt: 0,
		aiLastStackReturn: null,
		update: function(step) {
			this.advance(step);
			(this.aiState in this) && this[this.aiState](); // Call a method with the same state name if exists.
			(this.aiTransitions[this.aiState] || []).every(st => {
				this.aiLastStackReturn = this[st.method](...((st.args || []).concat([this.aiLastStackReturn])));
				return this.aiLastStackReturn; // A false return stops the chain
			});
			this.aiLastStackReturn = null;
		},
		changeState(s) {
			this.aiState = s;
		},
		aiDeltaUpdate(check_amount) {
			if (this.aiDt <= 0 || this.aiDt > check_amount) {
				this.aiDt = check_amount; // Set the check amount
			}
			this.aiDt = this.aiDt - FRAME_DT;
			
			return this.aiDt <= 0;
			// if (this.aiDt <= 0) {
			// 	return true; // reached the end; allow other check to progress
			// }
			// return false; // prevent other checks from progressing
		},

	}, args));
};

const createGun = function(args) {
	return createStatefulActor(Object.assign({
		targetType: 1, // 1 = enemies, 2 = player
		anchor: {x: 0.5, y: 0.5},
		bulletSpeed: 15,
		reloadTime: 1.0,
		maxAttackRange: 50,
		shootSound: null,
		level: 1,
		maxLevel: 5,
		icon: null,
		damage: 1,
		reload: function () {
			let rt = Math.max(FRAME_DT, this.reloadTime * (1 / this.level));
			return this.aiDeltaUpdate(rt);
		},
		getClosestTargetInRange: _getClosestTargetInRange,
		//function () {
		// 	switch(this.targetType) {
		// 	case 1:
		// 		let closest = null;
		// 		let cdist = Infinity;
		// 		let _enemies = _espawner.getEnemies();
		// 		for (let eidx = 0; eidx < _enemies.length; eidx++) {
		// 			let e = _enemies[eidx];
		// 			// if (e.curHealth <= 0) { continue; }
		// 			let d = dist(this.world, e.world);
		// 			if (d < cdist && d <= this.maxAttackRange) {
		// 				cdist = d;
		// 				closest = { obj: e, dist: d, dir: dir(this.world, e.world) };
		// 			}
		// 		}
		// 		return closest;
		// 	case 2:
		// 		let pdist = dist(this.world, _player.world);
		// 		if (pdist <= this.maxAttackRange) {
		// 			return { obj: _player, dist: pdist, dir: dir(this.world, _player.world) };
		// 		}
		// 		return null;
		// 	}
		// 	return null;
		// },
		fire: function(tar) {
			if (tar == null) {
				return null;
			}
			// console.log('Fired gun: ', tar);
			let b = createBullet(Object.assign({
				x: this.world.x,
				y: this.world.y,
				speed: this.bulletSpeed + (1 - 1/this.level)*this.bulletSpeed,
				direction: tar.dir,
				ttl: (1.0 / FRAME_DT) * 5, // 5 seconds
				color: '#00FF00',
				width: 1,
				height: 1,
				scaleX: 1,
				scaleY: 1,
				targetType: this.targetType,
				level: this.level,
				damage: this.damage * (((this.targetType == 1) ? 1 : 0) + this.level),
			}, this.bulletArgs));
			// _map.addChild(b);
			this.shootSound && this.shootSound.play();
			return b;
		},
		addToMap: function(b) {
			if (b != null) {
				_map.addChild(b);
			}
			return true;
		},
		aiTransitions: {
			'seek': [
				{ method: 'getClosestTargetInRange', args: []},
				{ method: 'fire', args: []},
				{ method: 'addToMap', args: []},
				{ method: 'changeState', args: ['reloadg']},
			],
			'reloadg': [ // change the name since it calls the method with the state name every frame.
				{ method: 'reload', args: []},
				{ method: 'changeState', args: ['seek']},
			]
		},
		aiState: 'seek',
	}, args));
};

const INVULN_TIME = 0.75;
const createPlayer = function() {
	let hbar = new HealthBar({
		x: 0,
		y: 4,
		anchor: {x: 0.5, y: 0.5},
		width: 12,
		height: 4,
		scaleX: .75,
		scaleY: .5,
		value: 30,
		animations: _allSpritesheets[10].animations,
	});
	let xbar = new HealthBar({
		x: 0,
		y: 5.5,
		anchor: {x: 0.5, y: 0.5},
		width: 12,
		height: 4,
		scaleX: .75,
		scaleY: .5,
		value: 30,
		flipy: true,
		animations: _allSpritesheets[13].animations,
	});
	let p = new MySprite({
		score: 0,
		xp: 0,
		level: 1,
		curHealth: 10,
		maxHealth: 10,
		speed: 20,
		attractionRange: 10,
    attractionSpeed: 40,
		x: 0,
		y: 0,
		width: 4,
		height: 8,
		anchor: {x: 0.5, y: 0.5},
		scaleX: 1,
		scaleY: 1,
		groundFriction: 8,
		animations: _allSpritesheets[0].animations,
		// aim_dir: {x: 0, y: 0},
		hurtWidth: 7,
		hurtHeight: 7,
		reset: function() {
			this.score = 0;
			this.xp = 0;
			this.level = 1;
			this.curHealth = 10;
			this.maxHealth = 10;
			this.attractionRange = 10;
			this.speed = 20;
			this.objects = [this.objects[0], this.objects[1]]; // hp and xp bar.
		},
		addXp: function(v) {
			this.xp += v;
			if (this.xp >= this.nextLevelXp()) {
				this.xp -= this.nextLevelXp();
				this.level += 1;
				this.levelUp();
			}
		},
		nextLevelXp: function() {
			return this.level * 5;
		},
		levelUp: function() {
			let keys = Object.keys(_items);
			let maxedKeys = this.objects.filter(o => {
				return o?.level == o?.maxLevel; // get items that are maxed out
			}).map(o => o.itemType); // get the type of item; item types are the key in _items object.
			let dmgItemCnt = this.objects.reduce( (cnt, o) => {
				return cnt + ((o.itemFlavor == 'd') ? o.level : 0);
			}, 0);
			let validKeys = keys.filter(k => {
				return !maxedKeys.includes(k) && (
								(_itemFlavors[k] == 'support' && dmgItemCnt > 1) ||
								(_itemFlavors[k] != 'support')
								);
			});
			if (validKeys.length > 0) {
				this.addItem(_items[validKeys[Math.floor(randRange(0, 1) * validKeys.length)]]());
			}
			[1,2,3].forEach(i => {
				_map.addChild(createExplosion({
					x: this.world.x + randRange(-8,8), 
					y: this.world.y + randRange(-8,8),
					animations: _allSpritesheets[9].animations,
					scaleX: randRange(.8, 1.1),
					scaleY: randRange(.8, 1.1),
				}));
			});
			_sounds['lvlup'].play();
		},
		getActions: function() {
			return {
				leftpressed: keyPressed('KeyA') || keyPressed('ArrowLeft'),
				rightpressed: keyPressed('KeyD') || keyPressed('ArrowRight'),
				downpressed: keyPressed('KeyS') || keyPressed('ArrowDown'),
				uppressed: keyPressed('KeyW') || keyPressed('ArrowUp'),
				// lvlup : keyPressed('KeyL'), // Debug command
			};
		},
		// _oldActions: null, // Debug command
		update: function(step) {
			let actions = this.getActions();
			let target = normalize({
				x: (actions.leftpressed ? -1 : 0) + (actions.rightpressed ? 1 : 0),
				y: (actions.uppressed ? -1 : 0) + (actions.downpressed ? 1 : 0),
			});

			this.dx = clamp(this.dx + target.x * this.speed, -this.speed, this.speed);
			this.dy = clamp(this.dy + target.y * this.speed, -this.speed, this.speed);

			if (target.x == 0.0 && this.dx != 0.0) {
				this.dx = Math.max(0, this.dx + -1 * Math.sign(this.dx) * this.groundFriction);	
				
				if (Math.abs(this.dx) <= 1) {
					this.dx = 0.0;
				}
			}
			if (target.y == 0.0 && this.dy != 0.0) {
				this.dy = Math.max(0, this.dy + -1 * Math.sign(this.dy) * this.groundFriction);	
				
				if (Math.abs(this.dy) <= 1) {
					this.dy = 0.0;
				}
			}
      if (this.dx != 0) {
        this.flipx = (this.dx < 0);
      }

			this.advance(step);

			// this.aim_dir.x = _mouse_pos.x - this.x;
			// this.aim_dir.y = _mouse_pos.y - this.y;
			// this.aim_dir = normalize(this.aim_dir);

			this.objects[0].value = this.curHealth;
			this.objects[0].maxValue = this.maxHealth;
			this.objects[1].value = this.xp;
			this.objects[1].maxValue = this.nextLevelXp();

			this.invunldt = Math.max(0, this.invunldt - step);
			this.invert = (this.invunldt > 0 && (
				(this.invunldt / INVULN_TIME >= 0.25 && this.invunldt / INVULN_TIME <= .5) ||
				(this.invunldt / INVULN_TIME >= 0.75 && this.invunldt / INVULN_TIME <= 1)
			));
			// Debug command
			// if (!actions.lvlup && this._oldActions?.lvlup) {
			// 	this.levelUp();
			// }
			// this._oldActions = actions;
			// End Debug command
		},
		takeDamage(dmg) {
			if (this.invunldt > 0) {return;}
			this.curHealth = Math.max(0, this.curHealth - dmg);
			this.invunldt = INVULN_TIME;

			// console.log('Player took dmg: ', dmg);
		},
		addItem(itm) {
			// check if player already has this item
			let matches = this.objects.filter( (o) => { return o?.itemType == itm?.itemType });
			// debt: assumes a single match.
			if (matches.length > 0) {
				matches[0].level = Math.min(matches[0].level + 1, matches[0].maxLevel);
			} else {
				this.addChild(itm);
				_ui.addChild(new ItemCard({
					icon: itm.icon,
					x: 10,
					y: 10,
					item: itm,
					scaleX: 1 / (2 / itm.width),
					scaleY: 1 / (2 / itm.height),
				}));
			}
		}
	});

	p.addChild(hbar);
	p.addChild(xbar);
	// p.addItem(fireRing);
	return p;
}

const createEnemy = function(args) {
	let dmgAura = createGun({
			x: 0,
			y: 0,
			width: 7,
			height: 7,
			// color: '#AA111100',
			scaleX: 1,
			scaleY: 1,
			bulletSpeed: 0,
			maxAttackRange: 7/2.,
			// shape: 'circle',
			targetType: 2,
			damage: args.damage,
			level: args.level,
			bulletArgs: {
				// width: 7,
				// height: 7,
				anchor: {x: .5, y: .5},
				hurtHeight: args.hurtHeight || 7,
				hurtWidth: args.hurtWidth || 7,
				// color: '#AA111100',
				ttl: 1,
				removeOnHit: false,
			}
		});
	let hbar = new HealthBar({
		x: 0,
		y: 4,
		anchor: {x: 0.5, y: 0.5},
		width: 12,
		height: 4,
		scaleX: .75,
		scaleY: .5,
		value: 30,
		animations: _allSpritesheets[10].animations,
	});
	let e = createStatefulActor(Object.assign({
		scoreAmt: 1,
		curHealth: 10,
		maxHealth: 10,
		// speed: 20 * randRange(.9, 1.1),
		x: 100,
		y: 100, 
		// width: 8,
		// height: 8,
		anchor: {x: .5, y: .5},
		animations: _allSpritesheets[1].animations,
		// color: '#AA8694',
		scaleX: 1,
		scaleY: 1,
		hurtWidth: 7,
		hurtHeight: 7,
		createDropItem: createXpPickup,
		_lastflipx: 0,
		updateDirection: function () {
			this._lastflipx = Math.max(0, this._lastflipx - FRAME_DT);
			if (this._lastflipx <= 0) {
				this.flipx = (this.dx < 0);
				this._lastflipx = .5;
			}
			return true;
		},
		takeDamage: function(dmg) {
			this.curHealth = Math.max(0, this.curHealth - dmg);
			// console.log("Took damage: ", dmg);
			if (this.curHealth <= 0) {
				this.die();
			} else {
				_sounds['ehit'].play();
			}
		},
		updateHealthBar: function() {
			this.objects[0].y = this.height / 2 * this.scaleY;
			this.objects[0].value = this.curHealth;
			this.objects[0].maxValue = this.maxHealth;
			this.objects[0].visible = this.curHealth != this.maxHealth;

			return true;
		},
		die: function() {
			this.curHealth = 0;
			_map.removeChild(this);
			_map.addChild(createExplosion({x: this.world.x, y: this.world.y}));
			_sounds['edie'].play();
			_map.addChild(this.createDropItem({
				x: this.world.x,
				y: this.world.y,
				score: this.scoreAmt,
			}));
			// _player.score += this.scoreAmt;
		},
		reinit: function(a) { // function to allow this enemy object to be reused.
			this.init(a);
			this.objects[1].damage = a.damage;
			this.objects[1].level = a.level;
		}
	}, args));
	e.addChild(hbar);
	e.addChild(dmgAura);
	return e;
}

const SPAWN_DIST = 150;
class EnemySpawner {
	constructor(properties = {}) {
		Object.assign(this, Object.assign({
			enemyArgs: [],
			bossArgs: null,
			maxEnemies: 50,
			sps: 2.0,
		}, properties));
		this.x = 0;
		this.y = 0;
		this.dx = 0;
		this.dy = 0;
		this.ddx = 0;
		this.ddy = 0;
		this.scaleX = 1.0;
		this.scaleY = 1.0;
		this.width = 1.0;
		this.height = 1.0;
		this.world = {x:0,y:0,width:0,height:0,scaleX: 1,scaleY: 1};
		// this.enemyArgs = enemyArgs;
		// this.maxEnemies = maxEnemies;
		// this.sps = sps;
		this.enemyList = [];
		this._dt = 0;
		// this._ttime = 0;
	}

	reset() {
		this.enemyList = [];
		this.boss = null;
		this._dt = 0;
		// this._ttime = 0
	}
  _assignRandPos(e) {
    let sdir = rotate({x: 1, y: 0}, randRange(-Math.PI, Math.PI));
    e.x = _player.world.x + SPAWN_DIST * sdir.x;
    e.y = _player.world.y + SPAWN_DIST * sdir.y;
  }
	update(dt=FRAME_DT) {
		this._dt -= dt;
		if (this._dt <= 0) {
			let effectiveSps = Math.max(FRAME_DT, this.sps - (Math.floor(_gametime / 15) * .25));
			this._dt = effectiveSps;//this.sps;

			let liveEnemies = this.getEnemies();
			if (liveEnemies.length < this.maxEnemies) {
				var e;
				if (liveEnemies.length < this.enemyList.length) {
					// Reuse dead enemies.
					e = this.enemyList.filter( (e) => { return e.curHealth <= 0; })[0];
					e.reinit(this.pickEnemy());
				} else {
					e = createEnemy(this.pickEnemy());
					e.parent = this;
					this.enemyList.push(e);
				}
				e.speed = e.speed * randRange(.9, 1.1);

        this._assignRandPos(e);
			}

			if (!this?.boss && _gametime >= 120) { // Spawn boss after 1 minute
				this.boss = createEnemy(this.bossArgs);
        this._assignRandPos(this.boss);
				this.enemyList.push(this.boss);
			}
		}
		// simple boids: https://code.tutsplus.com/3-simple-rules-of-flocking-behaviors-alignment-cohesion-and-separation--gamedev-3444t
		// Group enemies into cells.
		let cells = {};
		const CELL_WIDTH = 64; // square cell size to check collisions in
		// const MIN_CELL_DIST = 2;//CELL_WIDTH / 2; // minimum distance for full force applied
		// const MAX_CELL_DIST = Math.sqrt(2)*CELL_WIDTH - MIN_CELL_DIST; // maximum distance before no force
		const MAX_FORCE_DIST = 12;//MAX_CELL_DIST + MIN_CELL_DIST;//12;
		const MAX_SEP_DIST = 6;//MAX_FORCE_DIST;//12;//8;
		const SEP_K = 0.30;
		const COH_K = 0.10;
		const ALI_K = 0.10;

		this.getEnemies().forEach(e => {
      if (dist(_player.world, e.world) > SPAWN_DIST * 2) {
        this._assignRandPos(e);
      }
			let key = '' + Math.floor(e.world.x / CELL_WIDTH) + ',' +
										 Math.floor(e.world.y / CELL_WIDTH);
			let c = (cells[key] || []);
			c.push(e);
			cells[key] = c;
		});
		
		Object.values(cells).forEach( clist => {
			if (clist.length <= 1) {
				return;
			}
			// Make a copy so that manipulations do not affect calculations
			// after this entry.
			let clistMotion = clist.map( c => {
				return {
					x: c.x, 
					y: c.y, 
					world: c.world, 
					dx: c.dx, 
					dy: c.dy, 
					enemy: c};
			});
			// console.log(clistMotion);

			clistMotion.forEach(c1 => {
				// let key = '' + Math.floor(c1.world.x / CELL_WIDTH) + ',' +
				// 						 Math.floor(c1.world.y / CELL_WIDTH);
				let dx = 0;
				let dy = 0;
				let pdir = dir(c1.world, _player.world);
				let ccnt = 0;
				let acnt = 0;
				let scnt = 0;
				let alignment = {x: 0, y: 0};
				let cohesion = {x: 0, y: 0};
				let separation = {x: 0, y: 0};
				// console.log({key: key, dx: c1.dx, dy: c1.dy});
				
				clist.forEach(c2 => {
					if (c2.etype == c1.enemy.etype) {
						cohesion.x += c2.world.x;
						cohesion.y += c2.world.y;
						ccnt += 1;
					} //else {console.log('not same type: ', c2.etype, c1.enemy.etype);}

					if (c1.enemy == c2) {return;}
					
					let di = dist(c1,c2);
					if (di > MAX_FORCE_DIST) {
						return;
					}

					if (c2.etype == c1.enemy.etype) {
						acnt += 1;
						alignment.x += c2.dx;
						alignment.y += c2.dy;
					}
					// if (di <= MAX_SEP_DIST) {
						scnt += 1;
						separation.x += c2.world.x - c1.world.x;
						separation.y += c2.world.y - c1.world.y;
					// }
				});
				
				if (acnt > 0 || ccnt > 0 || scnt > 0) {
					let DIR_K = 1;
					if (acnt > 0) {
						alignment.x /= acnt;
						alignment.y /= acnt;
						alignment = normalize(alignment);
						DIR_K -= ALI_K;
					}
					if (ccnt > 0) {
						cohesion.x = cohesion.x / (ccnt) - c1.world.x;
						cohesion.x = cohesion.y / (ccnt) - c1.world.y;
						cohesion = normalize(cohesion);
						DIR_K -= COH_K;
					}
					if (scnt > 0) {
						separation.x /= -1 * scnt;
						separation.y /= -1 * scnt;
						separation = normalize(separation);
						DIR_K -= SEP_K;
					}
					let curdir = normalize({x:c1.dx, y:c1.dy});
					let newdir = normalize({
						x:alignment.x * ALI_K + cohesion.x * COH_K + separation.x * SEP_K + curdir.x * DIR_K, 
						y:alignment.y * ALI_K + cohesion.y * COH_K + separation.y * SEP_K + curdir.y * DIR_K
					});
					// c1.dx = alignment.x * ALI_K + cohesion.x * COH_K + separation.x * SEP_K + curdir.x * DIR_K;
					// c1.dy = alignment.y * ALI_K + cohesion.y * COH_K + separation.y * SEP_K + curdir.y * DIR_K;
					
					c1.dx = newdir.x * c1.enemy.speed;
					c1.dy = newdir.y * c1.enemy.speed;
					// console.log({key: key, dx: c1.dx, dy: c1.dy});
				}
			});
			
			clistMotion.forEach(c => {
				c.enemy.dx = c.dx;
				c.enemy.dy = c.dy;
			});
		});

		(this.getEnemies() || []).forEach(o => o.update && o.update(dt));
	}

	pickEnemy() {
		let maxIdx = Math.floor(_gametime / 30); // Every 30 seconds allow additional enemy types.
		let e = this.enemyArgs[Math.floor(randRange(0, 1) * Math.min(maxIdx, this.enemyArgs.length))];
		return e;
	}

	getEnemies() {
		return this.enemyList.filter( (e) => {return e.curHealth > 0;} );
	}

	render() {
		context.save();
		if (this.x || this.y) { context.translate(this.x, this.y); }
		(this.getEnemies() || []).forEach(o => o.render && o.render());
		context.restore();
	}
}

const startGame = function() {
	_map = new GameMap({
		animations: _allSpritesheets[11].animations,
	});
	_player = createPlayer();
	_espawner = new EnemySpawner({
		enemyArgs: [
			{
				etype: 'blcat',
				scoreAmt: 1,
				curHealth: 3,
				maxHealth: 3,
				damage: 1,
				level: 1,
				speed: 15,
				hurtWidth: 7,
				hurtHeight: 7,
				anchor: {x: .5, y: .5},
				animations: _allSpritesheets[1].animations,
				aiTransitions: {
					'seek': [
						{ method: 'updateDirection', args: []},
						{ method: 'moveToPlayer', args: []},
						{ method: 'updateHealthBar', args: []},
					],
				},
				aiState: 'seek',
				moveToPlayer: function() {
					let d = dir(this.world, _player.world);
					this.dx = d.x * this.speed;
					this.dy = d.y * this.speed;
					return true;
				},
			},
			{
				etype: 'brcat',
				scoreAmt: 2,
				curHealth: 8,
				maxHealth: 8,
				damage: 1,
				level: 1,
				speed: 15,
				hurtWidth: 7,
				hurtHeight: 7,
				anchor: {x: .5, y: .5},
				animations: _allSpritesheets[2].animations,
				aiTransitions: {
					'seek': [
						{ method: 'updateDirection', args: []},
						{ method: 'moveToPlayer', args: []},
						{ method: 'updateHealthBar', args: []},
					],
				},
				aiState: 'seek',
				moveToPlayer: function() {
					let d = dir(this.world, _player.world);
					this.dx = d.x * this.speed;
					this.dy = d.y * this.speed;
					return true;
				},
			},
			{
				etype: 'ninja',
				scoreAmt: 3,
				curHealth: 10,
				maxHealth: 10,
				damage: 2,
				level: 1,
				speed: 20,
				hurtWidth: 7,
				hurtHeight: 7,
				anchor: {x: .5, y: .5},
				animations: _allSpritesheets[3].animations,
				aiTransitions: {
					'seek': [
						{ method: 'updateDirection', args: []},
						{ method: 'moveToPlayer', args: []},
						{ method: 'updateHealthBar', args: []},
					],
				},
				aiState: 'seek',
				moveToPlayer: function() {
          let pdir = dir(this.world, _player.world);
          let pdist = dist(this.world, _player.world);
					let rdir = rotate(pdir, Math.PI/4 * (Math.min(1, pdist / 150)));
					this.dx = rdir.x * this.speed;
					this.dy = rdir.y * this.speed;
					return true;
				},
			},
			{
				etype: 'floaty',
				scoreAmt: 3,
				curHealth: 15,
				maxHealth: 15,
				damage: 3,
				level: 1,
				speed: 21,
				hurtWidth: 7,
				hurtHeight: 7,
				anchor: {x: .5, y: .5},
				animations: _allSpritesheets[4].animations,
				aiTransitions: {
					'seek': [
						{ method: 'updateDirection', args: []},
						{ method: 'moveToPlayer', args: []},
						{ method: 'updateHealthBar', args: []},
					],
				},
				aiState: 'seek',
				moveToPlayer: function() {
					let d = dir(this.world, _player.world);
					// wiggle
					let wdir = vright(d);
					wdir.x *= Math.sin(_gametime * Math.PI);
					wdir.y *= Math.sin(_gametime * Math.PI);
					this.dx = (d.x*2/3 + wdir.x/3) * this.speed; // 1/3rd wiggle
					this.dy = (d.y*2/3 + wdir.y/3) * this.speed;
					return true;
				},
			},
		],
		bossArgs: {
			etype: 'bigcat',
			scoreAmt: 13000,
			curHealth: 1000,
			maxHealth: 1000,
			damage: 2,
			level: 1,
			speed: 12,
			hurtWidth: 7*3,
			hurtHeight: 7*3,
			anchor: {x: .5, y: .5},
			scaleX: 3,
			scaleY: 3,
			animations: _allSpritesheets[1].animations,
			createDropItem: createBigXpPickup,
			aiTransitions: {
				'seek': [
					{ method: 'updateDirection', args: []},
					{ method: 'moveToPlayer', args: []},
					{ method: 'updateHealthBar', args: []},
				],
			},
			aiState: 'seek',
			moveToPlayer: function() {
				let d = dir(this.world, _player.world);
				this.dx = d.x * this.speed;
				this.dy = d.y * this.speed;
				return true;
			},
		}
	});

	let aplayer = _sounds['background'];
	_gametime = 0;
	_loop = new MyGameLoop({
		audio: aplayer,
		speedCheck: 0,
		maxAudioSpeed: 5,
    _oldk: {},
		update: function(step) {
			if (_player.curHealth <= 0) {
				this.audio.pause();
				!this._playedgover && _sounds['gover'].play() && (this._playedgover = true);
				this.updateGameOver(step);
				return;
			}
			if (_win) {
				this.audio.pause();
        !this._playedgover && _sounds['gwin'].play() && (this._playedgover = true);
				this.updateGameOver(step);
				return;
			}
      // Music pausing
      let m = keyPressed('KeyM');
      if (this._oldk['m'] && !m) {
        this.audio.paused ? this.audio.play() : this.audio.pause();
      }
      this._oldk['m'] = m;
      // End music pausing

			_gametime += step;
			_map.update(step);
			_ui.update(step);
			this.speedCheck -= step;
			if (this.speedCheck <= 0) {
				this.speedCheck = 5;
        let srate = .75 + Math.abs(Math.sin(_gametime*.5))*.25;
				this.audio.playbackRate = Math.max(0.35, (_espawner.getEnemies().length / _espawner.maxEnemies) * this.maxAudioSpeed * srate);
			}
			let alpha = Math.round(Math.max(0, 5 - _gametime) / 5 * 255);
			this.titleColor = '#000000' + alpha.toString(16).padStart(2, '0');
		},
		updateGameOver: function(step) {
			let p = keyPressed('Space');
			if (this._oldk['p'] && !p) {
				this.reset();
			}
			this._oldk['p'] = p;
			this.titleColor = 'black';
		},
		reset: function() {
			_win = false;
			this._playedgover = false;
			_gametime = 0;
			_ui.reset();
			_espawner.reset();
			this.speedCheck = 0;
			_player.reset();
			_player.x = 50;
			_player.y = 50;
			_player.addItem(_items['pew']());

			_map.reset();
			_map.addChild(_player);
			_map.addChild(_espawner);
			this.audio.tryplay();
		},
		renderInside: function() {
			context.save();
			_map.render();
			drawText('score: ' + _player.score, {x: canvas.width / _cscale / 2 - 20, y: 8}, '8px serif');
			drawText('x: ' + Math.round(_player.world.x) + ', y: ' + Math.round(_player.world.y), {x: 0, y: 8}, '5px serif');
			_ui.render();
			if (_win) {
				context.fillStyle = '#44a35455';
				context.fillRect(0,0,canvas.width, canvas.height);
				context.fillStyle = '#000000';
				// drawText('Black Cat Survivor', {x: canvas.width / _cscale / 2 - 75, y: canvas.height/_cscale/2 - 16}, '16px serif');
				drawText('You Win', {x: canvas.width / _cscale / 2 - 42, y: canvas.height/_cscale/2}, '16px serif');
				drawText('<Space> to Restart', {x: canvas.width / _cscale / 2 - 75, y: canvas.height/_cscale/2 + 16}, '16px serif');
			} else if (_player.curHealth <= 0) {
				context.fillStyle = '#a3464455';
				context.fillRect(0,0,canvas.width, canvas.height);
				context.fillStyle = '#000000';
				// drawText('Black Cat Survivor', {x: canvas.width / _cscale / 2 - 75, y: canvas.height/_cscale/2 - 16}, '16px serif');
				drawText('Game Over', {x: canvas.width / _cscale / 2 - 45, y: canvas.height/_cscale/2}, '16px serif');
				drawText('<Space> to Restart', {x: canvas.width / _cscale / 2 - 75, y: canvas.height/_cscale/2 + 16}, '16px serif');
			}
      context.fillStyle = this.titleColor;
      drawText('Black Cat Survivor', {x: canvas.width / _cscale / 2 - 75, y: canvas.height/_cscale/2 - 16}, '16px serif');
      context.fillStyle = '#000000';
			context.restore();
		}
	});

	_loop.reset();
	_loop.start();
}


load('./assets/characters.png').then( () => {
	_allSpritesheets = [
		{/*walk: [0,],*/ idle: [0,], img: _imageCache['./assets/characters.png'] }, // 0 - Player
		{/*walk: [1,],*/ idle: [1,], img: _imageCache['./assets/characters.png'] }, // 1 - Black Cat
		{/*walk: [1,],*/ idle: [1,], img: recolorImage(_imageCache['./assets/characters.png'], {
        // "171517":"3b1717",
        // "171617":"3b1717",
        // "171717":"3b1717",
        // "191919":"381616",
        // "202020":"382716",
        // "252525":"382716",
        // "383838":"381d16",
        // "454545":"382716",
        // "2b2b2b":"382716",
        // "2b2b2a":"382716",
        // "2b292b":"382716"
        "141414":"381616",
        "282828":"382716",
        "323232":"381d16",
        "3c3c3c":"382716",
        "1e1e1e":"382716"
			})
		}, // 2 - Brown Cat
		{/*walk: [27,],*/ idle: [27,], img: _imageCache['./assets/characters.png'] }, // 3 - Ninja
		{/*walk: [33,],*/ idle: [33,], img: _imageCache['./assets/characters.png'] }, // 4 - Floaty
	].map(s => new MySpriteSheet({
		image: s.img,
		frameWidth: 8,
		frameHeight: 8,
		animations: {
			// walk: {
			// 	frames: s.walk,
			// 	frameRate: 1,
			// 	loop: true,
			// },
			idle: {
				frames: s.idle,
				frameRate: 1,
				loop: true,
			}
		}
	}));

  _allSpritesheets = _allSpritesheets.concat(
    new MySpriteSheet({ // 5 0- bullet 1
      image: recolorImage(_imageCache['./assets/characters.png'], {
        // "000000":"5f6902",
        // "ffffff":"c4cb06",
        // "010000":"5f6902",
        // "fdffff":"c4cb06"
        "000000":"5f6902",
        "fafafa":"c4cb06"
      }),
      frameWidth: 4,
      frameHeight: 4,
      animations: {
        fly: {
          frames: [24, 25,],
          frameRate: 8,
          loop: true,
        }
      }
    }),
    new MySpriteSheet({ // 6 1- bullet 2
      image: recolorImage(_imageCache['./assets/characters.png'], {
        // "000000":"ff5fff",
        // "020000":"ff5fff",
        // "ffffff":"ff9cec",
        // "feffff":"ff9cec",
        // "fffeff":"ff9cec",
        // "000200":"ff5fff"
        "000000":"ff5fff",
        "fafafa":"ff9cec"
      }),
      frameWidth: 4,
      frameHeight: 4,
      animations: {
        fly: {
          frames: [36, 37, 38, 39,],
          frameRate: 8,
          loop: true,
        }
      }
    }),
    new MySpriteSheet({ // 7 2- flame
      // image: _imageCache['./assets/characters.png'],
      image: recolorImage(_imageCache['./assets/characters.png'], {
        // "383838":"670404",
        // "383938":"670404",
        // "393838":"670404",
        // "38383a":"670404",
        // "6a6a6a":"c11010",
        // "383a38":"670404",
        // "6b6a6a":"c11010",
        // "6a6a68":"c11010"
        "323232":"670404",
        "646464":"c11010"
      }),
      frameWidth: 8,
      frameHeight: 8,
      animations: {
        fly: {
          frames: [12,13,14,15,],
          frameRate: 4,
          loop: true,
        }
      }
    }),
    new MySpriteSheet({ // 8 3- explosion
      image: _imageCache['./assets/characters.png'],
      frameWidth: 16,
      frameHeight: 16,
      animations: {
        explode: {
          frames: [1,2,5,8,],
          frameRate: 8,
          loop: false,
        }
      }
    }),
    new MySpriteSheet({ // 9 4- lvlup
      image: recolorImage(_imageCache['./assets/characters.png'], {
        // "ffffff":"1ff1b7",
        // "feffff":"1ff1b7",
        // "fdffff":"1ff1b7",
        // "fffeff":"1ff1b7"
        "fafafa":"1ff1b7"
      }),
      frameWidth: 16,
      frameHeight: 16,
      animations: {
        explode: {
          frames: [1,2,5,8,],
          frameRate: 8,
          loop: false,
        }
      }
    }),
    new MySpriteSheet({ // 10 0- health bar
      image: _imageCache['./assets/characters.png'],
      // frameWidth: 4,
      frameWidth: 12,
      frameHeight: 4,
      animations: {
        back: {
          frames: [24,],
          frameRate: 1,
          loop: false,
        },
        fore: {
          frames: [25,],
          frameRate: 1,
          loop: false,
        },
      }
    }),
    new MySpriteSheet({ // 11 1- grass
      image: _imageCache['./assets/characters.png'],
      // frameWidth: 4,
      frameWidth: 8,
      frameHeight: 8,
      animations: {
        variant1: {
          frames: [24,],
          frameRate: 1,
          loop: false,
        },
        variant2: {
          frames: [25,],
          frameRate: 1,
          loop: false,
        },
        variant3: {
          frames: [26,],
          frameRate: 1,
          loop: false,
        },
      }
    }),
    new MySpriteSheet({ // 12 2- xp egg
      image: recolorImage(_imageCache['./assets/characters.png'], {
        // "383838":"3ba2ff",
        // "393838":"3ba2ff",
        // "000000":"3f37ff",
        // "020000":"3f37ff",
        // "000200":"3f37ff",
        // "6a6a6a":"6ae4ff",
        // "6a6a68":"6ae4ff",
        // "686a6a":"6ae4ff",
        // "6a6a6b":"6ae4ff"
        "323232":"3ba2ff",
        "646464":"6ae4ff",
        "000000":"3f37ff"
      }),
      // frameWidth: 4,
      frameWidth: 4,
      frameHeight: 4,
      animations: {
        idle: {
          frames: [84,],
          frameRate: 1,
          loop: false,
        },
        shine: {
          frames: [84,85,86,87,88,89,],
          frameRate: 6,
          loop: false,
        },
      }
    }),
    new MySpriteSheet({ // 13 3- xp bar
      image: recolorImage(_imageCache['./assets/characters.png'], {
        // "ac3d3d":"3ba2ff",
        // "ac3f3d":"3ba2ff",
        // "aa3d3d":"3ba2ff"
        "aa3c3c":"3ba2ff"
      }),
      // frameWidth: 4,
      frameWidth: 12,
      frameHeight: 4,
      animations: {
        back: {
          frames: [24,],
          frameRate: 1,
          loop: false,
        },
        fore: {
          frames: [25,],
          frameRate: 1,
          loop: false,
        },
      }
    }),
    new MySpriteSheet({ // 14 4- magnet
      // image: _imageCache['./assets/characters.png'],
      image: recolorImage(_imageCache['./assets/characters.png'],{
        // "383838":"a03030",
        // "383839":"a03030",
        // "3a3838":"a03030",
        // "38383a":"a03030"
        "323232":"a03030"
      }),
      frameWidth: 4,
      frameHeight: 4,
      animations: {
        idle: {
          frames: [78,],
          frameRate: 1,
          loop: false,
        },
      }
    }),
    new MySpriteSheet({ // 15 5- hiheel
      image: recolorImage(_imageCache['./assets/characters.png'],{
        // "383838":"702b88",
        // "393838":"702b88",
        // "38383b":"702b88"
        "323232":"702b88"
      }),
      frameWidth: 4,
      frameHeight: 4,
      animations: {
        idle: {
          frames: [79,],
          frameRate: 1,
          loop: false,
        },
      }
    }),
    new MySpriteSheet({ // 16 6- big xp egg
      image: recolorImage(_imageCache['./assets/characters.png'],
        {
          // "383838":"ad5fff",
          // "393838":"ad5fff",
          // "000000":"8f0dff",
          // "020000":"8f0dff",
          // "000200":"8f0dff",
          // "6a6a6a":"dcb1fe",
          // "6a6a68":"dcb1fe",
          // "686a6a":"dcb1fe",
          // "6a6a6b":"dcb1fe"
          "323232":"ad5fff",
          "646464":"dcb1fe",
          "000000":"8f0dff"
        }),
      // frameWidth: 4,
      frameWidth: 4,
      frameHeight: 4,
      animations: {
        idle: {
          frames: [84,],
          frameRate: 1,
          loop: false,
        },
        shine: {
          frames: [84,85,86,87,88,89,],
          frameRate: 6,
          loop: false,
        },
      }
    }),
  );

	populateItems();

	startGame();
})
