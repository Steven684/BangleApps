E.setFlags({pretokenise:1});
// sdbaroundclock.06.js
////////////////////////////////////
let skins = {
    aroundClock: {
      drawOrder: ['hourPlate','XminutePlate', 'weekPlate', 'upArrow'],
      elems: {
        // exampleElem: {
        //   rate: 'hour|minute|second|day|month', // default: still
        //   startAngle: '0..360',                 // default: 0 (up)
        //   counterClock: true,                   // default: false
        //   - plate: {...}
        //   - line: {...}
        // }
        hourPlate: {
          rate: 'hour',
          counterClock: true,
          plate: {
            lineWidth: 2,
            radius: 86,
            color: "black",
            indicators: [
              {pieces: 24, lineWidth: 2, startAt: 81 , endAt: 85, color: "blue"},
              {pieces: 12, lineWidth: 2, startAt: 78 , endAt: 85, number: 1, pt: 16, 
               color: "black"},
            ],
          },
        },
        minutePlate: {
          rate: 'minute',
          counterClock: true,
          plate: {
            lineWidth: 2,
            radius: 58,
            color: "blue",
            indicators: [
              {pieces: 60, lineWidth: 1, startAt: 53 , endAt: 56, color: "blue", },
              {pieces: 12, lineWidth: 1, startAt: 50 , endAt: 56, 
               color: "blue", number: 5, pt:10,},
            ],
          },
        },
        weekPlate: {
          rate: 'day',
          counterClock: true,
          plate: {
            indicators: [
              {pieces: 7, lineWidth: 2, startAt: 45, endAt: 55, color: "blue", text: 'weekday', pt: 10},
            ],
          }
        },
        upArrow: {
          rate: '',
          line: {lineWidth: 2, startAt: 0, endAt: 78, color: "black"},
          circle: {startAt: 60, radius: 4, fillColor: "red", xsrc: "battery"},
         },
      },
      tickDelay: 10*1000, // 60000
      offSet: { x: 0, y: 0}, // absolute, or % of g.getWidth/Height
      renderRadius: 88, //88/(64/88), // 44, // 88,
    },
    swissRail: {
      outerBorder: { lineWidth: 1, radius:95, color: "black" },
      smallIndicator: { lineWidth: 2, startAt: 89, endAt: 93, color: "black" },
      largeIndicator: { lineWidth: 4, startAt: 80, endAt: 93, color: "black" },
      hourHand: { lineWidth: 8, startAt: -15, endAt: 50, color: "black" },
      minuteHand: { lineWidth: 7, startAt: -15, endAt: 75, color: "black" },
      secondHand: { lineWidth: 1, startAt: -20, endAt: 85, color: "red" },
      secondDecoration: { lineWidth: 1, startAt: 70, radius: 4, fillColor: "red", color: "red" },
    },
};

////////////////////////////////////
const colors = {
  "black":   0x0000, // "#000000", 00000.00000.00000
  "red":     0xF800, // "#FF0000", 11111.
  "green":   0x07E0, // "#00FF00",
  "blue":    0x001F, // "#0000FF",
  "cyan":    0x07FF, // "#00FFFF",
  "magenta": 0xF81F, // "#FF00FF",
  "yellow":  0xFFE0, // "#FFFF00",
  "white":   0xFFFF, // "#FFFFFF",
};
const status = {
	"clock": 0,
	"weekday": 1,
  "datum": 2,
};
const LEFT_UP = -1;
const RIGHT_DOWN = 1;
const view = {
  lftX: 0,
  rgtX: g.getWidth(),
  topY: 24,
  botY: g.getHeight()-24,
};

////////////////////////////////////
function get_weekdays(){
    var week = [];
    current = new Date('2022-09-24');
    current.setDate((current.getDate() - current.getDay() +1));
    for (var i = 0; i < 7; i++) {
      w=current.getDay();
      week[w] = require("locale").dow(current, 1);
      current.setDate(current.getDate() +1);
    }
    return week; 
} // get_weekdays

function deg2Rad (degrees) { return degrees * Math.PI/180; }
function rad2Deg (radians) { return radians * 180/Math.PI; }

////////////////////////////////////
class sdbAroundClock {
  constructor(){
    this.status = status.clock;
    this.config = {
      default: {
        tickDelay: 1000, //ms
        longTickDelay: 15000, //ms
        renderRadius: 100,
        skin: "aroundClock",
        xskin: "swissRail",
      }
    };
    this.config = Object.assign(this.config, this.config.default);
    this.skin = skins[this.config.skin];

    if (this.skin.tickDelay) {
      this.config.tickDelay = this.skin.tickDelay;
    } else if (! this.skin.secondHand) {
      this.config.tickDelay = this.config.longTickDelay;
    }
    if (this.skin.renderRadius) {
      this.config.renderRadius = this.skin.renderRadius;
    }
    this.mySizeX = view.rgtX - view.lftX;
    this.mySizeY = view.botY - view.topY;
    this.scale = this.mySizeY / (2*this.config.renderRadius);
    this.centerX=view.lftX + (this.mySizeX/2);
    this.centerY=view.topY + (this.mySizeY/2);
    if (this.skin.offSet) {
      if (this.skin.offSet.x) {
        oX = this.skin.offSet.x;
        this.centerX = (oX<1) ? oX*g.getWidth() : oX;
      }
      if (this.skin.offSet.y) {
        oY = this.skin.offSet.y;
        this.centerY = (oY<1) ? oY*g.getHeight() : oY;
      }
    }
    if (this.skin.drawOrder)  {
      this.drawOrder=this.skin.drawOrder;
    } else {
      this.drawOrder=['background','outerborder','month','date','day','hour','minute','second'];
    }
    this.DoWs=get_weekdays();
    var bpp=2;
    this.gcir = Graphics.createArrayBuffer(g.getWidth(),g.getHeight(),bpp,{msb:true}); // w,h,bpp
    this.gcirimg = this.getImg(this.gcir, bpp);
    this.gtxt = Graphics.createArrayBuffer(g.getWidth()/2,g.getHeight()/2,bpp,{msb:true}); // w,h,bpp
    this.gtxtimg = this.getImg(this.gtxt, bpp);
  } // constructor()

  zoomIn() {
		if (this.status == status.clock) {
			this.centerY += this.config.renderRadius*this.scale;
			this.scale *= 2;
		}
	}
	zoomOut() {
		if (this.status == status.clock) {
			this.scale /= 2;
			this.centerY -= this.config.renderRadius*this.scale;
		}
	}
	swipe(dirX, dirY){
    switch (dirX){
      case LEFT_UP: // left
        SL=Object.keys(status).length;
        this.status = (this.status + 1 + SL) % SL;
        break;
      case RIGHT_DOWN: // right
        SL=Object.keys(status).length;
        this.status = (this.status - 1 + SL) % SL;
        break;
    }
    switch (dirY){
      case LEFT_UP: // up
				// this.zoomOut();
        break;
      case RIGHT_DOWN: // down
				// this.zoomIn();
        break;
    }
  }
  ////////////////////////////////////
  getImg(G, bpp) {
    return {
      width:G.getWidth(),
      height:G.getHeight(),
      bpp:bpp,transparent:0,
      buffer:G.buffer,
    };
  }

	draw_line(x1,y1,x2,y2,thickness){
		if (thickness==1) {
			g.drawLine(x1,y1,x2,y2);
			return;
		}
		var p = [];
		var angle = Math.atan2(y2-y1,x2-x1);
		const pi2 = Math.PI/2;
		
		cosP = Math.cos(angle+pi2);
		cosM = Math.cos(angle-pi2);
		sinP = Math.sin(angle+pi2);
		sinM = Math.sin(angle-pi2);
		p[0] = (x1 + thickness*cosP +0.5)|0;
		p[1] = (y1 + thickness*sinP +0.5)|0;
		p[2] = (x1 + thickness*cosM +0.5)|0;
		p[3] = (y1 + thickness*sinM +0.5)|0;
		p[4] = (x2 + thickness*cosM +0.5)|0;
		p[5] = (y2 + thickness*sinM +0.5)|0;
		p[6] = (x2 + thickness*cosP +0.5)|0;
		p[7] = (y2 + thickness*sinP +0.5)|0;
		g.fillPoly(p,true);
	}

	draw_circle(x, y, radius, thickness) {
		if (thickness == 1) {
			g.drawCircle(x,y,radius);
			return;
		}
		this.gcir.clear(true);
		this.gcir.fillCircle(x,y,radius + 0.5*thickness);
		this.gcir.setColor(0);
		this.gcir.fillCircle(x,y,radius - 0.5*thickness);
		//g.drawImages([ {image:this.gcirimg, x:0,y:0, center: false}, ]);
		g.drawImage(this.gcirimg, 0,0);
	}

	draw_string(text, x,y, angle) {
		marge=10;
		if (x<0-marge) {return;}
		if (y<0-marge) {return;}
		if (x>g.getWidth()+marge) {return;}
		if (y>g.getHeight()+marge) {return;}
		this.gtxt.clear(true);
		this.gtxt.setBgColor(0);
		this.gtxt.setFont(g.getFont());
		this.gtxt.setFontAlign(0, 0);
		this.gtxt.drawString(text,this.gtxt.getWidth()/2,this.gtxt.getHeight()/2);
		// g.drawImages([ {image:this.gtxtimg, x:x,y:y, rotate: angle, center: true}, ]);
		g.drawImage(this.gtxtimg, x,y, {rotate:angle});
	}

  // col = [black,orange,...] | "#123456" | 0xF800
  parseColor(col){
    var newCol = col;
    if (col in colors) {
      newCol = colors[col];
    }
    return g.toColor(newCol);
  } // parseColor

  fullCircle(border) {
    this.fullCircleAt(this.centerX,this.centerY,border);
  }

	// border: { radius:95, color: "black", fillColor: "green" }
  fullCircleAt(x,y, border){
    var oldCol = g.getColor();
    var radius = border.radius * this.scale;
    if ("fillColor" in border) {
      g.setColor(this.parseColor(border.fillColor));
      g.fillCircle(x, y, radius);
    }
    if ("color" in border) {
      g.setColor(this.parseColor(border.color));
    }
    g.drawCircle(x, y, radius);
    g.setColor(oldCol);
  } // fullCircleAt

	// circle: {startAt: 70, radius: 4, fillColor: "red", src: "battery"},
  circleAtAngle(angle, circle) {
    var oldCol = g.getColor();
    if ( circle.lineWidth <= 0) { return; }

    var startAt = circle.startAt * this.scale;
    if ("src" in circle) {
      if (circle.src=="battery") {
        var bat = E.getBattery();
        startAt *= bat/100;
        if (bat > 60) {
          circle.fillColor = colors.green;
        } else if (bat > 30) {
          circle.fillColor = colors.yellow;
        } else {
          circle.fillColor = colors.red;
        }
      }
    }
    var x1 = this.centerX + startAt * Math.sin(angle);
    var y1 = this.centerY - startAt * Math.cos(angle);

    this.fullCircleAt(x1, y1, circle);
    g.setColor(oldCol);
  } // circleAtAngle

	// smallIndicator: { lineWidth: 2, startAt: 89, endAt: 93, color: "black" }
  radialLineAtAngle(angle, indicator){
    var oldCol = g.getColor();
    if ("color" in indicator) {
      g.setColor(this.parseColor(indicator.color));
    }
    if ( indicator.lineWidth <= 0) { return; }

    var startAt = indicator.startAt * this.scale;
    var x1 = this.centerX + startAt * Math.sin(angle);
    var y1 = this.centerY - startAt * Math.cos(angle);

		var endAt = indicator.endAt * this.scale;
		var x2 = this.centerX + endAt * Math.sin(angle);
		var y2 = this.centerY - endAt * Math.cos(angle);

		dot1ok = ( (x1>=0) && (x1 < g.getWidth()) && (y1>=0) && (y1 < g.getHeight()) );
		dot2ok = ( (x2>=0) && (x2 < g.getWidth()) && (y2>=0) && (y2 < g.getHeight()) );
		if ( dot1ok || dot2ok ) {
			this.draw_line(x1,y1,x2,y2, indicator.lineWidth);
		}

    g.setColor(oldCol);
  } // radialLineAtAngle

	// {pieces: 12, lineWidth: 1, startAt: 55 , endAt: 60, color: "darkgray", number: 5, pt:16},
  IndicatorsAtAngle(angle, indicator) {
		var oldCol = g.getColor();
    var oldFnt = g.getFont();

    g.setFont("Vector:"+indicator.pt*this.scale);
    g.setColor(this.parseColor(indicator.color));
    var txtsize2 = indicator.pt*this.scale/2;
    var deltaind = deg2Rad(360/indicator.pieces);
    var newangle = angle;
    var xt,yt;
    var startAt = indicator.startAt * this.scale;
    var endAt = indicator.endAt * this.scale;
		var d180_7 = deg2Rad(180/7);
    for (var i=1;i<=indicator.pieces;i++) {
      // newangle = angle + deg2Rad(360*i/indicator.pieces);
      newangle += deltaind;
      this.radialLineAtAngle(newangle, indicator);
      if (indicator.number) {
        xt = this.centerX + (startAt-1-txtsize2) * Math.sin(newangle);
        yt = this.centerY - (startAt-1-txtsize2) * Math.cos(newangle);
        this.draw_string(i*indicator.number, xt,yt, newangle);
      }
      if (indicator.text) {
        if (indicator.text == "weekday") {
          var newangle2 = newangle + d180_7;
          xt = this.centerX + (endAt-txtsize2) * Math.sin(newangle2);
          yt = this.centerY - (endAt-txtsize2) * Math.cos(newangle2);
          this.draw_string(this.DoWs[i%7], xt,yt, newangle2);
        }
      }
    }
    g.setColor(oldCol);
    g.setFont(oldFnt);
  } // IndicatorsAtAngle

  plateAtAngle(angle, plate, name){
    // plate: {lineWidth: 3, radius: 86, color: "black",
    //         indicators: [ {pieces: 12, lineWidth: 1, startAt: 82 , endAt: 85, number: 1}, ],},
    var oldCol = g.getColor();
    if ("color" in plate) {
      var col = this.parseColor(plate.color);
      g.setColor(col);
    }
    if (plate.lineWidth) {
      this.draw_circle(this.centerX, this.centerY, plate.radius*this.scale, plate.lineWidth*this.scale);
    }
    if (plate.indicators) {
      plate.indicators.forEach((ind) => {
        this.IndicatorsAtAngle(angle, ind);
      });
    }
    g.setColor(oldCol);
  } // plateAtAngle

  ////////////////////////////////////
  render_clock(month, day, weekday, hour, min, sec){
    // month: 0-11
    // weekday: 0-6. 0=Sunday, 1=Monday, etc.
    g.clear();
    month++;

    var angles = { // 0..1
      day: (weekday+(hour/24))/7,
      hour: (hour+(min/60))/12,
      minute: (min+sec/60)/60,
      second: sec/60,
      date: (day-1)/31,
      month: month/12,
    };
    for (var elem = 0; elem < this.drawOrder.length; elem++) {
			if (this.drawOrder[elem] in this.skin.elems) {
				myelem = this.skin.elems[this.drawOrder[elem]];
				var sss0 = new Date().getTime();
				var myangle = 0;
				if (("rate" in myelem) && (myelem.rate in angles)) {
						myangle = angles[myelem.rate];
				}
				if ("counterClock" in myelem) { myangle = 1.0 - myangle; }
				myangle *= 360;
				if ("startAngle" in myelem) { myangle += myelem.startAngle; }
				myangle = deg2Rad(myangle);

				if ("line" in myelem) {
					this.radialLineAtAngle(myangle, myelem.line);
				}
				if ("circle" in myelem) {
					this.circleAtAngle(myangle, myelem.circle);
				}
				if ("plate" in myelem) {
					this.plateAtAngle(myangle, myelem.plate, this.drawOrder[elem]);
				}
				var sss1 = new Date().getTime();
				print(this.drawOrder[elem],":",parseInt(sss1-sss0)+"ms");
				//g.flip(true);
			}
    } // drawOrder
  } // render_clock()

  render_weekday(now){
    // weekday: 0-6. 0=Sunday, 1=Monday, etc.
    g.reset().clear();
    g.setColor(colors.black);
    g.setFont("Vector:32");
    g.setFontAlign(0, 0);
    var weekday = require("locale").dow(now, 0);
    g.drawString(weekday, g.getWidth()/2, g.getHeight()/2);
  }

  render_datum(now){
    g.clear(true);
    g.setColor(colors.blue);
    g.setFont("Vector:32");
    g.setFontAlign(0, 0);
    var datum = now.getDate();
    datum += "-" + require("locale").month(now, 1);
    g.drawString(datum, g.getWidth()/2, g.getHeight()/2);
    datum = now.getFullYear();
    g.drawString(datum, g.getWidth()/2, (g.getHeight()/2)+32);
  }

  render(now){
    switch (this.status) {
      case status.clock:
        this.render_clock(now.getMonth(), now.getDate(), now.getDay(),
                          now.getHours(), now.getMinutes(), now.getSeconds());
        break;
      case status.weekday:
        this.render_weekday(now);
        break;
      case status.datum:
        this.render_datum(now);
        break;
    }
  }

  draw_clock() {
    var now = new Date(); // "October 13, 2014 18:00:00"
    print("tick",now.toUTCString());
    var tickms = now.getTime();
    this.render(now, now.getMonth(), now.getDate(), now.getDay(),
                now.getHours(), now.getMinutes(), now.getSeconds());
    now = new Date(); // "October 13, 2014 18:00:00"
    print("tock",now.toUTCString(), ":",parseInt(now.getTime()-tickms)+"ms");
    Bangle.drawWidgets();
  } // draw_clock()
} // class sdbAroundClock

let myClock = new sdbAroundClock();
myClock.zoomIn();
myClock.zoomIn();

////////////////////////////////////
function onSwipe(dirX, dirY) {
  myClock.swipe(dirX, dirY);
  myClock.draw_clock();
}
////////////////////////////////////
let intervalRef = null;

function clearTimers(){
  if(intervalRef != null) {
    clearInterval(intervalRef);
    intervalRef = null;
  }
}

function shouldRedraw(){
  return Bangle.isLCDOn();
}

function startTimers(){
  clearTimers();
  if (shouldRedraw()) {
    intervalRef = setInterval(() => {
          if (!shouldRedraw()) {
            // console.log("draw clock callback - skipped redraw");
          } else {
            myClock.draw_clock();
          }
        }, myClock.config.tickDelay
    );
    myClock.draw_clock();
  } else {
    //console.log("scheduleDrawClock - skipped not visible");
  }
}

////////////////////////////////////

Bangle.on('lcdPower', (on) => {
  if (on) {
    startTimers();
  } else {
    clearTimers();
  }
});

Bangle.on('swipe', onSwipe);
g.clear();
startTimers();

// Show launcher when button pressed
Bangle.setUI("clock");

Bangle.loadWidgets();
Bangle.drawWidgets();
