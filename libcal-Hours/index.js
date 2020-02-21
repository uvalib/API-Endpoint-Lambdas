exports.handler = (event, context, callback) => {
    var https = require('https');
    var values = require('object.values');

    // take the array of weeks and turn it into a hash of days
    var toDays = function(weeks){
      if(Array.isArray(weeks) && weeks.length>0) {
        var days = {};
        weeks.forEach((w)=>{
          var dayHash = {};
          if (!Object.values) {
            values.shim();
          }
          Object.values(w).forEach(function(day){
            if (day.times.hours && day.rendered)
              dayHash[day.date] = {hours:day.times.hours, rendered: day.rendered};
            else if (day.rendered)
              dayHash[day.date] = {rendered: day.rendered};
          });
          Object.assign(days, dayHash);
        });
        return days;
      } else {
        return null;
      }
    }

    // LibCal API call
    https.get('https://api3.libcal.com/api_hours_grid.php?iid=863&format=json&weeks=52',res=>{
      res.setEncoding("utf8");
      let body = "";
      res.on("data", data => {
        body+=data;
      });
      res.on("end", ()=>{
        var json = JSON.parse(body).locations;
        var hash = {};
//        Object.keys(json).forEach((key)=>{
//          let loc = json[key];
//          hash[loc.lid] = toDays(loc.weeks);
//        })
        json.forEach(function(loc){
          hash[loc.lid] = toDays(loc.weeks);
        });
//        console.log(hash)
        callback(null, hash);
      });
    });

};
