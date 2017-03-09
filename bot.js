console.log("Alright, lets piktafy!")
var twit = require('twit')
var config = require('./config')
var https = require('https')
var fs = require('fs')
var htmlParser = require('himalaya')

var T = new twit(config)

var stream = T.stream('user')
stream.on('tweet', replyToTweet)
stream.on('follow', followed)

//respond to tweet
function replyToTweet(msg) {
    var json = JSON.stringify(msg, null, 2)
    var media = msg.entities.media
    var replyTo = msg.in_reply_to_screen_name
    var from = msg.user.screen_name
    var img_data
    var response = "Here you go @" + from + ", your piktafied image!"
    var imgs = []

    if (media != null && media[0].type === 'photo' && replyTo === 'piktabot') {
        piktify(msg, response).then(img_data => {
            T.post('media/upload', {
                media_data: img_data.media_data
            }, function(err, data, response) {
                if (err) {
                    console.log(err)
                } else {
                    T.post('statuses/update', {
                            status: img_data.status,
                            media_ids: new Array(data.media_id_string)
                    })
                }
            })
        })
    }
}

//new followers
function followed(msg) {
    var user_name = msg.source.screen_name
    var status = "Hallo @" + user_name + "! Tweet me an image, and I'll piktafy it for you. Use hashtags like #blackandwhite and #color for different styles!"
    tweetDirectMsg(status, user_name)
}

//convert image
function piktify(m, s) {
    return new Promise(function(resolve, reject) {
        buildUrl(m).then(url => {
          console.log(url)
          var request = https.get(url, function(res) {
              var imagedata = ''
              res.setEncoding('base64')

              res.on('data', function(chunk) {
                  imagedata += chunk
              })

              res.on('end', function() {
                  var obj = {
                      status: s,
                      media_data: [imagedata]
                  }
                  resolve(obj)
              })
          })
        })
    });
}

function buildUrl(msg){
  return new Promise(function(resolve, reject){
    var baseUrl = "https://process.filestackapi.com/<ENTER FILESTACK KEY>/"
    var mediaUrl = msg.entities.media[0].media_url_https
    var finalUrl = ""
    // get ascii params
    var aparams = getAsciiParams(msg.entities.hashtags)
    // get urlshot params
    console.log("img url = " + baseUrl + aparams + "/" + mediaUrl)
    https.get(baseUrl + aparams + "/" + mediaUrl, function(response) {
      var str = ''
      var uparams = "urlscreenshot"
      response.setEncoding('utf8')
      response.on('data', function(res){
        str += res
      })
      response.on('end', function(){
        var pS = str.indexOf('<pre')
        var pE = str.indexOf('</pre>')
        var body = str.substring(pS, pE)
        var img = body.split('<br>')
        var w = img[1].length
        if(img[1].includes('span')){
          var w = img[1].split('<span').length
        }
        var h = img.length

        if(w > 1920) {
          h = 1920 * h / w
          w = 1920
        }
        if(h > 1080) {
          w = 1080 * w / h
          h = 1080
        }
        uparams = uparams + "=w:" + Math.round(w) + ",h:" + Math.round(h)
        finalUrl = baseUrl + aparams + "/" + uparams + "/" + mediaUrl
        resolve(finalUrl)
      })
      response.on('error', console.error)
    })
  })
}

function getAsciiParams(hashtags){
  var p = "ascii=c:true,r:true,b:black"
  if(!hashtags) return p

  for(var i = 0; i < hashtags.length; i++){
    switch(hashtags[i].text){
      case 'blackandwhite':
        p = "ascii"
        break;
      case 'color':
        p += "=c:true,r:true,b:black"
        break;
      default:
        p += "=c:true,r:true,b:black"
        break;
    }
  }
  return p;
}

function tweetDirectMsg(str, user_name){
  if(str.length > 140){
    var strs = []
    var s = ''
    for(var i = 0; i < str.length; i++){
      s += str.charAt(i)
      if(s.length === 140){
        strs.push(s)
        s = ''
      }
    }
    for(var i = 0; i < strs.length; i++){
      tweet(strs[i])
    }
  } else {
    tweet(str)
  }
  function tweet(str){
    T.post('direct_messages/new',{screen_name:user_name, text: str}, function (err, data, response){})
  }
}
