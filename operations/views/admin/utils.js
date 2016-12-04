module.exports = {
  /**
   * fetch
   * gets data from endpoint
   * @param  {string}   url      the relative url
   * @param  {Function} callback function(response)
   */
  get: function(url, callback) {
      var xhr = new XMLHttpRequest();
      xhr.open('GET', url, true);
      xhr.onreadystatechange = function() {
          if (xhr.readyState == 4 && xhr.status == 200) {
              callback(JSON.parse(xhr.responseText));
          }
      };
      xhr.send();
  },

  /**
   * post
   * @param  {string}   url      relative url to post to
   * @param  {object}   body     json object
   * @param  {Function} callback funtion(status, response)
   */
  post: function(url, body, callback) {
      var xhr = new XMLHttpRequest();
      xhr.open('POST', url);
      xhr.onreadystatechange = function() {
          if (xhr.readyState == 4) {
              callback(xhr.status, xhr.responseText);
          }
      };
      xhr.setRequestHeader("Content-Type", "application/json;charset=UTF-8");
      xhr.send(JSON.stringify(body));
  }
};
