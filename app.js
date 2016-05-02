var express = require('express');
var bodyParser = require('body-parser');
var request = require('request');
var config = require('./config')

var app = express();
app.use(bodyParser.json());


// // just a test
// app.get('/', function (req, res) {
//   res.send('Hello World!');
// });


// // to verify with Facebook
// // You add in your own thing where it says <validation_token>
// // and put that in the developer FB page on the messenger tab
// // under webhooks for the app
// app.get('/webhook', function (req, res) {
//   if (req.query['hub.verify_token'] === '<validation_token>') {
//     res.send(req.query['hub.challenge']);
//   }
//   res.send('Error, wrong validation token');
// })


// privacy policy
app.get('/policy', function (req, res) {
  res.send("I won't share your tire sizes with others");
});


var token = config.page_access_token;

function sendTextMessage(sender, text) {
  messageData = {
    text:text
  }
  request({
    url: 'https://graph.facebook.com/v2.6/me/messages',
    qs: {access_token:token},
    method: 'POST',
    json: {
      recipient: {id:sender},
      message: messageData,
    }
  }, function(error, response, body) {
    if (error) {
      console.log('Error sending message: ', error);
    } else if (response.body.error) {
      console.log('Error: ', response.body.error);
    }
  });
}


function getTire(s) {
  m = s.match(/^(\d{2,3})[\/x]{1}(\d{1,2})[\/\-r]{1}(\d{1,2})$/i)
  if (m) {
    return [s, parseInt(m[1]), parseInt(m[2]), parseInt(m[3])];
  }
}


function getDiameter(tirecode, width, ratio, height) {
  height *= 25.4;
  ratio /= 100;
  return (2* width * ratio) + height;
}


function difference(a, b) {
  var diff = b-a;
  return Math.round(diff/a*10000)/100;
}


var tires = {};

app.post('/webhook', function (req, res) {
  messaging_events = req.body.entry[0].messaging;
  for (i = 0; i < messaging_events.length; i++) {
    event = req.body.entry[0].messaging[i];
    sender = event.sender.id;
    if (event.message && event.message.text) {
      text = event.message.text;
      // Handle a text message from this sender

      if (!tires[sender]) {
        tires[sender] = [];
      }
      
      if (getTire(text)) {
        tires[sender].push(getTire(text));
        
        var numTires = tires[sender].length;

        if (numTires == 1) {
          sendTextMessage(sender, 'Original tire\n' + tires[sender][0][0]);
        }
        
        if (numTires >= 2) {
          sendTextMessage(sender, 'Compared tire\n' + tires[sender][numTires - 1][0]);

          setTimeout(function() {
            sendTextMessage(sender, 'Diameter variance is ' + difference(getDiameter.apply(null, tires[sender][0]), getDiameter.apply(null, tires[sender][numTires - 1])) + '%');
          }, 1000);

          setTimeout(function() {
            sendTextMessage(sender, 'Send another tire to compare to the original or "Clear" to start over');
          }, 2000);

        }

      } else if(text.match(/clear/i)) {
        tires[sender] = [];
        sendTextMessage(sender, 'Send me another tire');
      } else {
        sendTextMessage(sender, 'Please send a proper tire code like 175/55R15');
      }
      
      // // for debugging
      // console.log(tires[sender])
      // sendTextMessage(sender, "Text received, echo: "+ text.substring(0, 200));
    }
  }
  res.sendStatus(200);
});


app.listen(process.env.PORT || 3000, function () {
  console.log('App listening on port ' + process.env.PORT || 3000);
});